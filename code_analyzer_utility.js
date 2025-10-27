const { JSDOM } = require('jsdom');
const logger = require('./logger_utility');

class CodeAnalyzer {
  constructor() {
    this.cache = new Map();
  }

  parseHTML(htmlContent) {
    try {
      // Create JSDOM instance for parsing
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;
      
      // Extract structural information
      const structure = {
        doctype: this.extractDoctype(htmlContent),
        html: this.analyzeHtmlElement(document),
        head: this.analyzeHeadElement(document),
        body: this.analyzeBodyElement(document),
        elements: this.catalogElements(document),
        accessibility: this.analyzeAccessibilityFeatures(document),
        statistics: this.generateStatistics(document)
      };

      return structure;

    } catch (error) {
      logger.error('HTML parsing failed:', error);
      throw new Error(`HTML parsing failed: ${error.message}`);
    }
  }

  extractDoctype(htmlContent) {
    const doctypeMatch = htmlContent.match(/<!DOCTYPE[^>]*>/i);
    return {
      present: !!doctypeMatch,
      declaration: doctypeMatch ? doctypeMatch[0] : null,
      isHTML5: doctypeMatch ? doctypeMatch[0].toLowerCase().includes('html') : false
    };
  }

  analyzeHtmlElement(document) {
    const htmlElement = document.documentElement;
    
    return {
      lang: htmlElement.getAttribute('lang'),
      dir: htmlElement.getAttribute('dir'),
      attributes: this.getElementAttributes(htmlElement),
      hasLang: !!htmlElement.getAttribute('lang'),
      langValid: this.validateLanguageCode(htmlElement.getAttribute('lang'))
    };
  }

  analyzeHeadElement(document) {
    const head = document.head;
    if (!head) return null;

    const titleElement = head.querySelector('title');
    const metaElements = Array.from(head.querySelectorAll('meta'));
    const linkElements = Array.from(head.querySelectorAll('link'));

    return {
      title: {
        present: !!titleElement,
        content: titleElement ? titleElement.textContent.trim() : null,
        length: titleElement ? titleElement.textContent.trim().length : 0
      },
      meta: metaElements.map(meta => ({
        name: meta.getAttribute('name'),
        content: meta.getAttribute('content'),
        charset: meta.getAttribute('charset'),
        httpEquiv: meta.getAttribute('http-equiv')
      })),
      links: linkElements.map(link => ({
        rel: link.getAttribute('rel'),
        href: link.getAttribute('href'),
        type: link.getAttribute('type')
      })),
      viewport: this.analyzeViewport(metaElements),
      charset: this.analyzeCharset(metaElements)
    };
  }

  analyzeBodyElement(document) {
    const body = document.body;
    if (!body) return null;

    return {
      attributes: this.getElementAttributes(body),
      landmarks: this.findLandmarks(body),
      headings: this.analyzeHeadings(body),
      forms: this.analyzeForms(body),
      images: this.analyzeImages(body),
      links: this.analyzeLinks(body),
      tables: this.analyzeTables(body),
      lists: this.analyzeLists(body)
    };
  }

  catalogElements(document) {
    const elements = {};
    const allElements = document.querySelectorAll('*');

    allElements.forEach(element => {
      const tagName = element.tagName.toLowerCase();
      if (!elements[tagName]) {
        elements[tagName] = [];
      }
      
      elements[tagName].push({
        id: element.id,
        className: element.className,
        attributes: this.getElementAttributes(element),
        textContent: element.textContent ? element.textContent.trim().substring(0, 100) : '',
        hasChildren: element.children.length > 0,
        lineNumber: this.estimateLineNumber(element, document)
      });
    });

    return elements;
  }

  analyzeAccessibilityFeatures(document) {
    return {
      ariaLabels: this.findAriaLabels(document),
      ariaDescriptions: this.findAriaDescriptions(document),
      roles: this.findRoles(document),
      skipLinks: this.findSkipLinks(document),
      focusableElements: this.findFocusableElements(document),
      tabindexElements: this.findTabindexElements(document),
      liveRegions: this.findLiveRegions(document)
    };
  }

