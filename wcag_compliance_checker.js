const puppeteer = require('puppeteer');
const { JSDOM } = require('jsdom');
const wcagCriteria = require('./wcag_criteria_data');
const ColorContrastAnalyzer = require('./color_contrast_analyzer');
const ReportGenerator = require('./report_generator');
const logger = require('./logger_utility');

class WCAGComplianceChecker {
  constructor() {
    this.browser = null;
    this.results = [];
    this.currentVersion = '2.1';
    this.currentLevel = 'AA';
    this.totalChecks = 0;
    this.completedChecks = 0;
    this.colorAnalyzer = new ColorContrastAnalyzer();
    this.reportGenerator = new ReportGenerator();
  }

  async init() {
    if (!this.browser) {
      const browserFetcher = await import('puppeteer');
      const puppeteer = browserFetcher.default || browserFetcher;
      
      this.browser = await puppeteer.launch({
        executablePath: puppeteer.executablePath(),
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
    }
    return this.browser;
  }

  async cleanup() {
      try {
        if (this.browser) {
          await this.browser.close();
          this.browser = null;
          logger.info('Browser closed successfully.');
        }
      } catch (error) {
        logger.error('Error during browser cleanup:', error);
      }
    }

  setConfiguration(version, level) {
    this.currentVersion = version;
    this.currentLevel = level;
  }

  getWCAGCriteria(version = null, level = null) {
    let filtered = wcagCriteria;
    
    if (version || level) {
      filtered = {};
      Object.entries(wcagCriteria).forEach(([guidelineId, guideline]) => {
        const filteredCriteria = {};
        Object.entries(guideline.criteria).forEach(([criterionId, criterion]) => {
          let include = true;
          
          if (version && criterion.version !== version) {
            include = false;
          }
          
          if (level && !this.isLevelIncluded(criterion.level, level)) {
            include = false;
          }
          
          if (include) {
            filteredCriteria[criterionId] = criterion;
          }
        });
        
        if (Object.keys(filteredCriteria).length > 0) {
          filtered[guidelineId] = {
            ...guideline,
            criteria: filteredCriteria
          };
        }
      });
    }
    
    return filtered;
  }

  isLevelIncluded(criterionLevel, targetLevel) {
    const levels = ['A', 'AA', 'AAA'];
    const criterionIndex = levels.indexOf(criterionLevel);
    const targetIndex = levels.indexOf(targetLevel);
    return criterionIndex <= targetIndex;
  }

  async checkURL(url, options = {}) {
    const {
      wcagVersion = '2.1',
      complianceLevel = 'AA',
      includeScreenshots = false,
      waitForNetworkIdle = true,
      timeout = 60000
    } = options;

    this.setConfiguration(wcagVersion, complianceLevel);
    this.results = [];
    this.completedChecks = 0;

    await this.init();
    const page = await this.browser.newPage();
    
    try {
      // Set viewport and user agent
      await page.setViewport({ width: 1200, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Navigate to URL
      logger.info(`Navigating to: ${url}`);
      await page.goto(url, { 
        waitUntil: waitForNetworkIdle ? 'networkidle0' : 'domcontentloaded',
        timeout 
      });

      // Wait for page to be fully loaded
      await page.waitForTimeout(3000);

      // Get page content and metadata
      const pageInfo = await this.getPageInfo(page);
      
      // Take screenshot if requested
      let screenshot = null;
      if (includeScreenshots) {
        screenshot = await page.screenshot({ 
          fullPage: true, 
          encoding: 'base64' 
        });
      }

      // Run accessibility checks
      await this.runAllChecks(page);

      // Calculate results summary
      const summary = this.getResultsSummary();

      return {
        url,
        originalHtml: await page.content(),
        pageInfo,
        summary,
        results: this.results,
        screenshot,
        checkedAt: new Date().toISOString(),
        configuration: {
          wcagVersion,
          complianceLevel
        }
      };

    } catch (error) {
      logger.error(`Error checking URL ${url}:`, error);
      throw new Error(`Failed to check URL: ${error.message}`);
    } finally {
      await page.close();
      await this.cleanup();
    }
  }

  async checkHTML(htmlContent, options = {}) {
    const {
      wcagVersion = '2.1',
      complianceLevel = 'AA',
      baseUrl = 'http://localhost'
    } = options;

    this.setConfiguration(wcagVersion, complianceLevel);
    this.results = [];
    this.completedChecks = 0;

    await this.init();
    const page = await this.browser.newPage();

    try {
      // Set content
      await page.setContent(htmlContent, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });

      if (baseUrl) {
        await page.evaluateOnNewDocument((base) => {
          const baseElement = document.createElement('base');
          baseElement.href = base;
          document.head.insertBefore(baseElement, document.head.firstChild);
        }, baseUrl);
      }

      // Get page info
      const pageInfo = await this.getPageInfo(page);

      // Run accessibility checks  
      await this.runAllChecks(page);

      // Calculate results summary
      const summary = this.getResultsSummary();

      return {
        htmlContent: htmlContent.substring(0, 500) + '...',
        pageInfo,
        summary,
        results: this.results,
        checkedAt: new Date().toISOString(),
        configuration: {
          wcagVersion,
          complianceLevel
        }
      };

    } catch (error) {
      logger.error('Error checking HTML:', error);
      throw new Error(`Failed to check HTML: ${error.message}`);
    } finally {
      await page.close();
      await this.cleanup();
    }
  }

  async checkBatch(urls, options = {}) {
    const {
      wcagVersion = '2.1',
      complianceLevel = 'AA',
      concurrent = 2
    } = options;

    const results = [];
    const chunks = this.chunkArray(urls, concurrent);

    for (const chunk of chunks) {
      const promises = chunk.map(url => 
        this.checkURL(url, { wcagVersion, complianceLevel })
          .catch(error => ({
            url,
            error: error.message,
            failed: true,
            checkedAt: new Date().toISOString()
          }))
      );

      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
    }

    // Calculate overall statistics
    const successful = results.filter(r => !r.failed);
    const failed = results.filter(r => r.failed);
    
    const overallSummary = {
      totalUrls: urls.length,
      successful: successful.length,
      failed: failed.length,
      averageScore: successful.length > 0 
        ? Math.round(successful.reduce((sum, r) => sum + r.summary.score, 0) / successful.length)
        : 0,
      totalIssues: successful.reduce((sum, r) => sum + r.summary.total, 0)
    };

    return {
      summary: overallSummary,
      results,
      checkedAt: new Date().toISOString(),
      configuration: {
        wcagVersion,
        complianceLevel
      }
    };
  }

  async getPageInfo(page) {
    return await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        language: document.documentElement.lang || 'en',
        charset: document.characterSet,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        doctype: document.doctype ? document.doctype.name : 'html',
        elementCounts: {
          total: document.querySelectorAll('*').length,
          images: document.querySelectorAll('img').length,
          links: document.querySelectorAll('a[href]').length,
          headings: document.querySelectorAll('h1,h2,h3,h4,h5,h6').length,
          forms: document.querySelectorAll('form').length,
          inputs: document.querySelectorAll('input,select,textarea').length
        }
      };
    });
  }

