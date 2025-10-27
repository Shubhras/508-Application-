const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');
const WCAGComplianceChecker = require('./wcag_compliance_checker');
const logger = require('./logger_utility');
const AIRemediationAgent = require('./ai_remediation_agent');
const ParallelRemediationManager = require('./parallel_remediation_manager');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});
app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Routes

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'WCAG Compliance Checker API is running',
    timestamp: new Date().toISOString(),
    version: require('./package.json').version
  });
});

/**
 * GET /api/wcag-criteria
 * Get WCAG criteria database
 */
app.get('/api/wcag-criteria', [
  query('version').optional().isIn(['2.0', '2.1', '2.2']),
  query('level').optional().isIn(['A', 'AA', 'AAA'])
], handleValidationErrors, (req, res) => {
  try {
    const checker = new WCAGComplianceChecker();
    const criteria = checker.getWCAGCriteria(req.query.version, req.query.level);
    
    res.json({
      success: true,
      data: criteria,
      filters: {
        version: req.query.version || 'all',
        level: req.query.level || 'all'
      }
    });
  } catch (error) {
    logger.error('Error fetching WCAG criteria:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch WCAG criteria',
      message: error.message
    });
  }
});

/**
 * POST /api/check/url
 * Check accessibility compliance for a URL
 */
app.post('/api/check/url', [
  body('url').isURL().withMessage('Valid URL is required'),
  body('wcagVersion').optional().isIn(['2.0', '2.1', '2.2']).withMessage('Invalid WCAG version'),
  body('complianceLevel').optional().isIn(['A', 'AA', 'AAA']).withMessage('Invalid compliance level'),
  body('includeScreenshots').optional().isBoolean(),
  body('waitForNetworkIdle').optional().isBoolean(),
  body('timeout').optional().isInt({ min: 1000, max: 120000 })
], handleValidationErrors, async (req, res) => {
  const checker = new WCAGComplianceChecker();
  
  try {
    const options = {
      wcagVersion: req.body.wcagVersion || '2.1',
      complianceLevel: req.body.complianceLevel || 'AA',
      includeScreenshots: req.body.includeScreenshots || false,
      waitForNetworkIdle: req.body.waitForNetworkIdle || true,
      timeout: req.body.timeout || 30000
    };

    logger.info(`Starting URL check for: ${req.body.url}`);
    const results = await checker.checkURL(req.body.url, options);
    
    res.json({
      success: true,
      data: results,
      originalHtml: results.originalHtml,
      metadata: {
        url: req.body.url,
        checkedAt: new Date().toISOString(),
        options
      }
    });
  } catch (error) {
    logger.error('URL check failed:', error);
    res.status(500).json({
      success: false,
      error: 'URL accessibility check failed',
      message: error.message
    });
  } finally {
    await checker.cleanup();
  }
});

/**
 * POST /api/check/html
 * Check accessibility compliance for HTML content
 */
app.post('/api/check/html', [
  body('html').notEmpty().withMessage('HTML content is required'),
  body('wcagVersion').optional().isIn(['2.0', '2.1', '2.2']),
  body('complianceLevel').optional().isIn(['A', 'AA', 'AAA']),
  // body('baseUrl').optional().isURL()
  body('baseUrl').optional().isURL({ require_tld: false })

], handleValidationErrors, async (req, res) => {
  const checker = new WCAGComplianceChecker();
  
  try {
    const options = {
      wcagVersion: req.body.wcagVersion || '2.1',
      complianceLevel: req.body.complianceLevel || 'AA',
      baseUrl: req.body.baseUrl
    };

    logger.info('Starting HTML content check');
    const results = await checker.checkHTML(req.body.html, options);
    
    res.json({
      success: true,
      data: results,
      originalHtml: req.body.html,
      metadata: {
        contentLength: req.body.html.length,
        checkedAt: new Date().toISOString(),
        options
      }
    });
  } catch (error) {
    logger.error('HTML check failed:', error);
    res.status(500).json({
      success: false,
      error: 'HTML accessibility check failed',
      message: error.message
    });
  } finally {
    await checker.cleanup();
  }
});

