const EventEmitter = require('events');
const AIRemediationAgent = require('./ai_remediation_agent');
const logger = require('./logger_utility');

class ParallelRemediationManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      maxConcurrency: config.maxConcurrency || 3,
      timeout: config.timeout || 60000,
      retryAttempts: config.retryAttempts || 2,
      batchSize: config.batchSize || 5,
      priorityLevels: config.priorityLevels || ['error', 'warning', 'info'],
      llmConfig: config.llmConfig || {}
    };
    
    this.activeJobs = new Map();
    this.jobQueue = [];
    this.agents = [];
    this.statistics = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      averageProcessingTime: 0,
      startTime: null,
      endTime: null
    };
    
    this.initializeAgents();
  }

  initializeAgents() {
    for (let i = 0; i < this.config.maxConcurrency; i++) {
      const agent = new AIRemediationAgent({
        ...this.config.llmConfig,
        agentId: `agent-${i}`
      });
      this.agents.push(agent);
    }
    
    logger.info(`Initialized ${this.agents.length} AI remediation agents`);
  }

  async processRemediations(issues, sourceHtml, options = {}) {
    const {
      prioritize = true,
      groupByType = true,
      includeValidation = true,
      progressCallback = null,
      conflictResolution = 'merge' // 'merge', 'priority', 'manual'
    } = options;

    this.statistics.startTime = Date.now();
    this.statistics.totalJobs = 0;
    this.statistics.completedJobs = 0;
    this.statistics.failedJobs = 0;

    try {
      logger.info(`Starting parallel remediation for ${issues.length} issues`);

      // Group and prioritize issues
      const processedIssues = this.prepareIssues(issues, { prioritize, groupByType });
      
      // Create jobs for parallel processing
      const jobs = this.createJobs(processedIssues, sourceHtml);
      this.statistics.totalJobs = jobs.length;

      // Execute jobs in parallel with concurrency control
      const results = await this.executeJobs(jobs, progressCallback);

      // Resolve conflicts between remediations
      const resolvedResults = await this.resolveConflicts(results, sourceHtml, conflictResolution);

      // Validate final results if requested
      if (includeValidation) {
        await this.validateResults(resolvedResults, sourceHtml);
      }

      this.statistics.endTime = Date.now();
      const totalTime = this.statistics.endTime - this.statistics.startTime;
      this.statistics.averageProcessingTime = totalTime / this.statistics.totalJobs;

      logger.info(`Parallel remediation completed in ${totalTime}ms`);

      return {
        success: true,
        summary: this.generateSummary(resolvedResults),
        remediations: resolvedResults,
        conflicts: this.detectConflicts(results),
        statistics: { ...this.statistics },
        metadata: {
          originalIssueCount: issues.length,
          processedJobCount: jobs.length,
          totalProcessingTime: totalTime,
          averageTimePerJob: this.statistics.averageProcessingTime
        }
      };

    } catch (error) {
      logger.error('Parallel remediation failed:', error);
      this.statistics.endTime = Date.now();
      
      throw new Error(`Parallel remediation failed: ${error.message}`);
    }
  }

  prepareIssues(issues, options) {
    let processedIssues = [...issues];

    // Add metadata and normalize structure
    processedIssues = processedIssues.map((issue, index) => ({
      ...issue,
      originalIndex: index,
      priority: this.calculatePriority(issue),
      estimatedComplexity: this.estimateComplexity(issue),
      dependencies: this.findDependencies(issue, issues)
    }));

    // Group by type if requested
    if (options.groupByType) {
      const grouped = this.groupIssuesByType(processedIssues);
      processedIssues = Object.entries(grouped).map(([type, typeIssues]) => ({
        type,
        issues: typeIssues,
        priority: Math.max(...typeIssues.map(i => i.priority)),
        estimatedComplexity: typeIssues.reduce((sum, i) => sum + i.estimatedComplexity, 0)
      }));
    }

    // Sort by priority if requested
    if (options.prioritize) {
      processedIssues.sort((a, b) => {
        // Higher priority first
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        // Lower complexity first for same priority
        return a.estimatedComplexity - b.estimatedComplexity;
      });
    }

    return processedIssues;
  }

  calculatePriority(issue) {
    const priorityMap = {
      error: 3,
      warning: 2,
      info: 1,
      success: 0
    };

    let priority = priorityMap[issue.type] || 1;

    // Boost priority for critical WCAG criteria
    const criticalCriteria = ['1.1.1', '1.3.1', '2.1.1', '2.4.2', '3.3.2', '4.1.2'];
    if (criticalCriteria.includes(issue.criterion)) {
      priority += 1;
    }

    // Boost priority for issues affecting many elements
    if (issue.affectedElements && issue.affectedElements > 5) {
      priority += 1;
    }

    return Math.min(priority, 5); // Cap at 5
  }

  estimateComplexity(issue) {
    let complexity = 1;

    // Base complexity on issue type
    const complexityMap = {
      '1.1.1': 2, // Alt text - medium
      '1.3.1': 4, // Structure - high
      '1.4.3': 3, // Color contrast - medium-high
      '2.1.1': 4, // Keyboard - high
      '2.4.4': 2, // Link text - medium
      '3.3.2': 3, // Labels - medium-high
      '4.1.2': 5  // ARIA - very high
    };

    complexity = complexityMap[issue.criterion] || 2;

    // Adjust based on description complexity
    if (issue.description && issue.description.length > 200) {
      complexity += 1;
    }

    // Adjust based on suggested solution complexity
    if (issue.suggestion && issue.suggestion.includes('ARIA')) {
      complexity += 2;
    }

    return Math.min(complexity, 5); // Cap at 5
  }

  findDependencies(issue, allIssues) {
    const dependencies = [];

    // Find issues that should be resolved before this one
    allIssues.forEach(otherIssue => {
      if (otherIssue === issue) return;

      // Structure issues should be resolved before styling issues
      if (issue.criterion?.startsWith('1.4') && otherIssue.criterion?.startsWith('1.3')) {
        dependencies.push(otherIssue.criterion);
      }

      // Language should be set before other accessibility features
      if (issue.criterion !== '3.1.1' && otherIssue.criterion === '3.1.1') {
        dependencies.push(otherIssue.criterion);
      }

      // Form structure before form validation
      if (issue.criterion?.startsWith('3.3') && otherIssue.criterion === '3.3.2') {
        dependencies.push(otherIssue.criterion);
      }
    });

    return dependencies;
  }

  groupIssuesByType(issues) {
    const grouped = {};

    issues.forEach(issue => {
      const key = issue.criterion || issue.type || 'unknown';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(issue);
    });

    return grouped;
  }

  createJobs(processedIssues, sourceHtml) {
    const jobs = [];

    processedIssues.forEach((issueGroup, index) => {
      const job = {
        id: `job-${index}`,
        type: issueGroup.type || issueGroup.criterion || 'unknown',
        issues: issueGroup.issues || [issueGroup],
        priority: issueGroup.priority || 1,
        estimatedComplexity: issueGroup.estimatedComplexity || 1,
        dependencies: issueGroup.dependencies || [],
        sourceHtml: sourceHtml,
        status: 'pending',
        attempts: 0,
        maxAttempts: this.config.retryAttempts + 1,
        createdAt: Date.now()
      };

      jobs.push(job);
    });

    return jobs;
  }

  async executeJobs(jobs, progressCallback) {
    const results = [];
    const processing = new Map();
    let completedCount = 0;

    // Create job queue with dependency resolution
    const jobQueue = this.resolveDependencies(jobs);
    
    this.emit('processing-started', { totalJobs: jobs.length });

    while (jobQueue.length > 0 || processing.size > 0) {
      // Start new jobs up to concurrency limit
      while (processing.size < this.config.maxConcurrency && jobQueue.length > 0) {
        const job = jobQueue.shift();
        
        // Check if dependencies are met
        if (this.dependenciesMet(job, results)) {
          const promise = this.executeJob(job);
          processing.set(job.id, promise);
          
          logger.debug(`Started job ${job.id} (${job.type})`);
          this.emit('job-started', job);
        } else {
          // Put job back in queue if dependencies not met
          jobQueue.push(job);
          
          // Avoid infinite loop by adding delay
          await this.sleep(100);
        }
      }

      // Wait for at least one job to complete
      if (processing.size > 0) {
        const completed = await Promise.race(
          Array.from(processing.entries()).map(async ([jobId, promise]) => {
            try {
              const result = await promise;
              return { jobId, result, error: null };
            } catch (error) {
              return { jobId, result: null, error };
            }
          })
        );

        // Remove completed job from processing
        processing.delete(completed.jobId);
        completedCount++;

        // Handle result
        if (completed.error) {
          logger.error(`Job ${completed.jobId} failed:`, completed.error);
          this.statistics.failedJobs++;
          
          // Find the job and retry if attempts remaining
          const job = jobs.find(j => j.id === completed.jobId);
          if (job && job.attempts < job.maxAttempts) {
            job.attempts++;
            job.status = 'retrying';
            jobQueue.unshift(job); // Retry soon
            logger.info(`Retrying job ${job.id} (attempt ${job.attempts}/${job.maxAttempts})`);
          } else {
            results.push({
              jobId: completed.jobId,
              status: 'failed',
              error: completed.error.message,
              remediations: []
            });
          }
        } else {
          logger.debug(`Job ${completed.jobId} completed successfully`);
          this.statistics.completedJobs++;
          results.push(completed.result);
        }

        // Report progress
        const progress = {
          completed: completedCount,
          total: jobs.length,
          percentage: Math.round((completedCount / jobs.length) * 100),
          processing: processing.size,
          queued: jobQueue.length
        };

        this.emit('progress', progress);
        if (progressCallback) {
          progressCallback(progress);
        }
      }
    }

    this.emit('processing-completed', { results: results.length });
    return results;
  }

  resolveDependencies(jobs) {
    // Topological sort to resolve dependencies
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (job) => {
      if (visiting.has(job.id)) {
        logger.warn(`Circular dependency detected for job ${job.id}`);
        return;
      }
      
      if (visited.has(job.id)) {
        return;
      }

      visiting.add(job.id);

      // Visit dependencies first
      job.dependencies.forEach(depType => {
        const depJob = jobs.find(j => j.type === depType);
        if (depJob) {
          visit(depJob);
        }
      });

      visiting.delete(job.id);
      visited.add(job.id);
      sorted.push(job);
    };

    jobs.forEach(job => {
      if (!visited.has(job.id)) {
        visit(job);
      }
    });

    return sorted;
  }

  dependenciesMet(job, completedResults) {
    if (!job.dependencies || job.dependencies.length === 0) {
      return true;
    }

    return job.dependencies.every(depType => {
      return completedResults.some(result => 
        result.status === 'success' && 
        result.type === depType
      );
    });
  }

  async executeJob(job) {
    const startTime = Date.now();
    job.status = 'processing';
    job.startTime = startTime;

    try {
      // Get available agent
      const agent = this.getAvailableAgent();
      
      // Process the job
      const result = await Promise.race([
        agent.remediateIssues(job.issues, job.sourceHtml, {
          groupByType: false, // Already grouped
          includeConfidence: true,
          validateChanges: false // Will validate later
        }),
        this.createTimeoutPromise(this.config.timeout)
      ]);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      return {
        jobId: job.id,
        type: job.type,
        status: 'success',
        remediations: result.remediations || [],
        summary: result.summary,
        processingTime,
        agentId: agent.config.agentId || 'unknown',
        completedAt: endTime
      };

    } catch (error) {
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      throw new Error(`Job execution failed after ${processingTime}ms: ${error.message}`);
    }
  }

  getAvailableAgent() {
    // Simple round-robin for now
    // Could be enhanced with load balancing
    const agent = this.agents[Math.floor(Math.random() * this.agents.length)];
    return agent;
  }

  createTimeoutPromise(timeout) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Job timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  async resolveConflicts(results, sourceHtml, strategy) {
    const lines = sourceHtml.split('\n');
    const allRemediations = [];
    const conflicts = [];

    // Collect all remediations
    results.forEach(result => {
      if (result.status === 'success' && result.remediations) {
        allRemediations.push(...result.remediations.map(r => ({
          ...r,
          jobId: result.jobId,
          jobType: result.type
        })));
      }
    });

    // Group by line number to detect conflicts
    const lineGroups = new Map();
    allRemediations.forEach(remediation => {
      if (remediation.status === 'success') {
        const lineNum = remediation.lineNumber;
        if (!lineGroups.has(lineNum)) {
          lineGroups.set(lineNum, []);
        }
        lineGroups.get(lineNum).push(remediation);
      }
    });

    // Resolve conflicts
    const resolvedRemediations = [];
    
    for (const [lineNum, lineRemediations] of lineGroups.entries()) {
      if (lineRemediations.length === 1) {
        // No conflict
        resolvedRemediations.push(lineRemediations[0]);
      } else {
        // Conflict detected
        conflicts.push({
          lineNumber: lineNum,
          conflictingRemediations: lineRemediations,
          originalLine: lines[lineNum - 1]
        });

        // Apply resolution strategy
        const resolved = await this.applyConflictResolution(
          lineRemediations, 
          strategy, 
          lines[lineNum - 1]
        );
        
        if (resolved) {
          resolvedRemediations.push(resolved);
        }
      }
    }

    // Add non-conflicting remediations
    allRemediations.forEach(remediation => {
      if (remediation.status !== 'success') {
        resolvedRemediations.push(remediation);
      }
    });

    return resolvedRemediations;
  }

  async applyConflictResolution(conflictingRemediations, strategy, originalLine) {
    switch (strategy) {
      case 'priority':
        return this.resolveByCriteriaPriority(conflictingRemediations);
      
      case 'merge':
        return await this.mergeRemediations(conflictingRemediations, originalLine);
      
      case 'confidence':
        return this.resolveByConfidence(conflictingRemediations);
      
      case 'manual':
        // For manual resolution, return conflict info for human review
        return {
          status: 'needs_review',
          conflictType: 'line_conflict',
          options: conflictingRemediations,
          originalLine
        };
      
      default:
        logger.warn(`Unknown conflict resolution strategy: ${strategy}`);
        return this.resolveByConfidence(conflictingRemediations);
    }
  }

  resolveByCriteriaPriority(remediations) {
    // Priority order for WCAG criteria
    const priorityOrder = [
      '3.1.1', // Language first
      '2.4.2', // Page title
      '1.3.1', // Structure
      '1.1.1', // Alt text
      '3.3.2', // Labels
      '2.1.1', // Keyboard
      '2.4.4', // Link purpose
      '1.4.3', // Contrast
      '4.1.2'  // Name, role, value
    ];

    const sorted = remediations.sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a.wcagCriterion) || 999;
      const bIndex = priorityOrder.indexOf(b.wcagCriterion) || 999;
      return aIndex - bIndex;
    });

    return sorted[0];
  }

  async mergeRemediations(remediations, originalLine) {
    // Attempt to merge multiple changes into a single line
    try {
      let mergedLine = originalLine;
      const appliedChanges = [];

      // Sort by confidence (highest first)
      const sortedRemediations = remediations.sort((a, b) => 
        (b.confidence || 0.5) - (a.confidence || 0.5)
      );

      for (const remediation of sortedRemediations) {
        // Try to apply this change to the current merged line
        const merged = this.attemptMerge(mergedLine, remediation, appliedChanges);
        if (merged.success) {
          mergedLine = merged.result;
          appliedChanges.push(remediation);
        }
      }

      if (appliedChanges.length > 0) {
        return {
          ...remediations[0], // Use first as base
          beforeCode: originalLine,
          afterCode: mergedLine,
          confidence: appliedChanges.reduce((sum, r) => sum + (r.confidence || 0.5), 0) / appliedChanges.length,
          explanation: `Merged ${appliedChanges.length} changes: ${appliedChanges.map(r => r.explanation).join('; ')}`,
          mergedFrom: appliedChanges.map(r => r.wcagCriterion),
          status: 'merged'
        };
      }
    } catch (error) {
      logger.warn('Merge attempt failed:', error.message);
    }

    // Fallback to highest confidence if merge fails
    return this.resolveByConfidence(remediations);
  }

  attemptMerge(currentLine, remediation, previousChanges) {
    // Simple merge logic - can be enhanced for more complex cases
    try {
      let result = currentLine;

      // If this is an attribute addition and doesn't conflict
      if (remediation.afterCode.includes('=') && !this.hasAttributeConflict(currentLine, remediation.afterCode, previousChanges)) {
        // Extract new attributes and add them
        result = this.mergeAttributes(currentLine, remediation.afterCode);
        return { success: true, result };
      }

      // If this is text content change and previous changes were attribute changes
      if (previousChanges.every(c => c.afterCode.includes('='))) {
        return { success: true, result: remediation.afterCode };
      }

      return { success: false, reason: 'Cannot safely merge' };
    } catch (error) {
      return { success: false, reason: error.message };
    }
  }

  hasAttributeConflict(currentLine, newLine, previousChanges) {
    // Check if adding this attribute would conflict with previous changes
    // This is a simplified implementation
    return false;
  }

  mergeAttributes(currentLine, newLine) {
    // Extract attributes from both lines and merge them
    // This is a simplified implementation
    return newLine;
  }

  resolveByConfidence(remediations) {
    // Choose the remediation with highest confidence
    const sorted = remediations.sort((a, b) => 
      (b.confidence || 0.5) - (a.confidence || 0.5)
    );
    return sorted[0];
  }

  detectConflicts(results) {
    const conflicts = [];
    const lineMap = new Map();

    // Build line map
    results.forEach(result => {
      if (result.remediations) {
        result.remediations.forEach(remediation => {
          if (remediation.lineNumber) {
            const lineNum = remediation.lineNumber;
            if (!lineMap.has(lineNum)) {
              lineMap.set(lineNum, []);
            }
            lineMap.get(lineNum).push({
              ...remediation,
              resultId: result.jobId
            });
          }
        });
      }
    });

    // Find conflicts
    for (const [lineNum, remediations] of lineMap.entries()) {
      if (remediations.length > 1) {
        conflicts.push({
          type: 'line_conflict',
          lineNumber: lineNum,
          count: remediations.length,
          remediations: remediations
        });
      }
    }

    return conflicts;
  }

  async validateResults(results, sourceHtml) {
    // Validate that all changes can be applied without breaking the HTML
    const lines = sourceHtml.split('\n');
    const changes = [];

    results.forEach(remediation => {
      if (remediation.status === 'success' && remediation.lineNumber) {
        changes.push({
          lineNumber: remediation.lineNumber,
          beforeCode: remediation.beforeCode,
          afterCode: remediation.afterCode
        });
      }
    });

    // Sort by line number (descending to avoid offset issues)
    changes.sort((a, b) => b.lineNumber - a.lineNumber);

    // Apply changes and validate
    const modifiedLines = [...lines];
    const errors = [];

    changes.forEach(change => {
      const lineIndex = change.lineNumber - 1;
      
      if (lineIndex < 0 || lineIndex >= modifiedLines.length) {
        errors.push(`Line ${change.lineNumber} is out of range`);
        return;
      }

      const currentLine = modifiedLines[lineIndex];
      if (currentLine.trim() !== change.beforeCode.trim()) {
        errors.push(`Line ${change.lineNumber} content mismatch`);
        return;
      }

      modifiedLines[lineIndex] = change.afterCode;
    });

    // Basic HTML validation
    const modifiedHtml = modifiedLines.join('\n');
    try {
      const { JSDOM } = require('jsdom');
      new JSDOM(modifiedHtml);
    } catch (error) {
      errors.push(`HTML validation failed: ${error.message}`);
    }

    // Update results with validation info
    results.forEach(remediation => {
      if (remediation.status === 'success') {
        remediation.validated = errors.length === 0;
        if (errors.length > 0) {
          remediation.validationErrors = errors;
        }
      }
    });
  }

  generateSummary(results) {
    const summary = {
      total: results.length,
      successful: 0,
      failed: 0,
      merged: 0,
      needsReview: 0,
      byType: {},
      averageConfidence: 0,
      totalProcessingTime: this.statistics.endTime - this.statistics.startTime
    };

    let totalConfidence = 0;
    let confidenceCount = 0;

    results.forEach(result => {
      switch (result.status) {
        case 'success':
          summary.successful++;
          break;
        case 'failed':
          summary.failed++;
          break;
        case 'merged':
          summary.merged++;
          summary.successful++; // Also count as successful
          break;
        case 'needs_review':
          summary.needsReview++;
          break;
      }

      if (result.type) {
        if (!summary.byType[result.type]) {
          summary.byType[result.type] = { total: 0, successful: 0, failed: 0 };
        }
        summary.byType[result.type].total++;
        if (result.status === 'success' || result.status === 'merged') {
          summary.byType[result.type].successful++;
        } else if (result.status === 'failed') {
          summary.byType[result.type].failed++;
        }
      }

      if (result.confidence !== undefined) {
        totalConfidence += result.confidence;
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

  // Public method to get processing statistics
  getStatistics() {
    return { ...this.statistics };
  }

  // Public method to cancel processing
  cancelProcessing() {
    this.emit('processing-cancelled');
    // Implementation would need to track and cancel active promises
  }
}

module.exports = ParallelRemediationManager;