  generateStatistics(document) {
    const allElements = document.querySelectorAll('*');
    const textNodes = this.getTextNodes(document);
    
    return {
      totalElements: allElements.length,
      totalTextNodes: textNodes.length,
      images: document.querySelectorAll('img').length,
      links: document.querySelectorAll('a[href]').length,
      buttons: document.querySelectorAll('button, input[type="button"], input[type="submit"]').length,
      forms: document.querySelectorAll('form').length,
      inputs: document.querySelectorAll('input, select, textarea').length,
      headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
      tables: document.querySelectorAll('table').length,
      lists: document.querySelectorAll('ul, ol, dl').length
    };
  }

  validateLanguageCode(lang) {
    if (!lang) return false;
    
    // Basic validation for common language codes
    const validCodes = /^[a-z]{2}(-[A-Z]{2})?$/;
    return validCodes.test(lang);
  }

  analyzeViewport(metaElements) {
    const viewport = metaElements.find(meta => 
      meta.getAttribute('name') === 'viewport'
    );
    
    if (!viewport) return { present: false };
    
    const content = viewport.getAttribute('content') || '';
    
    return {
      present: true,
      content: content,
      hasWidth: content.includes('width='),
      hasInitialScale: content.includes('initial-scale='),
      hasUserScalable: content.includes('user-scalable='),
      allowsZoom: !content.includes('user-scalable=no') && !content.includes('maximum-scale=1')
    };
  }

  analyzeCharset(metaElements) {
    const charset = metaElements.find(meta => 
      meta.hasAttribute('charset') || 
      (meta.getAttribute('http-equiv') === 'Content-Type' && meta.getAttribute('content'))
    );
    
    return {
      present: !!charset,
      value: charset ? (charset.getAttribute('charset') || this.extractCharsetFromContentType(charset.getAttribute('content'))) : null
    };
  }

  extractCharsetFromContentType(content) {
    if (!content) return null;
    const match = content.match(/charset=([^;]+)/i);
    return match ? match[1].trim() : null;
  }

  findLandmarks(container) {
    const landmarks = [];
    const landmarkSelectors = [
      'main', 'nav', 'aside', 'section', 'article', 'header', 'footer',
      '[role="main"]', '[role="navigation"]', '[role="complementary"]',
      '[role="banner"]', '[role="contentinfo"]', '[role="region"]'
    ];

    landmarkSelectors.forEach(selector => {
      const elements = container.querySelectorAll(selector);
      elements.forEach(element => {
        landmarks.push({
          type: element.tagName.toLowerCase(),
          role: element.getAttribute('role'),
          id: element.id,
          ariaLabel: element.getAttribute('aria-label'),
          ariaLabelledby: element.getAttribute('aria-labelledby')
        });
      });
    });

    return landmarks;
  }

  analyzeHeadings(container) {
    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    
    return headings.map((heading, index) => ({
      level: parseInt(heading.tagName.charAt(1)),
      text: heading.textContent.trim(),
      id: heading.id,
      isEmpty: heading.textContent.trim().length === 0,
      index: index,
      lineNumber: this.estimateLineNumber(heading, container.ownerDocument)
    }));
  }

  analyzeForms(container) {
    const forms = Array.from(container.querySelectorAll('form'));
    
    return forms.map(form => ({
      id: form.id,
      action: form.action,
      method: form.method,
      inputs: this.analyzeFormInputs(form),
      fieldsets: this.analyzeFieldsets(form),
      hasSubmitButton: !!form.querySelector('button[type="submit"], input[type="submit"]')
    }));
  }

  analyzeFormInputs(form) {
    const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
    
    return inputs.map(input => ({
      type: input.type || input.tagName.toLowerCase(),
      id: input.id,
      name: input.name,
      required: input.required,
      hasLabel: this.findLabelForInput(input),
      ariaLabel: input.getAttribute('aria-label'),
      ariaDescribedby: input.getAttribute('aria-describedby'),
      placeholder: input.placeholder
    }));
  }

