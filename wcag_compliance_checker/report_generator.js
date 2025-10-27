const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class ReportGenerator {
  constructor() {
    this.templates = {
      html: this.getHTMLTemplate(),
      email: this.getEmailTemplate()
    };
  }

  async generate(results, format = 'json', includeDetails = true) {
    switch (format.toLowerCase()) {
      case 'json':
        return this.generateJSON(results, includeDetails);
      case 'csv':
        return this.generateCSV(results, includeDetails);
      case 'html':
        return this.generateHTML(results, includeDetails);
      case 'pdf':
        return await this.generatePDF(results, includeDetails);
      case 'xml':
        return this.generateXML(results, includeDetails);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  generateJSON(results, includeDetails) {
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        format: 'json',
        version: '1.0',
        includeDetails
      },
      ...this.processResults(results, includeDetails)
    };

    return JSON.stringify(report, null, 2);
  }

  generateCSV(results, includeDetails) {
    const processedResults = this.processResults(results, includeDetails);
    const headers = [
      'Type',
      'WCAG Criterion',
      'Title',
      'Description',
      'Suggestion',
      'Element Selector',
      'WCAG Level',
      'WCAG Version',
      'Timestamp'
    ];

    const rows = [headers.join(',')];

    if (processedResults.results) {
      processedResults.results.forEach(result => {
        const row = [
          this.escapeCSV(result.type),
          this.escapeCSV(result.criterion),
          this.escapeCSV(result.title),
          this.escapeCSV(result.description),
          this.escapeCSV(result.suggestion),
          this.escapeCSV(result.element?.selector || ''),
          this.escapeCSV(result.wcagInfo?.level || ''),
          this.escapeCSV(result.wcagInfo?.version || ''),
          this.escapeCSV(result.timestamp || '')
        ];
        rows.push(row.join(','));
      });
    }

    return rows.join('\n');
  }

  generateHTML(results, includeDetails) {
    const processedResults = this.processResults(results, includeDetails);
    const timestamp = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let html = this.templates.html;

    // Replace template variables
    html = html.replace('{{TITLE}}', 'WCAG Accessibility Compliance Report');
    html = html.replace('{{GENERATED_DATE}}', timestamp);
    html = html.replace('{{URL}}', processedResults.url || processedResults.pageInfo?.url || 'Unknown');
    html = html.replace('{{PAGE_TITLE}}', processedResults.pageInfo?.title || 'Unknown');
    html = html.replace('{{WCAG_VERSION}}', processedResults.configuration?.wcagVersion || '2.1');
    html = html.replace('{{COMPLIANCE_LEVEL}}', processedResults.configuration?.complianceLevel || 'AA');

    // Summary section
    const summary = processedResults.summary || {
      total: 0,
      errors: 0,
      warnings: 0,
      passed: 0,
      score: 0
    };

    html = html.replace('{{TOTAL_ISSUES}}', summary.total.toString());
    html = html.replace('{{ERROR_COUNT}}', summary.errors.toString());
    html = html.replace('{{WARNING_COUNT}}', summary.warnings.toString());
    html = html.replace('{{PASSED_COUNT}}', summary.passed.toString());
    html = html.replace('{{SCORE}}', summary.score.toString());
    html = html.replace('{{SCORE_COLOR}}', this.getScoreColor(summary.score));

    // Results section
    let resultsHTML = '';
    if (processedResults.results && processedResults.results.length > 0) {
      resultsHTML = processedResults.results.map(result => this.resultToHTML(result)).join('');
    } else {
      resultsHTML = '<div class="no-results">No accessibility issues found.</div>';
    }
    html = html.replace('{{RESULTS}}', resultsHTML);

    return html;
  }

  async generatePDF(results, includeDetails) {
    const htmlContent = this.generateHTML(results, includeDetails);
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1in',
          right: '1in',
          bottom: '1in',
          left: '1in'
        },
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; color: #666;">
            WCAG Accessibility Compliance Report
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; color: #666;">
            <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `
      });

      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }

  generateXML(results, includeDetails) {
    const processedResults = this.processResults(results, includeDetails);
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<wcag-report>\n';
    xml += `  <metadata>\n`;
    xml += `    <generated-at>${new Date().toISOString()}</generated-at>\n`;
    xml += `    <format>xml</format>\n`;
    xml += `    <version>1.0</version>\n`;
    xml += `  </metadata>\n`;

    if (processedResults.url) {
      xml += `  <url>${this.escapeXML(processedResults.url)}</url>\n`;
    }

    if (processedResults.summary) {
      xml += `  <summary>\n`;
      xml += `    <total>${processedResults.summary.total}</total>\n`;
      xml += `    <errors>${processedResults.summary.errors}</errors>\n`;
      xml += `    <warnings>${processedResults.summary.warnings}</warnings>\n`;
      xml += `    <passed>${processedResults.summary.passed}</passed>\n`;
      xml += `    <score>${processedResults.summary.score}</score>\n`;
      xml += `  </summary>\n`;
    }

    if (processedResults.results && processedResults.results.length > 0) {
      xml += `  <results>\n`;
      processedResults.results.forEach(result => {
        xml += `    <result>\n`;
        xml += `      <type>${this.escapeXML(result.type)}</type>\n`;
        xml += `      <criterion>${this.escapeXML(result.criterion)}</criterion>\n`;
        xml += `      <title>${this.escapeXML(result.title)}</title>\n`;
        xml += `      <description>${this.escapeXML(result.description)}</description>\n`;
        xml += `      <suggestion>${this.escapeXML(result.suggestion)}</suggestion>\n`;
        if (result.element?.selector) {
          xml += `      <element-selector>${this.escapeXML(result.element.selector)}</element-selector>\n`;
        }
        if (result.wcagInfo) {
          xml += `      <wcag-info>\n`;
          xml += `        <level>${this.escapeXML(result.wcagInfo.level)}</level>\n`;
          xml += `        <version>${this.escapeXML(result.wcagInfo.version)}</version>\n`;
          xml += `        <guideline>${this.escapeXML(result.wcagInfo.guideline)}</guideline>\n`;
          xml += `      </wcag-info>\n`;
        }
        xml += `      <timestamp>${this.escapeXML(result.timestamp)}</timestamp>\n`;
        xml += `    </result>\n`;
      });
      xml += `  </results>\n`;
    }

    xml += '</wcag-report>';
    return xml;
  }

  processResults(results, includeDetails) {
    // Handle different result structures
    if (results.results) {
      // Full result object
      return includeDetails ? results : {
        url: results.url,
        summary: results.summary,
        checkedAt: results.checkedAt,
        configuration: results.configuration
      };
    } else if (Array.isArray(results)) {
      // Array of results
      return {
        results: includeDetails ? results : results.map(r => ({
          type: r.type,
          criterion: r.criterion,
          title: r.title
        }))
      };
    } else {
      // Single result or unknown structure
      return results;
    }
  }

  resultToHTML(result) {
    const iconMap = {
      error: '❌',
      warning: '⚠️',
      success: '✅',
      info: 'ℹ️'
    };

    const typeClass = result.type;
    const icon = iconMap[result.type] || '•';

    return `
      <div class="result-item ${typeClass}">
        <div class="result-header">
          <span class="result-icon">${icon}</span>
          <h3 class="result-title">${this.escapeHTML(result.title)}</h3>
          <span class="result-criterion">${this.escapeHTML(result.criterion)}</span>
        </div>
        <div class="result-content">
          <p class="result-description">${this.escapeHTML(result.description)}</p>
          ${result.suggestion ? `<p class="result-suggestion"><strong>How to fix:</strong> ${this.escapeHTML(result.suggestion)}</p>` : ''}
          ${result.element?.selector ? `<p class="result-element"><strong>Element:</strong> <code>${this.escapeHTML(result.element.selector)}</code></p>` : ''}
          ${result.wcagInfo ? `
            <div class="wcag-info">
              <strong>WCAG ${this.escapeHTML(result.wcagInfo.version)}:</strong> 
              ${this.escapeHTML(result.wcagInfo.guideline)} - Level ${this.escapeHTML(result.wcagInfo.level)}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  getScoreColor(score) {
    if (score >= 80) return '#28a745';
    if (score >= 60) return '#ffc107';
    return '#dc3545';
  }

  escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  escapeCSV(str) {
    if (!str) return '';
    const escaped = str.toString().replace(/"/g, '""');
    return `"${escaped}"`;
  }

  escapeXML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  getHTMLTemplate() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}}</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
        }
        
        .header h1 {
            color: #2563eb;
            margin-bottom: 1rem;
            font-size: 2.5rem;
        }
        
        .header-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }
        
        .info-item {
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 6px;
        }
        
        .info-label {
            font-weight: 600;
            color: #6b7280;
            display: block;
            margin-bottom: 0.5rem;
        }
        
        .summary {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
        }
        
        .summary h2 {
            margin-bottom: 1.5rem;
            color: #1f2937;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
        }
        
        .summary-item {
            text-align: center;
            padding: 1.5rem;
            border-radius: 8px;
            background: #f8f9fa;
        }
        
        .summary-item.score {
            background: linear-gradient(135deg, {{SCORE_COLOR}}, {{SCORE_COLOR}}dd);
            color: white;
        }
        
        .summary-item.error {
            background: linear-gradient(135deg, #dc3545, #dc3545dd);
            color: white;
        }
        
        .summary-item.warning {
            background: linear-gradient(135deg, #ffc107, #ffc107dd);
            color: white;
        }
        
        .summary-item.success {
            background: linear-gradient(135deg, #28a745, #28a745dd);
            color: white;
        }
        
        .summary-value {
            font-size: 2.5rem;
            font-weight: bold;
            display: block;
        }
        
        .summary-label {
            font-size: 0.9rem;
            opacity: 0.9;
        }
        
        .results-section {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .results-header {
            background: #f8f9fa;
            padding: 1.5rem 2rem;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .results-header h2 {
            color: #1f2937;
        }
        
        .results-content {
            padding: 0;
        }
        
        .result-item {
            border-bottom: 1px solid #e5e7eb;
            padding: 1.5rem 2rem;
        }
        
        .result-item:last-child {
            border-bottom: none;
        }
        
        .result-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        
        .result-icon {
            font-size: 1.5rem;
        }
        
        .result-title {
            flex: 1;
            color: #1f2937;
            font-size: 1.25rem;
        }
        
        .result-criterion {
            background: #e5e7eb;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.875rem;
            color: #374151;
            font-weight: 500;
        }
        
        .result-content {
            margin-left: 2.5rem;
        }
        
        .result-description {
            color: #6b7280;
            margin-bottom: 1rem;
        }
        
        .result-suggestion {
            color: #059669;
            background: #ecfdf5;
            padding: 1rem;
            border-radius: 6px;
            margin-bottom: 1rem;
        }
        
        .result-element {
            font-family: monospace;
            background: #f3f4f6;
            padding: 0.5rem;
            border-radius: 4px;
            margin-bottom: 1rem;
        }
        
        .wcag-info {
            background: #dbeafe;
            padding: 1rem;
            border-radius: 6px;
            color: #1e40af;
            font-size: 0.9rem;
        }
        
        .result-item.error {
            border-left: 4px solid #dc3545;
        }
        
        .result-item.warning {
            border-left: 4px solid #ffc107;
        }
        
        .result-item.success {
            border-left: 4px solid #28a745;
        }
        
        .result-item.info {
            border-left: 4px solid #17a2b8;
        }
        
        .no-results {
            text-align: center;
            padding: 3rem;
            color: #6b7280;
            font-size: 1.125rem;
        }
        
        .footer {
            margin-top: 2rem;
            text-align: center;
            color: #6b7280;
            font-size: 0.875rem;
        }
        
        @media print {
            body {
                background: white;
            }
            
            .container {
                padding: 0;
            }
            
            .header, .summary, .results-section {
                box-shadow: none;
                border: 1px solid #e5e7eb;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{TITLE}}</h1>
            <div class="header-info">
                <div class="info-item">
                    <span class="info-label">Generated</span>
                    {{GENERATED_DATE}}
                </div>
                <div class="info-item">
                    <span class="info-label">URL</span>
                    {{URL}}
                </div>
                <div class="info-item">
                    <span class="info-label">Page Title</span>
                    {{PAGE_TITLE}}
                </div>
                <div class="info-item">
                    <span class="info-label">WCAG Version</span>
                    {{WCAG_VERSION}} Level {{COMPLIANCE_LEVEL}}
                </div>
            </div>
        </div>
        
        <div class="summary">
            <h2>Accessibility Summary</h2>
            <div class="summary-grid">
                <div class="summary-item score">
                    <span class="summary-value">{{SCORE}}%</span>
                    <span class="summary-label">Accessibility Score</span>
                </div>
                <div class="summary-item">
                    <span class="summary-value">{{TOTAL_ISSUES}}</span>
                    <span class="summary-label">Total Issues</span>
                </div>
                <div class="summary-item error">
                    <span class="summary-value">{{ERROR_COUNT}}</span>
                    <span class="summary-label">Errors</span>
                </div>
                <div class="summary-item warning">
                    <span class="summary-value">{{WARNING_COUNT}}</span>
                    <span class="summary-label">Warnings</span>
                </div>
                <div class="summary-item success">
                    <span class="summary-value">{{PASSED_COUNT}}</span>
                    <span class="summary-label">Passed</span>
                </div>
            </div>
        </div>
        
        <div class="results-section">
            <div class="results-header">
                <h2>Detailed Results</h2>
            </div>
            <div class="results-content">
                {{RESULTS}}
            </div>
        </div>
        
        <div class="footer">
            <p>Generated by WCAG Compliance Checker API</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  getEmailTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .summary { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .footer { background: #6b7280; color: white; padding: 15px; text-align: center; font-size: 14px; }
        .score { font-size: 24px; font-weight: bold; }
        .error { color: #dc3545; }
        .warning { color: #ffc107; }
        .success { color: #28a745; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Accessibility Report</h1>
            <p>{{URL}}</p>
        </div>
        <div class="content">
            <div class="summary">
                <h2>Summary</h2>
                <p class="score">Score: {{SCORE}}%</p>
                <p><span class="error">{{ERROR_COUNT}} Errors</span> | <span class="warning">{{WARNING_COUNT}} Warnings</span> | <span class="success">{{PASSED_COUNT}} Passed</span></p>
            </div>
            {{CONTENT}}
        </div>
        <div class="footer">
            Generated by WCAG Compliance Checker
        </div>
    </div>
</body>
</html>
    `;
  }
}

module.exports = ReportGenerator;