  async runAllChecks(page) {
    this.calculateTotalChecks();
    
    const checks = [
      () => this.checkImages(page),
      () => this.checkHeadings(page),
      () => this.checkForms(page),
      () => this.checkLinks(page),
      () => this.checkKeyboardAccess(page),
      () => this.checkLanguage(page),
      () => this.checkFocus(page),
      () => this.checkStructure(page),
      () => this.checkMedia(page),
      () => this.checkColorContrast(page),
      () => this.checkTextSpacing(page),
      () => this.checkTargetSizes(page),
      () => this.checkARIA(page),
      () => this.checkTables(page),
      () => this.checkSkipLinks(page)
    ];

    for (const check of checks) {
      try {
        await check();
      } catch (error) {
        logger.error('Check failed:', error);
        this.addResult('error', 'general', 'Check Failed', 
          `A check failed: ${error.message}`, null, 'Review implementation');
      }
    }
  }

  calculateTotalChecks() {
    let count = 0;
    Object.values(wcagCriteria).forEach(guideline => {
      Object.values(guideline.criteria).forEach(criterion => {
        if (this.shouldCheckCriterion(criterion)) {
          count++;
        }
      });
    });
    this.totalChecks = count;
  }

  shouldCheckCriterion(criterion) {
    const versionNum = parseFloat(criterion.version);
    const currentVersionNum = parseFloat(this.currentVersion);
    
    if (versionNum > currentVersionNum) return false;
    
    const levels = ['A', 'AA', 'AAA'];
    const criterionLevelIndex = levels.indexOf(criterion.level);
    const currentLevelIndex = levels.indexOf(this.currentLevel);
    
    return criterionLevelIndex <= currentLevelIndex;
  }