  analyzeFieldsets(form) {
    const fieldsets = Array.from(form.querySelectorAll('fieldset'));
    
    return fieldsets.map(fieldset => ({
      hasLegend: !!fieldset.querySelector('legend'),
      legendText: fieldset.querySelector('legend')?.textContent.trim(),
      inputCount: fieldset.querySelectorAll('input, select, textarea').length
    }));
  }

  findLabelForInput(input) {
    const id = input.id;
    const form = input.closest('form') || input.ownerDocument;
    
    // Check for label with 'for' attribute
    if (id) {
      const label = form.querySelector(`label[for="${id}"]`);
      if (label) return true;
    }
    
    // Check if wrapped in label
    const wrappingLabel = input.closest('label');
    return !!wrappingLabel;
  }

  analyzeImages(container) {
    const images = Array.from(container.querySelectorAll('img'));
    
    return images.map(img => ({
      src: img.src,
      alt: img.alt,
      hasAlt: img.hasAttribute('alt'),
      isEmpty: img.alt === '',
      role: img.getAttribute('role'),
      ariaLabel: img.getAttribute('aria-label'),
      isInLink: !!img.closest('a'),
      width: img.width,
      height: img.height,
      lineNumber: this.estimateLineNumber(img, container.ownerDocument)
    }));
  }

  analyzeLinks(container) {
    const links = Array.from(container.querySelectorAll('a[href]'));
    
    return links.map(link => ({
      href: link.href,
      text: link.textContent.trim(),
      ariaLabel: link.getAttribute('aria-label'),
      title: link.title,
      hasText: link.textContent.trim().length > 0,
      hasImage: !!link.querySelector('img'),
      target: link.target,
      isExternal: link.hostname !== link.ownerDocument.location.hostname
    }));
  }

  analyzeTables(container) {
    const tables = Array.from(container.querySelectorAll('table'));
    
    return tables.map(table => ({
      hasCaption: !!table.querySelector('caption'),
      captionText: table.querySelector('caption')?.textContent.trim(),
      hasThead: !!table.querySelector('thead'),
      hasTbody: !!table.querySelector('tbody'),
      hasTfoot: !!table.querySelector('tfoot'),
      headerCells: table.querySelectorAll('th').length,
      dataCells: table.querySelectorAll('td').length,
      rows: table.querySelectorAll('tr').length
    }));
  }

  analyzeLists(container) {
    const lists = Array.from(container.querySelectorAll('ul, ol, dl'));
    
    return lists.map(list => ({
      type: list.tagName.toLowerCase(),
      itemCount: list.querySelectorAll('li, dt').length,
      isNested: !!list.closest('li'),
      hasProperStructure: this.validateListStructure(list)
    }));
  }

  validateListStructure(list) {
    const tagName = list.tagName.toLowerCase();
    
    if (tagName === 'ul' || tagName === 'ol') {
      const children = Array.from(list.children);
      return children.every(child => child.tagName.toLowerCase() === 'li');
    }
    
    if (tagName === 'dl') {
      const children = Array.from(list.children);
      return children.every(child => ['dt', 'dd'].includes(child.tagName.toLowerCase()));
    }
    
    return false;
  }

  findAriaLabels(document) {
    const elements = document.querySelectorAll('[aria-label]');
    return Array.from(elements).map(el => ({
      tagName: el.tagName.toLowerCase(),
      id: el.id,
      ariaLabel: el.getAttribute('aria-label'),
      lineNumber: this.estimateLineNumber(el, document)
    }));
  }

  findAriaDescriptions(document) {
    const elements = document.querySelectorAll('[aria-describedby]');
    return Array.from(elements).map(el => ({
      tagName: el.tagName.toLowerCase(),
      id: el.id,
      ariaDescribedby: el.getAttribute('aria-describedby'),
      lineNumber: this.estimateLineNumber(el, document)
    }));
  }

