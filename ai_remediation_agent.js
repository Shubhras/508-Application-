const https = require("https");
const axios = require('axios');
const logger = require('./logger_utility');
const CodeAnalyzer = require('./code_analyzer_utility');
const remediationPrompts = require('./remediation_prompts_database');

class TextCompletionService {
  constructor(systemPrompt, model = 'gpt-4o', initial_tokens = 150, temperature = 0.1, maxTokens = 1000) {
      this.systemPrompt = systemPrompt;
      this.model = model;
      this.initial_tokens = initial_tokens;
      this.temperature = temperature;
      this.maxTokens = maxTokens;
  }

  async getResponse(messages, context = [], max_tokens) {
      if (!max_tokens) max_tokens = this.initial_tokens;
      let response_format;
      if (this.systemPrompt.indexOf('JSON Schema') > -1) {
          response_format = { type: 'json_object' };
      }

      //TODO: replace with your settings
      let baseUrl = 'https://api.openai.com/v1';
      let apiKey = process.env.LLM_API_KEY

      const agent = new https.Agent({ keepAlive: false, rejectUnauthorized: true });

      try {
          const response = await fetch(`${baseUrl}/chat/completions`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`,
                  // 'OpenAI-Organization': 'org-...'
              },
              agent,
              body: JSON.stringify({
                  max_tokens: Math.min(this.maxTokens, max_tokens),
                  temperature: this.temperature,
                  model: this.model,
                  messages: [
                      { role: 'system', content: this.systemPrompt },
                      ...(context || []).map(data => ({ role: 'user', content: `More Info: ${data}` })),
                      ...messages,
                  ],
                  response_format,
              })
          });

          const data = await response.json();

          if (data.error) {
              console.error("API Error:", data.error);
              throw new Error(`API Error: ${data.error.message}`);
          }

          if (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
              const content = data.choices[0].message.content.trim();
              if (data.choices[0].finish_reason === "length") {
                  const prev_tokens = max_tokens;
                  max_tokens = Math.min(this.maxTokens, max_tokens * 2);
                  if (max_tokens === prev_tokens && max_tokens === this.maxTokens) {
                      return content;
                  }
                  const more = await this.getResponse(messages, [
                      ...(context || []),
                      `Incomplete Response (continue from here): ${content}`
                  ], max_tokens);
                  return more;
              } else {
                  return content;
              }
          } else {
              console.error("Unexpected API Response:", data);
              throw new Error("Unexpected API response format");
          }
      } catch (error) {
          console.error("Fetch Error:", error);
          throw new Error(`Fetch error: ${error.message}`);
      }
  }
}

class AIRemediationAgent {
  constructor(config = {}) {
    this.config = {
      provider: config.provider || 'openai', // openai, anthropic, azure, ollama
      apiKey: config.apiKey || process.env.LLM_API_KEY,
      // orgId: config.orgId || process.env.LLM_API_ORG,
      model: 'gpt-4o',
      baseURL: config.baseURL || 'https://api.openai.com/v1',
      maxTokens: config.maxTokens || 4000,
      temperature: config.temperature || 0.1,
      timeout: config.timeout || 60000,
      retries: config.retries || 1,
      concurrency: config.concurrency || 3
    };
    
    this.codeAnalyzer = new CodeAnalyzer();
    this.activeRequests = new Map();
    this.rateLimiter = this.createRateLimiter();
  }

  createRateLimiter() {
    const requests = new Map();
    const windowMs = 60000; // 1 minute
    const maxRequests = 60; // Adjust based on your API limits

    return {
      canMakeRequest: () => {
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Clean old requests
        for (const [timestamp, count] of requests.entries()) {
          if (timestamp < windowStart) {
            requests.delete(timestamp);
          }
        }
        
        // Count current requests
        const currentRequests = Array.from(requests.values()).reduce((sum, count) => sum + count, 0);
        
        if (currentRequests >= maxRequests) {
          return false;
        }
        
        // Add current request
        const currentMinute = Math.floor(now / windowMs) * windowMs;
        requests.set(currentMinute, (requests.get(currentMinute) || 0) + 1);
        
        return true;
      }
    };
  }

  async remediateIssues(issues, sourceHtml, options = {}) {
    const {
      groupByType = true,
      maxConcurrency = this.config.concurrency,
      includeConfidence = true,
      validateChanges = true
    } = options;

    logger.info(`Starting AI remediation for ${issues.length} issues`);

    try {
      // Parse source HTML for analysis
      const htmlStructure = this.codeAnalyzer.parseHTML(sourceHtml);
      
      // Group issues by type for efficient processing
      const groupedIssues = groupByType ? this.groupIssuesByType(issues) : { all: issues };
      
      // Process issues in parallel batches
      const remediationResults = [];
      const issueTypes = Object.keys(groupedIssues);
      
      for (let i = 0; i < issueTypes.length; i += maxConcurrency) {
        const batch = issueTypes.slice(i, i + maxConcurrency);
        const batchPromises = batch.map(async (type) => {
          const typeIssues = groupedIssues[type];
          return await this.processIssueType(type, typeIssues, htmlStructure, sourceHtml);
        });
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          const type = batch[index];

          
          console.log(`Processing results for issue type: ${type}`, result);


          if (result.status === 'fulfilled') {
            remediationResults.push(...result.value);
          } else {
            logger.error(`Failed to process issue type ${type}:`, result.reason);
            // Add failed items with error status
            groupedIssues[type].forEach(issue => {
              remediationResults.push({
                issueId: issue.criterion || `${type}-${Date.now()}`,
                type: type,
                status: 'failed',
                error: result.reason.message,
                originalIssue: issue
              });
            });
          }
        });
      }

      // Validate and merge changes if requested
      if (validateChanges) {
        await this.validateRemediations(remediationResults, sourceHtml);
      }

      logger.info(`AI remediation completed. ${remediationResults.length} results generated`);
      
      return {
        success: true,
        totalIssues: issues.length,
        processedIssues: remediationResults.length,
        remediations: remediationResults,
        summary: this.generateSummary(remediationResults),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('AI remediation failed:', error);
      throw new Error(`Remediation failed: ${error.message}`);
    }
  }

  groupIssuesByType(issues) {
    const grouped = {};
    
    issues.forEach(issue => {
      const key = this.getIssueTypeKey(issue);
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(issue);
    });
    
    return grouped;
  }

  getIssueTypeKey(issue) {
    // Group by WCAG criterion for more targeted fixes
    if (issue.criterion) {
      return issue.criterion;
    }
    
    // Fallback to issue type
    if (issue.type) {
      return issue.type;
    }
    
    // Fallback to title-based grouping
    const title = issue.title || 'unknown';
    return title.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  async processIssueType(type, issues, htmlStructure, sourceHtml) {
    const maxRetries = this.config.retries;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Rate limiting
        if (!this.rateLimiter.canMakeRequest()) {
          console.warn(`Rate limit exceeded, waiting before retrying issue type: ${type}`);
          await this.sleep(1000); // Wait 1 second
          continue;
        }

        logger.info(`Processing issue type: ${type} (${issues.length} issues) - Attempt ${attempt}`);
        
        // Get specific remediation prompt for this issue type
        const prompt = this.buildRemediationPrompt(type, issues, htmlStructure, sourceHtml);
        
        // Call LLM API
        const response = await this.callLLMAPI(prompt);
        
        // Parse and validate response
        const remediations = this.parseRemediationResponse(response, issues, type);
        
        return remediations;

      } catch (error) {
        lastError = error;
        logger.warn(`Attempt ${attempt} failed for issue type ${type}:`, error.message);
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`Failed to process issue type ${type} after ${maxRetries} attempts: ${lastError.message}`);
  }

  buildRemediationPrompt(type, issues, htmlStructure, sourceHtml) {
    // Get specific remediation instructions for this issue type
    const remediationInstructions = remediationPrompts.getInstructions(type);
    
    if (!remediationInstructions) {
      throw new Error(`No remediation instructions found for issue type: ${type}`);
    }

    // Build context about the issues
    const issueContext = issues.map(issue => ({
      title: issue.title,
      description: issue.description,
      element: issue.element?.selector || 'unknown',
      suggestion: issue.suggestion
    }));

    // Extract relevant HTML sections
    const relevantHtml = this.extractRelevantHtmlSections(issues, sourceHtml);

    const prompt = `You are an expert web accessibility developer. Your task is to fix WCAG compliance issues in HTML code.

## Issue Type: ${type}
## Number of Issues: ${issues.length}

## Remediation Instructions:
${remediationInstructions.prompt}

## Specific Issues to Fix:
${JSON.stringify(issueContext, null, 2)}

## HTML Code to Modify:
\`\`\`html
${relevantHtml}
\`\`\`

## Requirements:
1. Return ONLY a valid JSON array of changes
2. Each change must include: lineNumber, beforeCode, afterCode, confidence, explanation
3. Line numbers are 1-based (first line = 1)
4. beforeCode must exactly match the existing line
5. afterCode must be the complete corrected line
6. confidence should be 0.0 to 1.0
7. explanation should be concise but clear

## Example Response Format:
[
  {
    "lineNumber": 15,
    "beforeCode": "    <img src=\"photo.jpg\">",
    "afterCode": "    <img src=\"photo.jpg\" alt=\"Person smiling in a garden\">",
    "confidence": 0.95,
    "explanation": "Added descriptive alt text for accessibility",
    "wcagCriterion": "1.1.1"
  }
]

## Additional Guidelines:
- ${remediationInstructions.guidelines.join('\n- ')}
- Maintain original code formatting and indentation
- Only modify lines that need changes
- Ensure changes don't break existing functionality
- Follow semantic HTML best practices

Return only the JSON array, no other text or explanation.`;

    return prompt;
  }

  extractRelevantHtmlSections(issues, sourceHtml) {
    const lines = sourceHtml.split('\n');
    const relevantLines = new Set();
    const contextRadius = 5; // Lines before/after to include for context

    // Extract lines based on element selectors when available
    issues.forEach(issue => {
      if (issue.element?.selector) {
        const matchingLines = this.findElementLines(issue.element.selector, lines);
        matchingLines.forEach(lineNum => {
          // Add the line and surrounding context
          for (let i = Math.max(0, lineNum - contextRadius); 
               i <= Math.min(lines.length - 1, lineNum + contextRadius); 
               i++) {
            relevantLines.add(i);
          }
        });
      }
    });

    // If no specific elements found, return a reasonable subset
    if (relevantLines.size === 0) {
      // Return head section and first part of body for general issues
      for (let i = 0; i < Math.min(100, lines.length); i++) {
        relevantLines.add(i);
      }
    }

    // Convert to sorted array and reconstruct HTML
    const sortedLines = Array.from(relevantLines).sort((a, b) => a - b);
    let result = '';
    let lastLine = -1;

    sortedLines.forEach(lineNum => {
      if (lineNum > lastLine + 1) {
        result += '\n... (content omitted for brevity) ...\n';
      }
      result += `${lineNum + 1}: ${lines[lineNum]}\n`;
      lastLine = lineNum;
    });

    // Limit total size to prevent token overflow
    const maxLength = 8000;
    if (result.length > maxLength) {
      result = result.substring(0, maxLength) + '\n... (truncated)';
    }

    return result;
  }

  findElementLines(selector, lines) {
    const matchingLines = [];
    
    // Simple selector matching - can be enhanced for complex selectors
    const patterns = this.selectorToPatterns(selector);
    
    lines.forEach((line, index) => {
      if (patterns.some(pattern => pattern.test(line))) {
        matchingLines.push(index);
      }
    });
    
    return matchingLines;
  }

  selectorToPatterns(selector) {
    const patterns = [];
    
    // ID selector
    if (selector.includes('#')) {
      const id = selector.split('#')[1].split(/[.\[\s]/)[0];
      patterns.push(new RegExp(`id=["']${id}["']`, 'i'));
    }
    
    // Class selector
    if (selector.includes('.')) {
      const className = selector.split('.')[1].split(/[#\[\s]/)[0];
      patterns.push(new RegExp(`class=["'][^"']*\\b${className}\\b[^"']*["']`, 'i'));
    }
    
    // Tag selector
    const tagMatch = selector.match(/^([a-zA-Z]+)/);
    if (tagMatch) {
      const tag = tagMatch[1];
      patterns.push(new RegExp(`<${tag}\\b`, 'i'));
    }
    
    // Attribute selectors
    const attrMatches = selector.match(/\[([^=\]]+)(?:=["']([^"']+)["'])?\]/g);
    if (attrMatches) {
      attrMatches.forEach(match => {
        const [, attr, value] = match.match(/\[([^=\]]+)(?:=["']([^"']+)["'])?\]/);
        if (value) {
          patterns.push(new RegExp(`${attr}=["']${value}["']`, 'i'));
        } else {
          patterns.push(new RegExp(`\\b${attr}\\b`, 'i'));
        }
      });
    }
    
    return patterns;
  }

  async callLLMAPI(prompt) {
    const startTime = Date.now();
    
    try {
      let response;
      
      switch (this.config.provider) {
        case 'openai':
          const textCompletionService = new TextCompletionService('You are an expert web accessibility developer who fixes WCAG compliance issues. Always respond with valid JSON arrays only.', this.config.model, 150, this.config.temperature, this.config.maxTokens);
          response = await textCompletionService.getResponse([{ role: 'user', content: prompt }]);
          //response = await this.callOpenAI(prompt);
          break;
        case 'anthropic':
          response = await this.callAnthropic(prompt);
          break;
        case 'azure':
          response = await this.callAzureOpenAI(prompt);
          break;
        case 'ollama':
          response = await this.callOllama(prompt);
          break;
        default:
          throw new Error(`Unsupported LLM provider: ${this.config.provider}`);
      }
      
      const duration = Date.now() - startTime;
      logger.info(`LLM API call completed in ${duration}ms`);
      
      return response;

    } catch (error) {
      console.error('LLM API call failed:', error);
      const duration = Date.now() - startTime;
      logger.error(`LLM API call failed after ${duration}ms:`, error.message);
      throw error;
    }
  }

  async callOpenAI(prompt) {
    const response = await axios.post(
      `${this.config.baseURL}/chat/completions`,
      {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert web accessibility developer who fixes WCAG compliance issues. Always respond with valid JSON arrays only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          // 'OpenAI-Organization': this.config.orgId,
          'Content-Type': 'application/json'
        },
        timeout: this.config.timeout
      }
    );

    console.log('OpenAI response:', response.data);

    return response.data.choices[0].message.content;
  }

  async callAnthropic(prompt) {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: this.config.model || 'claude-3-sonnet-20240229',
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      {
        headers: {
          'x-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        timeout: this.config.timeout
      }
    );

    return response.data.content[0].text;
  }

  async callAzureOpenAI(prompt) {
    const response = await axios.post(
      `${this.config.baseURL}/openai/deployments/${this.config.deployment}/chat/completions?api-version=2024-02-15-preview`,
      {
        messages: [
          {
            role: 'system',
            content: 'You are an expert web accessibility developer who fixes WCAG compliance issues. Always respond with valid JSON arrays only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      },
      {
        headers: {
          'api-key': this.config.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: this.config.timeout
      }
    );

    return response.data.choices[0].message.content;
  }

  async callOllama(prompt) {
    const response = await axios.post(
      `${this.config.baseURL || 'http://localhost:11434'}/api/chat`,
      {
        model: this.config.model || 'llama2',
        messages: [
          {
            role: 'system',
            content: 'You are an expert web accessibility developer who fixes WCAG compliance issues. Always respond with valid JSON arrays only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: false,
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens
        }
      },
      {
        timeout: this.config.timeout
      }
    );

    return response.data.message.content;
  }

  parseRemediationResponse(response, originalIssues, issueType) {
    try {

      console.log('Raw LLM response:', response);

      // Clean response to ensure it's valid JSON
      let cleanResponse = response.trim();
      
      // Remove any markdown code blocks
      cleanResponse = cleanResponse.replace(/```json\s*|\s*```/g, '');
      
      // Remove any leading/trailing text that isn't JSON
      const jsonStart = cleanResponse.indexOf('[');
      const jsonEnd = cleanResponse.lastIndexOf(']');
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
      }

      const changes = JSON.parse(cleanResponse);
      
      if (!Array.isArray(changes)) {
        throw new Error('Response must be an array');
      }

      // Validate and enhance each change
      const validatedChanges = changes.map((change, index) => {
        const validation = this.validateChange(change);
        if (!validation.isValid) {
          throw new Error(`Invalid change at index ${index}: ${validation.error}`);
        }

        return {
          issueId: `${issueType}-${index}`,
          type: issueType,
          status: 'success',
          lineNumber: change.lineNumber,
          beforeCode: change.beforeCode,
          afterCode: change.afterCode,
          confidence: change.confidence || 0.8,
          explanation: change.explanation || 'Accessibility improvement',
          wcagCriterion: change.wcagCriterion || issueType,
          originalIssues: originalIssues,
          timestamp: new Date().toISOString()
        };
      });

      return validatedChanges;

    } catch (error) {
      logger.error('Failed to parse LLM response:', error.message);
      logger.debug('Raw response:', response);
      
      // Return failed status for all issues
      return originalIssues.map((issue, index) => ({
        issueId: `${issueType}-${index}`,
        type: issueType,
        status: 'failed',
        error: `Parse error: ${error.message}`,
        originalIssue: issue
      }));
    }
  }

  validateChange(change) {
    const required = ['lineNumber', 'beforeCode', 'afterCode'];
    
    for (const field of required) {
      if (!(field in change)) {
        return { isValid: false, error: `Missing required field: ${field}` };
      }
    }

    if (!Number.isInteger(change.lineNumber) || change.lineNumber < 1) {
      return { isValid: false, error: 'lineNumber must be a positive integer' };
    }

    if (typeof change.beforeCode !== 'string' || typeof change.afterCode !== 'string') {
      return { isValid: false, error: 'beforeCode and afterCode must be strings' };
    }

    if (change.confidence !== undefined) {
      if (typeof change.confidence !== 'number' || change.confidence < 0 || change.confidence > 1) {
        return { isValid: false, error: 'confidence must be a number between 0 and 1' };
      }
    }

    return { isValid: true };
  }

  async validateRemediations(remediations, sourceHtml) {
    // Validate that line numbers exist and beforeCode matches
    const lines = sourceHtml.split('\n');
    
    remediations.forEach(remediation => {
      if (remediation.status !== 'success') return;
      
      const lineIndex = remediation.lineNumber - 1;
      
      if (lineIndex < 0 || lineIndex >= lines.length) {
        remediation.status = 'failed';
        remediation.error = `Line number ${remediation.lineNumber} is out of range`;
        return;
      }
      
      const actualLine = lines[lineIndex];
      if (actualLine.trim() !== remediation.beforeCode.trim()) {
        remediation.status = 'warning';
        remediation.warning = 'beforeCode does not exactly match source line';
        remediation.actualLine = actualLine;
      }
    });
  }

  generateSummary(remediations) {
    const summary = {
      total: remediations.length,
      successful: 0,
      failed: 0,
      warnings: 0,
      byType: {},
      averageConfidence: 0
    };

    let totalConfidence = 0;
    let confidenceCount = 0;

    remediations.forEach(remediation => {
      switch (remediation.status) {
        case 'success':
          summary.successful++;
          break;
        case 'failed':
          summary.failed++;
          break;
        case 'warning':
          summary.warnings++;
          break;
      }

      if (!summary.byType[remediation.type]) {
        summary.byType[remediation.type] = { total: 0, successful: 0, failed: 0 };
      }
      summary.byType[remediation.type].total++;
      summary.byType[remediation.type][remediation.status]++;

      if (remediation.confidence !== undefined) {
        totalConfidence += remediation.confidence;
        confidenceCount++;
      }
    });

    if (confidenceCount > 0) {
      summary.averageConfidence = Math.round((totalConfidence / confidenceCount) * 100) / 100;
    }

    return summary;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public method to apply remediations to source code
  applyRemediations(sourceHtml, remediations) {
    const lines = sourceHtml.split('\n');
    
    // Sort by line number in descending order to avoid offset issues
    const sortedRemediations = remediations
      .filter(r => r.status === 'success')
      .sort((a, b) => b.lineNumber - a.lineNumber);

    let appliedCount = 0;
    const errors = [];

    sortedRemediations.forEach(remediation => {
      const lineIndex = remediation.lineNumber - 1;
      
      if (lineIndex >= 0 && lineIndex < lines.length) {
        lines[lineIndex] = remediation.afterCode;
        appliedCount++;
      } else {
        errors.push(`Invalid line number: ${remediation.lineNumber}`);
      }
    });

    return {
      modifiedHtml: lines.join('\n'),
      appliedCount,
      errors,
      totalRemediations: sortedRemediations.length
    };
  }
}

module.exports = AIRemediationAgent;