  async checkImages(page) {
    logger.info('Checking images...');
    
    const imageData = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.map(img => ({
        src: img.src,
        alt: img.alt,
        hasAlt: img.hasAttribute('alt'),
        width: img.width,
        height: img.height,
        role: img.getAttribute('role'),
        ariaLabel: img.getAttribute('aria-label'),
        isDecorative: img.alt === '',
        isInLink: img.closest('a') !== null,
        id: img.id || null
      }));
    });

    for (const img of imageData) {
      if (!img.hasAlt) {
        this.addResult('error', '1.1.1', 'Missing Alt Attribute',
          `Image "${img.src}" is missing alt attribute`,
          { selector: `img[src="${img.src}"]` },
          'Add alt attribute to describe the image content or use alt="" for decorative images'
        );
      } else if (!img.isDecorative && img.alt.length < 3) {
        this.addResult('warning', '1.1.1', 'Very Short Alt Text',
          `Image "${img.src}" has very short alt text: "${img.alt}"`,
          { selector: `img[src="${img.src}"]` },
          'Provide more descriptive alternative text'
        );
      } else if (img.alt && img.alt.length > 125) {
        this.addResult('warning', '1.1.1', 'Very Long Alt Text',
          `Image "${img.src}" has very long alt text (${img.alt.length} characters)`,
          { selector: `img[src="${img.src}"]` },
          'Consider using a shorter alt text and provide additional description elsewhere'
        );
      } else if (img.hasAlt) {
        this.addResult('success', '1.1.1', 'Good Alt Text',
          `Image "${img.src}" has appropriate alt text`,
          { selector: `img[src="${img.src}"]` },
          'Alt text is properly implemented'
        );
      }

      // Check for complex images
      if ((img.width > 400 && img.height > 300) && !img.isDecorative) {
        this.addResult('info', '1.1.1', 'Complex Image Detected',
          `Large image "${img.src}" may need long description`,
          { selector: `img[src="${img.src}"]` },
          'Consider providing a long description for complex images'
        );
      }
    }

    this.completedChecks++;
  }

  async checkHeadings(page) {
    logger.info('Checking headings...');
    
    const headingData = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'));
      return headings.map((heading, index) => ({
        level: parseInt(heading.tagName.charAt(1)),
        text: heading.textContent.trim(),
        tagName: heading.tagName,
        index: index,
        isEmpty: heading.textContent.trim().length === 0,
        id: heading.id || null
      }));
    });

    if (headingData.length === 0) {
      this.addResult('error', '1.3.1', 'No Headings Found',
        'No heading elements found on this page',
        null,
        'Add headings to structure your content hierarchically'
      );
      this.completedChecks++;
      return;
    }

    // Check for H1
    const h1Count = headingData.filter(h => h.level === 1).length;
    if (h1Count === 0) {
      this.addResult('error', '1.3.1', 'Missing H1',
        'No H1 heading found on this page',
        null,
        'Add an H1 heading as the main page title'
      );
    } else if (h1Count > 1) {
      this.addResult('warning', '1.3.1', 'Multiple H1 Elements',
        `Found ${h1Count} H1 elements on this page`,
        null,
        'Consider using only one H1 per page'
      );
    } else {
      this.addResult('success', '1.3.1', 'Good H1 Usage',
        'Page has exactly one H1 element',
        null,
        'H1 structure is correct'
      );
    }

    // Check heading sequence
    let previousLevel = 0;
    let hasSkippedLevel = false;
    
    for (const heading of headingData) {
      if (heading.isEmpty) {
        this.addResult('error', '2.4.6', 'Empty Heading',
          `${heading.tagName} element is empty`,
          { selector: heading.tagName.toLowerCase() },
          'Provide descriptive text for all headings'
        );
      }

      if (previousLevel > 0 && heading.level > previousLevel + 1) {
        hasSkippedLevel = true;
      }
      previousLevel = heading.level;
    }

    if (hasSkippedLevel) {
      this.addResult('warning', '1.3.1', 'Skipped Heading Level',
        'Heading levels skip numbers in the sequence',
        null,
        'Use heading levels in logical order (h1, h2, h3, etc.) without skipping levels'
      );
    } else {
      this.addResult('success', '1.3.1', 'Good Heading Structure',
        'Headings follow a logical hierarchical structure',
        null,
        'Heading structure is properly organized'
      );
    }

    this.completedChecks++;
  }

  async checkForms(page) {
    logger.info('Checking forms...');
    
    const formData = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
      const fieldsets = Array.from(document.querySelectorAll('fieldset'));
      
      const inputData = inputs.map(input => {
        const id = input.id;
        const type = input.type;
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledby = input.getAttribute('aria-labelledby');
        const required = input.required;
        const placeholder = input.placeholder;
        
        return {
          id,
          type,
          tagName: input.tagName,
          hasLabel: !!label,
          hasAriaLabel: !!ariaLabel,
          hasAriaLabelledby: !!ariaLabelledby,
          required,
          placeholder,
          labelText: label ? label.textContent.trim() : null,
          isHidden: type === 'hidden'
        };
      });

      const fieldsetData = fieldsets.map(fieldset => ({
        hasLegend: !!fieldset.querySelector('legend'),
        legendText: fieldset.querySelector('legend')?.textContent.trim() || null
      }));

      return { inputs: inputData, fieldsets: fieldsetData };
    });

    // Check input labeling
    for (const input of formData.inputs) {
      if (input.isHidden || ['submit', 'button', 'reset'].includes(input.type)) {
        continue;
      }

      const hasAccessibleName = input.hasLabel || input.hasAriaLabel || input.hasAriaLabelledby;
      
      if (!hasAccessibleName) {
        this.addResult('error', '3.3.2', 'Unlabeled Form Control',
          `${input.tagName} element (type: ${input.type}) has no accessible name`,
          { selector: input.id ? `#${input.id}` : `${input.tagName.toLowerCase()}[type="${input.type}"]` },
          'Add a label element, aria-label, or aria-labelledby attribute'
        );
      } else {
        this.addResult('success', '3.3.2', 'Properly Labeled Form Control',
          `${input.tagName} element has accessible labeling`,
          { selector: input.id ? `#${input.id}` : `${input.tagName.toLowerCase()}[type="${input.type}"]` },
          'Form control is properly labeled'
        );
      }

      // Check required field indication
      if (input.required && input.hasLabel && !input.labelText?.includes('*') && !input.hasAriaLabel) {
        this.addResult('warning', '3.3.2', 'Required Field Not Indicated',
          `Required ${input.tagName} may not be clearly marked as required`,
          { selector: input.id ? `#${input.id}` : `${input.tagName.toLowerCase()}[type="${input.type}"]` },
          'Ensure required fields are clearly indicated to users'
        );
      }
    }

    // Check fieldsets
    for (const fieldset of formData.fieldsets) {
      if (!fieldset.hasLegend) {
        this.addResult('warning', '1.3.1', 'Fieldset Without Legend',
          'Fieldset element found without legend',
          { selector: 'fieldset' },
          'Add a legend element to describe the group of form controls'
        );
      }
    }

    this.completedChecks++;
  }

  async checkLinks(page) {
    logger.info('Checking links...');
    
    const linkData = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const linkTexts = new Map();
      
      return links.map(link => {
        const href = link.href;
        const text = link.textContent.trim();
        const ariaLabel = link.getAttribute('aria-label');
        const title = link.getAttribute('title');
        const hasImage = link.querySelector('img') !== null;
        const imageAlt = hasImage ? link.querySelector('img').alt : null;
        
        const linkText = ariaLabel || text || imageAlt || '';
        
        // Track duplicate text
        if (linkTexts.has(linkText)) {
          linkTexts.set(linkText, linkTexts.get(linkText) + 1);
        } else {
          linkTexts.set(linkText, 1);
        }
        
        return {
          href,
          text,
          ariaLabel,
          title,
          hasImage,
          imageAlt,
          linkText,
          isEmpty: linkText.length === 0,
          isAmbiguous: ['click here', 'more', 'read more', 'link', 'here'].includes(linkText.toLowerCase())
        };
      });
    });

    const linkTextCounts = new Map();
    
    for (const link of linkData) {
      if (linkTextCounts.has(link.linkText)) {
        linkTextCounts.set(link.linkText, linkTextCounts.get(link.linkText) + 1);
      } else {
        linkTextCounts.set(link.linkText, 1);
      }
    }

    for (const link of linkData) {
      if (link.isEmpty) {
        this.addResult('error', '2.4.4', 'Empty Link Text',
          `Link to "${link.href}" has no discernible text`,
          { selector: `a[href="${link.href}"]` },
          'Add descriptive text, aria-label, or alt text for images within the link'
        );
      } else if (link.isAmbiguous) {
        this.addResult('warning', '2.4.4', 'Ambiguous Link Text',
          `Link text "${link.linkText}" may not be descriptive enough`,
          { selector: `a[href="${link.href}"]` },
          'Use more descriptive link text that explains the link\'s purpose'
        );
      } else if (link.linkText.length < 3) {
        this.addResult('warning', '2.4.4', 'Very Short Link Text',
          `Link text "${link.linkText}" is very short`,
          { selector: `a[href="${link.href}"]` },
          'Consider using more descriptive link text'
        );
      } else {
        this.addResult('success', '2.4.4', 'Good Link Text',
          `Link has descriptive text: "${link.linkText}"`,
          { selector: `a[href="${link.href}"]` },
          'Link text is descriptive and meaningful'
        );
      }

      // Check for duplicate link text with different destinations
      if (linkTextCounts.get(link.linkText) > 1) {
        this.addResult('warning', '2.4.4', 'Duplicate Link Text',
          `Multiple links with text "${link.linkText}" may go to different destinations`,
          { selector: `a[href="${link.href}"]` },
          'Make link text unique or add additional context'
        );
      }
    }

    this.completedChecks++;
  }

  async checkKeyboardAccess(page) {
    logger.info('Checking keyboard accessibility...');
    
    const keyboardData = await page.evaluate(() => {
      const interactiveElements = Array.from(document.querySelectorAll(
        'a, button, input, select, textarea, [tabindex], [onclick], [role="button"], [role="link"]'
      ));
      
      return {
        elementsWithPositiveTabindex: interactiveElements.filter(el => {
          const tabindex = parseInt(el.getAttribute('tabindex'));
          return tabindex > 0;
        }).length,
        elementsWithNegativeTabindex: interactiveElements.filter(el => {
          const tabindex = parseInt(el.getAttribute('tabindex'));
          return tabindex < 0;
        }).length,
        totalInteractiveElements: interactiveElements.length,
        elementsWithOnlyMouseEvents: interactiveElements.filter(el => {
          const hasMouseOver = el.hasAttribute('onmouseover');
          const hasMouseOut = el.hasAttribute('onmouseout');
          const hasFocus = el.hasAttribute('onfocus');
          const hasBlur = el.hasAttribute('onblur');
          return (hasMouseOver || hasMouseOut) && (!hasFocus && !hasBlur);
        }).length
      };
    });

    if (keyboardData.elementsWithPositiveTabindex > 0) {
      this.addResult('warning', '2.4.3', 'Positive Tabindex Found',
        `${keyboardData.elementsWithPositiveTabindex} elements have positive tabindex values`,
        null,
        'Avoid positive tabindex values as they can disrupt natural tab order'
      );
    }

    if (keyboardData.elementsWithOnlyMouseEvents > 0) {
      this.addResult('warning', '2.1.1', 'Mouse-Only Event Handlers',
        `${keyboardData.elementsWithOnlyMouseEvents} elements have mouse events without keyboard equivalents`,
        null,
        'Add keyboard event handlers (onfocus/onblur) alongside mouse events'
      );
    }

    if (keyboardData.elementsWithPositiveTabindex === 0 && keyboardData.elementsWithOnlyMouseEvents === 0) {
      this.addResult('success', '2.1.1', 'Good Keyboard Accessibility',
        'No obvious keyboard accessibility issues detected',
        null,
        'Keyboard navigation appears properly implemented'
      );
    }

    this.completedChecks++;
  }

  async checkLanguage(page) {
    logger.info('Checking language attributes...');
    
    const languageData = await page.evaluate(() => {
      const html = document.documentElement;
      const lang = html.getAttribute('lang');
      const elementsWithLang = Array.from(document.querySelectorAll('[lang]')).length;
      
      return {
        pageLang: lang,
        hasPageLang: !!lang,
        elementsWithLang: elementsWithLang
      };
    });

    if (!languageData.hasPageLang) {
      this.addResult('error', '3.1.1', 'Missing Page Language',
        'HTML element is missing lang attribute',
        { selector: 'html' },
        'Add lang="en" (or appropriate language code) to the <html> element'
      );
    } else if (languageData.pageLang.length < 2) {
      this.addResult('error', '3.1.1', 'Invalid Language Code',
        `Language code "${languageData.pageLang}" appears to be invalid`,
        { selector: 'html' },
        'Use a valid ISO language code (e.g., "en", "es", "fr")'
      );
    } else {
      this.addResult('success', '3.1.1', 'Page Language Declared',
        `Page language is declared as "${languageData.pageLang}"`,
        { selector: 'html' },
        'Page language is properly declared'
      );
    }

    if (languageData.elementsWithLang > 1) {
      this.addResult('success', '3.1.2', 'Language Changes Identified',
        'Elements with language changes are properly marked',
        null,
        'Language changes are appropriately identified'
      );
    }

    this.completedChecks++;
  }

  async checkFocus(page) {
    logger.info('Checking focus management...');
    
    const focusData = await page.evaluate(() => {
      const focusableElements = Array.from(document.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex="0"], [tabindex]:not([tabindex="-1"])'
      ));
      
      return {
        focusableCount: focusableElements.length,
        hasFocusStyles: document.styleSheets.length > 0 // We'll check this differently
      };
    });

    // Check for CSS focus styles
    const hasFocusStyles = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets);
      let foundFocusStyles = false;
      
      try {
        for (const sheet of styles) {
          const rules = Array.from(sheet.cssRules || sheet.rules || []);
          for (const rule of rules) {
            if (rule.selectorText && rule.selectorText.includes(':focus')) {
              foundFocusStyles = true;
              break;
            }
          }
          if (foundFocusStyles) break;
        }
      } catch (e) {
        // Cross-origin stylesheets can't be accessed
      }
      
      return foundFocusStyles;
    });

    if (!hasFocusStyles) {
      this.addResult('warning', '2.4.7', 'No Focus Styles Detected',
        'No CSS focus styles detected',
        null,
        'Ensure all focusable elements have visible focus indicators'
      );
    } else {
      this.addResult('success', '2.4.7', 'Focus Styles Present',
        'CSS focus styles detected',
        null,
        'Focus indicators appear to be implemented'
      );
    }

    if (focusData.focusableCount === 0) {
      this.addResult('warning', '2.1.1', 'No Focusable Elements',
        'No obviously focusable elements found',
        null,
        'Ensure interactive content is keyboard accessible'
      );
    }

    this.completedChecks++;
  }

  async checkStructure(page) {
    logger.info('Checking document structure...');
    
    const structureData = await page.evaluate(() => {
      const skipLinks = Array.from(document.querySelectorAll('a[href^="#"]'));
      const hasSkipLink = skipLinks.some(link => {
        const text = link.textContent.toLowerCase();
        return text.includes('skip') && 
               (text.includes('content') || text.includes('main') || text.includes('navigation'));
      });
      
      const landmarks = document.querySelectorAll(
        'main, nav, aside, section, article, header, footer, [role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"]'
      );
      
      const title = document.querySelector('title');
      
      return {
        hasSkipLink,
        landmarkCount: landmarks.length,
        pageTitle: title ? title.textContent.trim() : '',
        hasTitleElement: !!title
      };
    });

    // Check skip links
    if (!structureData.hasSkipLink) {
      this.addResult('warning', '2.4.1', 'No Skip Link Found',
        'No skip link detected',
        null,
        'Add a skip link to help keyboard users bypass repetitive navigation'
      );
    } else {
      this.addResult('success', '2.4.1', 'Skip Link Present',
        'Skip link detected',
        null,
        'Skip link is present for keyboard navigation'
      );
    }

    // Check landmarks
    if (structureData.landmarkCount > 0) {
      this.addResult('success', '1.3.1', 'Landmarks Present',
        `${structureData.landmarkCount} landmark elements found`,
        null,
        'Page structure uses semantic landmarks'
      );
    } else {
      this.addResult('warning', '1.3.1', 'No Landmarks Found',
        'No semantic landmark elements detected',
        null,
        'Use semantic HTML5 elements (main, nav, header, footer) or ARIA landmarks'
      );
    }

    // Check page title
    if (!structureData.hasTitleElement || !structureData.pageTitle) {
      this.addResult('error', '2.4.2', 'Missing Page Title',
        'Page title is missing or empty',
        { selector: 'title' },
        'Add a descriptive page title'
      );
    } else if (structureData.pageTitle.length < 3) {
      this.addResult('warning', '2.4.2', 'Very Short Page Title',
        `Page title is very short: "${structureData.pageTitle}"`,
        { selector: 'title' },
        'Consider a more descriptive page title'
      );
    } else {
      this.addResult('success', '2.4.2', 'Good Page Title',
        `Page has descriptive title: "${structureData.pageTitle}"`,
        { selector: 'title' },
        'Page title is present and descriptive'
      );
    }

    this.completedChecks++;
  }

  async checkMedia(page) {
    logger.info('Checking multimedia content...');
    
    const mediaData = await page.evaluate(() => {
      const videos = Array.from(document.querySelectorAll('video'));
      const audios = Array.from(document.querySelectorAll('audio'));
      
      const videoData = videos.map(video => ({
        src: video.src,
        hasCaptions: video.querySelectorAll('track[kind="captions"], track[kind="subtitles"]').length > 0,
        hasControls: video.hasAttribute('controls'),
        autoplay: video.hasAttribute('autoplay')
      }));
      
      const audioData = audios.map(audio => ({
        src: audio.src,
        hasControls: audio.hasAttribute('controls'),
        autoplay: audio.hasAttribute('autoplay')
      }));
      
      return { videos: videoData, audios: audioData };
    });

    // Check videos
    for (const video of mediaData.videos) {
      if (!video.hasCaptions) {
        this.addResult('error', '1.2.2', 'Video Missing Captions',
          `Video element has no caption or subtitle tracks`,
          { selector: `video[src="${video.src}"]` },
          'Add <track> elements with captions or subtitles'
        );
      } else {
        this.addResult('success', '1.2.2', 'Video Has Captions',
          'Video element includes caption or subtitle tracks',
          { selector: `video[src="${video.src}"]` },
          'Video accessibility is properly implemented'
        );
      }

      if (!video.hasControls && !video.autoplay) {
        this.addResult('warning', '1.2.2', 'Video Without Controls',
          'Video element has no controls attribute',
          { selector: `video[src="${video.src}"]` },
          'Provide controls for user interaction with video content'
        );
      }
    }

    // Check audio
    for (const audio of mediaData.audios) {
      this.addResult('warning', '1.2.1', 'Audio May Need Transcript',
        'Audio element detected - ensure transcript is available',
        { selector: `audio[src="${audio.src}"]` },
        'Provide a transcript for audio content'
      );
    }

    if (mediaData.videos.length === 0 && mediaData.audios.length === 0) {
      this.addResult('info', '1.2.1', 'No Media Elements',
        'No audio or video elements found',
        null,
        'No media accessibility issues to check'
      );
    }

    this.completedChecks++;
  }

  async checkColorContrast(page) {
    logger.info('Checking color contrast...');
    
    try {
      const contrastResults = await this.colorAnalyzer.analyzePageContrast(page);
      
      for (const result of contrastResults) {
        if (result.ratio < 4.5) {
          this.addResult('error', '1.4.3', 'Insufficient Color Contrast',
            `Text has contrast ratio of ${result.ratio.toFixed(2)}:1 (minimum: 4.5:1)`,
            { selector: result.selector },
            'Increase color contrast to meet WCAG AA standards'
          );
        } else if (result.ratio < 7) {
          this.addResult('warning', '1.4.6', 'Enhanced Contrast Not Met',
            `Text has contrast ratio of ${result.ratio.toFixed(2)}:1 (enhanced: 7:1)`,
            { selector: result.selector },
            'Consider increasing contrast for AAA compliance'
          );
        } else {
          this.addResult('success', '1.4.3', 'Good Color Contrast',
            `Text has good contrast ratio of ${result.ratio.toFixed(2)}:1`,
            { selector: result.selector },
            'Color contrast meets accessibility standards'
          );
        }
      }
    } catch (error) {
      this.addResult('warning', '1.4.3', 'Color Contrast Check Failed',
        'Unable to analyze color contrast automatically',
        null,
        'Manually verify color contrast using a contrast analyzer tool'
      );
    }

    this.completedChecks++;
  }

  async checkTextSpacing(page) {
    logger.info('Checking text spacing...');
    
    const spacingData = await page.evaluate(() => {
      const elementsWithFixedHeight = Array.from(document.querySelectorAll('*')).filter(el => {
        const style = window.getComputedStyle(el);
        const height = style.height;
        return height && height !== 'auto' && !height.includes('%') && parseInt(height) > 0;
      });
      
      return {
        elementsWithFixedHeight: elementsWithFixedHeight.length
      };
    });

    if (spacingData.elementsWithFixedHeight > 0) {
      this.addResult('warning', '1.4.12', 'Fixed Heights Detected',
        `${spacingData.elementsWithFixedHeight} elements with fixed heights may not adapt to text spacing changes`,
        null,
        'Ensure content remains readable when users adjust text spacing'
      );
    } else {
      this.addResult('success', '1.4.12', 'Flexible Text Layout',
        'No problematic fixed heights detected',
        null,
        'Layout appears flexible for text spacing adjustments'
      );
    }

    this.completedChecks++;
  }

  async checkTargetSizes(page) {
    logger.info('Checking touch target sizes...');
    
    const targetData = await page.evaluate(() => {
      const interactiveElements = Array.from(document.querySelectorAll(
        'button, a, input[type="button"], input[type="submit"], [onclick], [role="button"]'
      ));
      
      return interactiveElements.map(el => {
        const rect = el.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          area: rect.width * rect.height,
          tagName: el.tagName,
          type: el.type || null
        };
      }).filter(el => el.width > 0 && el.height > 0);
    });

    let smallTargets = 0;
    
    for (const target of targetData) {
      if (target.width < 44 || target.height < 44) {
        smallTargets++;
        this.addResult('warning', '2.5.8', 'Small Touch Target',
          `${target.tagName} element is ${Math.round(target.width)}x${Math.round(target.height)}px (recommended: 44x44px)`,
          null,
          'Ensure touch targets are at least 44x44 pixels'
        );
      }
    }

    if (smallTargets === 0 && targetData.length > 0) {
      this.addResult('success', '2.5.8', 'Adequate Touch Targets',
        `All ${targetData.length} interactive elements meet minimum size requirements`,
        null,
        'Touch target sizes are adequate'
      );
    }

    this.completedChecks++;
  }

  async checkARIA(page) {
    logger.info('Checking ARIA implementation...');
    
    const ariaData = await page.evaluate(() => {
      const elementsWithRole = Array.from(document.querySelectorAll('[role]'));
      const elementsWithAriaLabel = Array.from(document.querySelectorAll('[aria-label]'));
      const elementsWithAriaLabelledby = Array.from(document.querySelectorAll('[aria-labelledby]'));
      const elementsWithAriaDescribedby = Array.from(document.querySelectorAll('[aria-describedby]'));
      
      const invalidRoles = elementsWithRole.filter(el => {
        const role = el.getAttribute('role');
        const validRoles = [
          'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
          'cell', 'checkbox', 'columnheader', 'combobox', 'complementary',
          'contentinfo', 'definition', 'dialog', 'directory', 'document',
          'feed', 'figure', 'form', 'grid', 'gridcell', 'group', 'heading',
          'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main',
          'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox',
          'menuitemradio', 'navigation', 'none', 'note', 'option', 'presentation',
          'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup',
          'rowheader', 'scrollbar', 'search', 'searchbox', 'separator',
          'slider', 'spinbutton', 'status', 'switch', 'tab', 'table',
          'tablist', 'tabpanel', 'term', 'textbox', 'timer', 'toolbar',
          'tooltip', 'tree', 'treegrid', 'treeitem'
        ];
        return !validRoles.includes(role);
      });
      
      return {
        roleCount: elementsWithRole.length,
        ariaLabelCount: elementsWithAriaLabel.length,
        ariaLabelledbyCount: elementsWithAriaLabelledby.length,
        ariaDescribedbyCount: elementsWithAriaDescribedby.length,
        invalidRoles: invalidRoles.map(el => el.getAttribute('role'))
      };
    });

    if (ariaData.invalidRoles.length > 0) {
      this.addResult('error', '4.1.2', 'Invalid ARIA Roles',
        `Invalid ARIA roles found: ${ariaData.invalidRoles.join(', ')}`,
        null,
        'Use only valid ARIA role values'
      );
    }

    if (ariaData.roleCount > 0 || ariaData.ariaLabelCount > 0) {
      this.addResult('success', '4.1.2', 'ARIA Implementation Found',
        'ARIA attributes are being used to enhance accessibility',
        null,
        'ARIA implementation detected - ensure proper usage'
      );
    }

    this.completedChecks++;
  }

  async checkTables(page) {
    logger.info('Checking table accessibility...');
    
    const tableData = await page.evaluate(() => {
      const tables = Array.from(document.querySelectorAll('table'));
      
      return tables.map(table => {
        const caption = table.querySelector('caption');
        const thead = table.querySelector('thead');
        const th = table.querySelectorAll('th');
        const hasHeaders = th.length > 0;
        
        return {
          hasCaption: !!caption,
          captionText: caption ? caption.textContent.trim() : null,
          hasThead: !!thead,
          headerCount: th.length,
          hasHeaders
        };
      });
    });

    for (const table of tableData) {
      if (!table.hasCaption) {
        this.addResult('warning', '1.3.1', 'Table Missing Caption',
          'Table element without caption',
          { selector: 'table' },
          'Add a caption element to describe the table\'s purpose'
        );
      }

      if (!table.hasHeaders) {
        this.addResult('error', '1.3.1', 'Table Missing Headers',
          'Table without header cells (th elements)',
          { selector: 'table' },
          'Use th elements to mark header cells in data tables'
        );
      } else {
        this.addResult('success', '1.3.1', 'Table Has Headers',
          `Table has ${table.headerCount} header cells`,
          { selector: 'table' },
          'Table headers are properly marked'
        );
      }
    }

    if (tableData.length === 0) {
      this.addResult('info', '1.3.1', 'No Tables Found',
        'No table elements found',
        null,
        'No table accessibility issues to check'
      );
    }

    this.completedChecks++;
  }

  async checkSkipLinks(page) {
    logger.info('Checking skip links...');
    
    const skipLinkData = await page.evaluate(() => {
      const skipLinks = Array.from(document.querySelectorAll('a[href^="#"]'));
      const validSkipLinks = skipLinks.filter(link => {
        const text = link.textContent.toLowerCase();
        const href = link.getAttribute('href');
        if(href.startsWith('#')) {
          const target = document.getElementById(href.substring(1));
          return text.includes('skip') && target;
        }
        const target = document.querySelector(href);
        
        return text.includes('skip') && target;
      });
      
      return {
        totalSkipLinks: skipLinks.length,
        validSkipLinks: validSkipLinks.length,
        skipLinkTexts: validSkipLinks.map(link => link.textContent.trim())
      };
    });

    if (skipLinkData.validSkipLinks === 0) {
      this.addResult('warning', '2.4.1', 'No Functional Skip Links',
        'No functional skip links found',
        null,
        'Add skip links that allow users to bypass repetitive content'
      );
    } else {
      this.addResult('success', '2.4.1', 'Skip Links Present',
        `${skipLinkData.validSkipLinks} functional skip links found`,
        null,
        'Skip links are properly implemented'
      );
    }

    this.completedChecks++;
  }

  addResult(type, criterion, title, description, element, suggestion) {
    const result = {
      type,
      criterion,
      title,
      description,
      element,
      suggestion,
      wcagInfo: this.getWCAGInfo(criterion),
      timestamp: new Date().toISOString()
    };
    
    this.results.push(result);
  }

  getWCAGInfo(criterionId) {
    const parts = criterionId.split('.');
    if (parts.length >= 2) {
      const guideline = parts[0] + '.' + parts[1];
      
      if (wcagCriteria[guideline] && wcagCriteria[guideline].criteria[criterionId]) {
        const criterion = wcagCriteria[guideline].criteria[criterionId];
        return {
          guideline: wcagCriteria[guideline].title,
          level: criterion.level,
          version: criterion.version,
          description: criterion.description
        };
      }
    }
    
    return null;
  }

  getResultsSummary() {
    const summary = {
      total: this.results.length,
      errors: this.results.filter(r => r.type === 'error').length,
      warnings: this.results.filter(r => r.type === 'warning').length,
      passed: this.results.filter(r => r.type === 'success').length,
      info: this.results.filter(r => r.type === 'info').length
    };
    
    summary.score = summary.total > 0 ? 
      Math.round(((summary.passed + (summary.info * 0.5)) / summary.total) * 100) : 100;
      
    return summary;
  }

  async exportResults(results, options = {}) {
    const { format = 'json', includeDetails = true } = options;
    return await this.reportGenerator.generate(results, format, includeDetails);
  }

  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

module.exports = WCAGComplianceChecker;