/**
 * POST /api/check/batch
 * Check multiple URLs in batch
 */
app.post('/api/check/batch', [
  body('urls').isArray({ min: 1, max: 10 }).withMessage('URLs array is required (max 10)'),
  body('urls.*').isURL().withMessage('All URLs must be valid'),
  body('wcagVersion').optional().isIn(['2.0', '2.1', '2.2']),
  body('complianceLevel').optional().isIn(['A', 'AA', 'AAA']),
  body('concurrent').optional().isInt({ min: 1, max: 3 })
], handleValidationErrors, async (req, res) => {
  const checker = new WCAGComplianceChecker();
  
  try {
    const options = {
      wcagVersion: req.body.wcagVersion || '2.1',
      complianceLevel: req.body.complianceLevel || 'AA',
      concurrent: req.body.concurrent || 2
    };

    logger.info(`Starting batch check for ${req.body.urls.length} URLs`);
    const results = await checker.checkBatch(req.body.urls, options);
    
    res.json({
      success: true,
      data: results,
      metadata: {
        totalUrls: req.body.urls.length,
        checkedAt: new Date().toISOString(),
        options
      }
    });
  } catch (error) {
    logger.error('Batch check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Batch accessibility check failed',
      message: error.message
    });
  } finally {
    await checker.cleanup();
  }
});

/**
 * POST /api/export
 * Export results in various formats
 */
app.post('/api/export', [
  body('results').notEmpty().withMessage('Results data is required'),
  body('format').isIn(['json', 'csv', 'html', 'pdf']).withMessage('Invalid export format'),
  body('includeDetails').optional().isBoolean()
], handleValidationErrors, async (req, res) => {
  try {
    const checker = new WCAGComplianceChecker();
    const exported = await checker.exportResults(req.body.results, {
      format: req.body.format,
      includeDetails: req.body.includeDetails !== false
    });

    const contentTypes = {
      json: 'application/json',
      csv: 'text/csv',
      html: 'text/html',
      pdf: 'application/pdf'
    };

    const extensions = {
      json: 'json',
      csv: 'csv', 
      html: 'html',
      pdf: 'pdf'
    };

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `wcag-report-${timestamp}.${extensions[req.body.format]}`;

    res.setHeader('Content-Type', contentTypes[req.body.format]);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (req.body.format === 'pdf') {
      res.send(exported);
    } else {
      res.send(exported);
    }
  } catch (error) {
    logger.error('Export failed:', error);
    res.status(500).json({
      success: false,
      error: 'Export failed',
      message: error.message
    });
  }
});

/**
 * POST /api/remediate
 * Auto-fix accessibility issues using AI
 */