  findRoles(document) {
    const elements = document.querySelectorAll('[role]');
    return Array.from(elements).map(el => ({
      tagName: el.tagName.toLowerCase(),
      id: el.id,
      role: el.getAttribute('role'),
      lineNumber: this.estimateLineNumber(el, document)
    }));
  }

  findSkipLinks(document) {
    const links = document.querySelectorAll('a[href^="#"]');
    return Array.from(links).filter(link => {
      const text = link.textContent.toLowerCase();
      return text.includes('skip') && (text.includes('content') || text.includes('main') || text.includes('nav'));
    }).map(link => ({
      text: link.textContent.trim(),
      href: link.href,
      target: document.querySelector(link.getAttribute('href')),
      lineNumber: this.estimateLineNumber(link, document)
    }));
  }

  findFocusableElements(document) {
    const selector = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const elements = document.querySelectorAll(selector);
    
    return Array.from(elements).map(el => ({
      tagName: el.tagName.toLowerCase(),
      id: el.id,
      type: el.type,
      tabindex: el.getAttribute('tabindex'),
      lineNumber: this.estimateLineNumber(el, document)
    }));
  }

  findTabindexElements(document) {
    const elements = document.querySelectorAll('[tabindex]');
    return Array.from(elements).map(el => ({
      tagName: el.tagName.toLowerCase(),
      id: el.id,
      tabindex: el.getAttribute('tabindex'),
      isPositive: parseInt(el.getAttribute('tabindex')) > 0,
      lineNumber: this.estimateLineNumber(el, document)
    }));
  }

  findLiveRegions(document) {
    const elements = document.querySelectorAll('[aria-live], [role="status"], [role="alert"]');
    return Array.from(elements).map(el => ({
      tagName: el.tagName.toLowerCase(),
      id: el.id,
      ariaLive: el.getAttribute('aria-live'),
      role: el.getAttribute('role'),
      lineNumber: this.estimateLineNumber(el, document)
    }));
  }

  getElementAttributes(element) {
    const attributes = {};
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      attributes[attr.name] = attr.value;
    }
    return attributes;
  }

  getTextNodes(document) {
    const walker = document.createTreeWalker(
      document.body,
      4, // NodeFilter.SHOW_TEXT
      {
        acceptNode: function(node) {
          return node.textContent.trim().length > 0 ? 1 : 2; // FILTER_ACCEPT : FILTER_REJECT
        }
      }
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push({
        text: node.textContent.trim(),
        parent: node.parentElement?.tagName.toLowerCase(),
        length: node.textContent.trim().length
      });
    }
    
    return textNodes;
  }

  estimateLineNumber(element, document) {
    // This is a simplified line number estimation
    // In a real implementation, you'd need source map or better parsing
    try {
      const serializer = new document.defaultView.XMLSerializer();
      const elementString = serializer.serializeToString(element);
      const documentString = document.documentElement.outerHTML;
      
      const index = documentString.indexOf(elementString);
      if (index !== -1) {
        const beforeElement = documentString.substring(0, index);
        return beforeElement.split('\n').length;
      }
    } catch (error) {
      // Fallback estimation
    }
    
    return null;
  }

  findElementBySelector(document, selector) {
    try {
      return document.querySelector(selector);
    } catch (error) {
      logger.warn(`Invalid selector: ${selector}`);
      return null;
    }
  }

  extractRelevantCode(htmlContent, lineNumbers, context = 3) {
    const lines = htmlContent.split('\n');
    const relevantLines = new Set();
    
    lineNumbers.forEach(lineNum => {
      const index = lineNum - 1; // Convert to 0-based
      for (let i = Math.max(0, index - context); 
           i <= Math.min(lines.length - 1, index + context); 
           i++) {
        relevantLines.add(i);
      }
    });
    
    const sortedLines = Array.from(relevantLines).sort((a, b) => a - b);
    return sortedLines.map(i => ({
      lineNumber: i + 1,
      content: lines[i]
    }));
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = CodeAnalyzer;