app.post('/api/remediate', [
  body('issues').isArray({ min: 1 }).withMessage('Issues array is required'),
  body('sourceHtml').notEmpty().withMessage('Source HTML is required'),
  body('llmProvider').optional().isIn(['openai', 'anthropic', 'azure', 'ollama']),
  body('llmModel').optional().isString(),
  body('maxConcurrency').optional().isInt({ min: 1, max: 5 }),
  body('prioritize').optional().isBoolean(),
  body('conflictResolution').optional().isIn(['merge', 'priority', 'confidence', 'manual']),
  body('applyChanges').optional().isBoolean()
], handleValidationErrors, async (req, res) => {
  const manager = new ParallelRemediationManager({
    maxConcurrency: req.body.maxConcurrency || 3,
    llmConfig: {
      provider: req.body.llmProvider || 'openai',
      model: req.body.llmModel || 'gpt-4',
      apiKey: process.env.LLM_API_KEY,
      temperature: 0.1
    }
  });

  try {
    logger.info(`Starting AI remediation for ${req.body.issues.length} issues`);
    
    const results = await manager.processRemediations(
      req.body.issues,
      req.body.sourceHtml,
      {
        prioritize: req.body.prioritize !== false,
        groupByType: true,
        includeValidation: true,
        conflictResolution: req.body.conflictResolution || 'merge',
        progressCallback: (progress) => {
          // Could implement WebSocket for real-time progress
          logger.debug(`Remediation progress: ${progress.percentage}%`);
        }
      }
    );

    // Apply changes if requested
    let modifiedHtml = null;
    if (req.body.applyChanges) {
      const agent = new AIRemediationAgent();
      const application = agent.applyRemediations(req.body.sourceHtml, results.remediations);
      modifiedHtml = application.modifiedHtml;
      
      results.application = {
        appliedCount: application.appliedCount,
        errors: application.errors,
        totalRemediations: application.totalRemediations
      };
    }

    res.json({
      success: true,
      data: {
        ...results,
        modifiedHtml: modifiedHtml,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('AI remediation failed:', error);
    res.status(500).json({
      success: false,
      error: 'AI remediation failed',
      message: error.message
    });
  }
});

/**
 * POST /api/html
 * Fetch HTML content from a URL
*/
app.post('/api/html', [
  body('url').isURL().withMessage('Valid URL is required')
], handleValidationErrors, async (req, res) => {
  try {
    const response = await fetch(req.body.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${req.body.url}`);
    }
    const html = await response.text();
    res.json({
      success: true,
      data: {
        html: html,
        url: req.body.url,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to fetch HTML:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch HTML content',
      message: error.message
    });
  }
});

/**
 * POST /api/remediate/single
 * Fix a single issue type using AI
 */
app.post('/api/remediate/single', [
  body('issueType').notEmpty().withMessage('Issue type is required'),
  body('issues').isArray({ min: 1 }).withMessage('Issues array is required'),
  body('sourceHtml').notEmpty().withMessage('Source HTML is required'),
  body('llmProvider').optional().isIn(['openai', 'anthropic', 'azure', 'ollama']),
  body('llmModel').optional().isString()
], handleValidationErrors, async (req, res) => {
  const agent = new AIRemediationAgent({
    provider: req.body.llmProvider || 'openai',
    model: req.body.llmModel || 'gpt-4o',
    apiKey: process.env.LLM_API_KEY,
    temperature: 0.1
  });

  try {
    logger.info(`Starting single AI remediation for issue type: ${req.body.issueType}`);
    
    const results = await agent.remediateIssues(
      req.body.issues,
      req.body.sourceHtml,
      {
        groupByType: false,
        includeConfidence: true,
        validateChanges: true
      }
    );

    res.json({
      success: true,
      data: {
        issueType: req.body.issueType,
        ...results,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Single AI remediation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Single AI remediation failed',
      message: error.message
    });
  }
});

/**
 * POST /api/remediate/preview
 * Preview AI fixes without applying them
 */
app.post('/api/remediate/preview', [
  body('issues').isArray({ min: 1 }).withMessage('Issues array is required'),
  body('sourceHtml').notEmpty().withMessage('Source HTML is required'),
  body('sampleSize').optional().isInt({ min: 1, max: 5 })
], handleValidationErrors, async (req, res) => {
  try {
    // Take a sample of issues for preview
    const sampleSize = req.body.sampleSize || 3;
    const sampleIssues = req.body.issues.slice(0, sampleSize);
    
    const agent = new AIRemediationAgent({
      provider: process.env.LLM_PROVIDER || 'openai',
      model: process.env.LLM_MODEL || 'gpt-4',
      apiKey: process.env.LLM_API_KEY,
      temperature: 0.1
    });

    logger.info(`Starting AI remediation preview for ${sampleIssues.length} sample issues`);
    
    const results = await agent.remediateIssues(
      sampleIssues,
      req.body.sourceHtml,
      {
        groupByType: true,
        includeConfidence: true,
        validateChanges: false // Skip validation for preview
      }
    );

    // Generate preview of changes
    const preview = results.remediations.map(remediation => ({
      issueType: remediation.type,
      lineNumber: remediation.lineNumber,
      beforeCode: remediation.beforeCode,
      afterCode: remediation.afterCode,
      confidence: remediation.confidence,
      explanation: remediation.explanation,
      wcagCriterion: remediation.wcagCriterion
    }));

    res.json({
      success: true,
      data: {
        preview: preview,
        sampleSize: sampleIssues.length,
        totalIssues: req.body.issues.length,
        estimatedTotalTime: results.statistics?.averageProcessingTime * Math.ceil(req.body.issues.length / sampleSize),
        summary: results.summary,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('AI remediation preview failed:', error);
    res.status(500).json({
      success: false,
      error: 'AI remediation preview failed',
      message: error.message
    });
  }
});

/**
 * POST /api/remediate/apply
 * Apply remediation changes to source HTML
 */
app.post('/api/remediate/apply', [
  body('sourceHtml').notEmpty().withMessage('Source HTML is required'),
  body('remediations').isArray({ min: 1 }).withMessage('Remediations array is required'),
  body('validateResult').optional().isBoolean()
], handleValidationErrors, async (req, res) => {
  try {
    const agent = new AIRemediationAgent();
    
    const application = agent.applyRemediations(
      req.body.sourceHtml,
      req.body.remediations
    );

    let validation = null;
    if (req.body.validateResult !== false) {
      // Basic HTML validation
      try {
        const { JSDOM } = require('jsdom');
        new JSDOM(application.modifiedHtml);
        validation = { valid: true, errors: [] };
      } catch (error) {
        validation = { 
          valid: false, 
          errors: [`HTML validation failed: ${error.message}`] 
        };
      }
    }

    res.json({
      success: true,
      data: {
        modifiedHtml: application.modifiedHtml,
        appliedCount: application.appliedCount,
        errors: application.errors,
        totalRemediations: application.totalRemediations,
        validation: validation,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to apply remediations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply remediations',
      message: error.message
    });
  }
});

/**
 * GET /api/remediate/prompts
 * Get available remediation prompts and instructions
 */
app.get('/api/remediate/prompts', [
  query('criterion').optional().isString(),
  query('category').optional().isIn(['wcag', 'generic', 'all'])
], handleValidationErrors, (req, res) => {
  try {
    const remediationPrompts = require('./src/data/remediation-prompts');
    
    let prompts = remediationPrompts.prompts;
    
    if (req.query.criterion) {
      const criterion = req.query.criterion;
      prompts = prompts[criterion] ? { [criterion]: prompts[criterion] } : {};
    }
    
    if (req.query.category === 'wcag') {
      // Filter only WCAG criteria (format: x.x.x)
      const wcagPrompts = {};
      Object.keys(prompts).forEach(key => {
        if (key.match(/^\d+\.\d+\.\d+$/)) {
          wcagPrompts[key] = prompts[key];
        }
      });
      prompts = wcagPrompts;
    } else if (req.query.category === 'generic') {
      // Filter only generic prompts
      const genericPrompts = {};
      Object.keys(prompts).forEach(key => {
        if (!key.match(/^\d+\.\d+\.\d+$/)) {
          genericPrompts[key] = prompts[key];
        }
      });
      prompts = genericPrompts;
    }

    res.json({
      success: true,
      data: {
        prompts: prompts,
        count: Object.keys(prompts).length,
        criteria: remediationPrompts.getAllCriteria(),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to get remediation prompts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get remediation prompts',
      message: error.message
    });
  }
});

/**
 * POST /api/remediate/validate
 * Validate remediation configuration and test LLM connection
 */
app.post('/api/remediate/validate', [
  body('llmProvider').optional().isIn(['openai', 'anthropic', 'azure', 'ollama']),
  body('llmModel').optional().isString(),
  body('apiKey').optional().isString(),
  body('baseURL').optional().isURL()
], handleValidationErrors, async (req, res) => {
  try {
    const config = {
      provider: req.body.llmProvider || process.env.LLM_PROVIDER || 'openai',
      model: req.body.llmModel || process.env.LLM_MODEL || 'gpt-4',
      apiKey: req.body.apiKey || process.env.LLM_API_KEY,
      timeout: 10000 // Short timeout for validation
    };

    if (!config.apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API key is required',
        message: 'Please provide an API key for the LLM service'
      });
    }

    const agent = new AIRemediationAgent(config);
    
    // Test with a simple prompt
    const testPrompt = `You are a web accessibility expert. Respond with exactly this JSON: {"status": "connected", "provider": "${config.provider}", "model": "${config.model}"}`;
    
    logger.info(`Testing LLM connection: ${config.provider}/${config.model}`);
    
    const response = await agent.callLLMAPI(testPrompt);
    
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response);
    } catch (parseError) {
      throw new Error('LLM response format validation failed');
    }

    res.json({
      success: true,
      data: {
        connection: 'successful',
        provider: config.provider,
        model: config.model,
        response: parsedResponse,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('LLM validation failed:', error);
    res.status(500).json({
      success: false,
      error: 'LLM validation failed',
      message: error.message,
      details: {
        provider: req.body.llmProvider,
        model: req.body.llmModel,
        hasApiKey: !!req.body.apiKey
      }
    });
  }
});

/**
 * GET /api/remediate/status/:jobId
 * Get status of a running remediation job (for future WebSocket implementation)
 */
app.get('/api/remediate/status/:jobId', [
  param('jobId').isString().withMessage('Job ID is required')
], handleValidationErrors, (req, res) => {
  // This would be implemented with a job tracking system
  // For now, return a simple response
  res.json({
    success: true,
    data: {
      jobId: req.params.jobId,
      status: 'completed',
      message: 'Job status tracking not yet implemented',
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * POST /api/check-and-remediate
 * Combined endpoint: check accessibility and auto-fix issues
 */
app.post('/api/check-and-remediate', [
  body('url').optional().isURL(),
  body('html').optional().isString(),
  body('wcagVersion').optional().isIn(['2.0', '2.1', '2.2']),
  body('complianceLevel').optional().isIn(['A', 'AA', 'AAA']),
  body('autoFix').optional().isBoolean(),
  body('llmProvider').optional().isIn(['openai', 'anthropic', 'azure', 'ollama']),
  body('maxConcurrency').optional().isInt({ min: 1, max: 5 })
], handleValidationErrors, async (req, res) => {
  let checker;
  let manager;
  
  try {
    // Validate input
    if (!req.body.url && !req.body.html) {
      return res.status(400).json({
        success: false,
        error: 'Either URL or HTML content is required'
      });
    }

    // Step 1: Run accessibility check
    checker = new WCAGComplianceChecker();
    checker.setConfiguration(
      req.body.wcagVersion || '2.1',
      req.body.complianceLevel || 'AA'
    );

    logger.info('Starting combined check and remediate process');
    
    let checkResults;
    let sourceHtml;

    if (req.body.url) {
      checkResults = await checker.checkURL(req.body.url, {
        wcagVersion: req.body.wcagVersion || '2.1',
        complianceLevel: req.body.complianceLevel || 'AA'
      });
      
      // Get source HTML for the URL
      const urlResponse = await fetch(req.body.url);
      if (!urlResponse.ok) {
        throw new Error(`Failed to fetch URL: ${req.body.url}`);
      }
      sourceHtml = await urlResponse.text();
      checkResults.sourceHtml = sourceHtml; // Include fetched HTML in results
      
    } else {
      checkResults = await checker.checkHTML(req.body.html, {
        wcagVersion: req.body.wcagVersion || '2.1',
        complianceLevel: req.body.complianceLevel || 'AA'
      });
      sourceHtml = req.body.html;
    }

    let remediationResults = null;

    // Step 2: Auto-fix if requested and issues found
    if (req.body.autoFix !== false && checkResults.results && checkResults.results.length > 0) {
      const issuesNeedingFix = checkResults.results.filter(r => 
        r.type === 'error' || r.type === 'warning'
      );

      if (issuesNeedingFix.length > 0) {
        manager = new ParallelRemediationManager({
          maxConcurrency: req.body.maxConcurrency || 2,
          llmConfig: {
            provider: req.body.llmProvider || 'openai',
            apiKey: process.env.LLM_API_KEY
          }
        });

        logger.info(`Auto-fixing ${issuesNeedingFix.length} accessibility issues`);
        
        remediationResults = await manager.processRemediations(
          issuesNeedingFix,
          sourceHtml,
          {
            prioritize: true,
            conflictResolution: 'merge'
          }
        );
      }
    }

    res.json({
      success: true,
      data: {
        originalResults: checkResults,
        remediationResults: remediationResults,
        summary: {
          originalIssues: checkResults.summary?.total || 0,
          errors: checkResults.summary?.errors || 0,
          warnings: checkResults.summary?.warnings || 0,
          fixedIssues: remediationResults?.summary?.successful || 0,
          remainingIssues: Math.max(0, (checkResults.summary?.total || 0) - (remediationResults?.summary?.successful || 0))
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Combined check and remediate failed:', error);
    res.status(500).json({
      success: false,
      error: 'Combined check and remediate failed',
      message: error.message
    });
  } finally {
    if (checker) {
      await checker.cleanup();
    }
  }
});

/**
 * GET /api/docs
 * API Documentation
 */
app.get('/api/docs', (req, res) => {
  const docs = {
    title: 'WCAG Compliance Checker API',
    version: require('./package.json').version,
    description: 'Comprehensive accessibility analysis API for WCAG 2.0, 2.1, and 2.2 compliance',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    endpoints: {
      health: {
        method: 'GET',
        path: '/health',
        description: 'Check API health status'
      },
      wcagCriteria: {
        method: 'GET', 
        path: '/wcag-criteria',
        description: 'Get WCAG criteria database',
        parameters: {
          version: 'WCAG version (2.0, 2.1, 2.2)',
          level: 'Compliance level (A, AA, AAA)'
        }
      },
      checkUrl: {
        method: 'POST',
        path: '/check/url',
        description: 'Check accessibility compliance for a URL',
        body: {
          url: 'URL to check (required)',
          wcagVersion: 'WCAG version (optional, default: 2.1)',
          complianceLevel: 'Compliance level (optional, default: AA)',
          includeScreenshots: 'Include screenshots (optional, default: false)',
          waitForNetworkIdle: 'Wait for network idle (optional, default: true)',
          timeout: 'Timeout in milliseconds (optional, default: 30000)'
        }
      },
      checkHtml: {
        method: 'POST',
        path: '/check/html',
        description: 'Check accessibility compliance for HTML content',
        body: {
          html: 'HTML content to check (required)',
          wcagVersion: 'WCAG version (optional, default: 2.1)',
          complianceLevel: 'Compliance level (optional, default: AA)',
          baseUrl: 'Base URL for relative links (optional)'
        }
      },
      checkBatch: {
        method: 'POST',
        path: '/check/batch',
        description: 'Check multiple URLs in batch',
        body: {
          urls: 'Array of URLs to check (required, max 10)',
          wcagVersion: 'WCAG version (optional, default: 2.1)',
          complianceLevel: 'Compliance level (optional, default: AA)',
          concurrent: 'Number of concurrent checks (optional, max 3)'
        }
      },
      export: {
        method: 'POST',
        path: '/export',
        description: 'Export results in various formats',
        body: {
          results: 'Results data to export (required)',
          format: 'Export format: json, csv, html, pdf (required)',
          includeDetails: 'Include detailed information (optional, default: true)'
        }
      },
      remediate: {
        method: 'POST',
        path: '/remediate',
        description: 'Auto-fix accessibility issues using AI',
        body: {
          issues: 'Array of accessibility issues to fix (required)',
          sourceHtml: 'Source HTML content (required)',
          llmProvider: 'LLM provider (optional): openai, anthropic, azure, ollama',
          llmModel: 'LLM model name (optional)',
          maxConcurrency: 'Max concurrent AI agents (optional, default: 3)',
          prioritize: 'Prioritize issues by severity (optional, default: true)',
          conflictResolution: 'Conflict resolution strategy (optional): merge, priority, confidence, manual',
          applyChanges: 'Apply changes to HTML (optional, default: false)'
        }
      },
      remediateSingle: {
        method: 'POST',
        path: '/remediate/single',
        description: 'Fix a single issue type using AI',
        body: {
          issueType: 'Type of issue to fix (required)',
          issues: 'Array of issues of this type (required)',
          sourceHtml: 'Source HTML content (required)',
          llmProvider: 'LLM provider (optional)',
          llmModel: 'LLM model name (optional)'
        }
      },
      remediatePreview: {
        method: 'POST',
        path: '/remediate/preview',
        description: 'Preview AI fixes without applying them',
        body: {
          issues: 'Array of accessibility issues (required)',
          sourceHtml: 'Source HTML content (required)',
          sampleSize: 'Number of issues to preview (optional, max: 5)'
        }
      },
      remediateApply: {
        method: 'POST',
        path: '/remediate/apply',
        description: 'Apply remediation changes to source HTML',
        body: {
          sourceHtml: 'Source HTML content (required)',
          remediations: 'Array of remediations to apply (required)',
          validateResult: 'Validate resulting HTML (optional, default: true)'
        }
      },
      remediatePrompts: {
        method: 'GET',
        path: '/remediate/prompts',
        description: 'Get available remediation prompts and instructions',
        parameters: {
          criterion: 'Specific WCAG criterion (optional)',
          category: 'Prompt category: wcag, generic, all (optional)'
        }
      },
      remediateValidate: {
        method: 'POST',
        path: '/remediate/validate',
        description: 'Validate remediation configuration and test LLM connection',
        body: {
          llmProvider: 'LLM provider to test (optional)',
          llmModel: 'LLM model to test (optional)',
          apiKey: 'API key to test (optional)',
          baseURL: 'Base URL for API (optional)'
        }
      },
      checkAndRemediate: {
        method: 'POST',
        path: '/check-and-remediate',
        description: 'Combined endpoint: check accessibility and auto-fix issues',
        body: {
          url: 'URL to check (required if html not provided)',
          html: 'HTML content to check (required if url not provided)',
          wcagVersion: 'WCAG version (optional, default: 2.1)',
          complianceLevel: 'Compliance level (optional, default: AA)',
          autoFix: 'Automatically fix issues (optional, default: true)',
          llmProvider: 'LLM provider for fixes (optional)',
          maxConcurrency: 'Max concurrent AI agents (optional)'
        }
      }
    },
    examples: {
      checkUrl: {
        url: `${req.protocol}://${req.get('host')}/api/check/url`,
        method: 'POST',
        body: {
          url: 'https://example.com',
          wcagVersion: '2.1',
          complianceLevel: 'AA'
        }
      }
    }
  };

  res.json(docs);
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Serve static frontend
app.use(express.static('public'));

// Serve frontend application
app.get('/', (req, res) => {
  res.set('Content-Security-Policy', "script-src 'self' 'unsafe-inline';");
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');  
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`WCAG Compliance Checker API running on port ${PORT}`);
  logger.info(`API Documentation available at http://localhost:${PORT}/api/docs`);
});

module.exports = app;