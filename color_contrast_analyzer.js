class ColorContrastAnalyzer {
  constructor() {
    this.cache = new Map();
  }

  async analyzePageContrast(page) {
    const contrastResults = await page.evaluate(() => {
      // Helper function to convert RGB to relative luminance
      function getLuminance(r, g, b) {
        const [rs, gs, bs] = [r, g, b].map(c => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      }

      // Helper function to calculate contrast ratio
      function getContrastRatio(lum1, lum2) {
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        return (brightest + 0.05) / (darkest + 0.05);
      }

      // Helper function to parse color string
      function parseColor(colorStr) {
        if (!colorStr || colorStr === 'transparent') return null;
        
        // Create a temporary element to parse the color
        const div = document.createElement('div');
        div.style.color = colorStr;
        document.body.appendChild(div);
        const computedColor = window.getComputedStyle(div).color;
        document.body.removeChild(div);
        
        // Parse rgb() or rgba() values
        const rgbMatch = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (rgbMatch) {
          return {
            r: parseInt(rgbMatch[1]),
            g: parseInt(rgbMatch[2]),
            b: parseInt(rgbMatch[3]),
            a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1
          };
        }
        return null;
      }

      // Helper function to get effective background color
      function getEffectiveBackgroundColor(element) {
        let currentElement = element;
        let bgColor = null;
        
        while (currentElement && currentElement !== document.body) {
          const computed = window.getComputedStyle(currentElement);
          const bg = computed.backgroundColor;
          
          if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
            const parsed = parseColor(bg);
            if (parsed && parsed.a > 0) {
              bgColor = parsed;
              break;
            }
          }
          currentElement = currentElement.parentElement;
        }
        
        // Default to white background if none found
        return bgColor || { r: 255, g: 255, b: 255, a: 1 };
      }

      // Get all text elements
      const textElements = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            // Skip whitespace-only text nodes
            if (!node.textContent.trim()) {
              return NodeFilter.FILTER_REJECT;
            }
            
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            
            // Skip hidden elements
            const style = window.getComputedStyle(parent);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
              return NodeFilter.FILTER_REJECT;
            }
            
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      const processedElements = new Set();
      let node;
      
      while (node = walker.nextNode()) {
        const parent = node.parentElement;
        if (processedElements.has(parent)) continue;
        processedElements.add(parent);
        
        const computed = window.getComputedStyle(parent);
        const textColor = parseColor(computed.color);
        const backgroundColor = getEffectiveBackgroundColor(parent);
        
        if (textColor) {
          const textLum = getLuminance(textColor.r, textColor.g, textColor.b);
          const bgLum = getLuminance(backgroundColor.r, backgroundColor.g, backgroundColor.b);
          const ratio = getContrastRatio(textLum, bgLum);
          
          // Get element selector
          let selector = parent.tagName.toLowerCase();
          if (parent.id) {
            selector = `#${parent.id}`;
          } else if (parent.className) {
            const classes = parent.className.split(' ').filter(c => c.trim()).slice(0, 2);
            if (classes.length > 0) {
              selector = `${selector}.${classes.join('.')}`;
            }
          }
          
          // Check font size for large text threshold
          const fontSize = parseFloat(computed.fontSize);
          const fontWeight = computed.fontWeight;
          const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
          
          textElements.push({
            selector,
            textColor: `rgb(${textColor.r}, ${textColor.g}, ${textColor.b})`,
            backgroundColor: `rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})`,
            ratio: Math.round(ratio * 100) / 100,
            fontSize,
            isLargeText,
            text: node.textContent.trim().substring(0, 50) + (node.textContent.length > 50 ? '...' : '')
          });
        }
      }
      
      return textElements;
    });

    return contrastResults;
  }

  async analyzeSpecificElements(page, selectors) {
    const results = [];
    
    for (const selector of selectors) {
      try {
        const elementResult = await page.evaluate((sel) => {
          const element = document.querySelector(sel);
          if (!element) return null;
          
          const computed = window.getComputedStyle(element);
          // ... (reuse color analysis logic from above)
          
          return {
            selector: sel,
            hasText: element.textContent.trim().length > 0,
            computed: {
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              fontSize: computed.fontSize,
              fontWeight: computed.fontWeight
            }
          };
        }, selector);
        
        if (elementResult) {
          results.push(elementResult);
        }
      } catch (error) {
        console.warn(`Could not analyze element: ${selector}`, error);
      }
    }
    
    return results;
  }

  // Calculate contrast ratio between two colors
  calculateContrastRatio(color1, color2) {
    const lum1 = this.getLuminance(color1.r, color1.g, color1.b);
    const lum2 = this.getLuminance(color2.r, color2.g, color2.b);
    
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  }

  // Calculate relative luminance
  getLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  // Parse CSS color string to RGB values
  parseColor(colorString) {
    // Handle hex colors
    if (colorString.startsWith('#')) {
      const hex = colorString.slice(1);
      if (hex.length === 3) {
        return {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16)
        };
      } else if (hex.length === 6) {
        return {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16)
        };
      }
    }

    // Handle rgb() and rgba() colors
    const rgbMatch = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1]),
        g: parseInt(rgbMatch[2]),
        b: parseInt(rgbMatch[3]),
        a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1
      };
    }

    // Handle named colors (basic set)
    const namedColors = {
      black: { r: 0, g: 0, b: 0 },
      white: { r: 255, g: 255, b: 255 },
      red: { r: 255, g: 0, b: 0 },
      green: { r: 0, g: 128, b: 0 },
      blue: { r: 0, g: 0, b: 255 },
      yellow: { r: 255, g: 255, b: 0 },
      cyan: { r: 0, g: 255, b: 255 },
      magenta: { r: 255, g: 0, b: 255 },
      gray: { r: 128, g: 128, b: 128 },
      grey: { r: 128, g: 128, b: 128 }
    };

    const namedColor = namedColors[colorString.toLowerCase()];
    if (namedColor) {
      return namedColor;
    }

    return null;
  }

  // Check if contrast ratio meets WCAG standards
  meetsWCAGStandards(ratio, level = 'AA', isLargeText = false) {
    if (level === 'AA') {
      return isLargeText ? ratio >= 3 : ratio >= 4.5;
    } else if (level === 'AAA') {
      return isLargeText ? ratio >= 4.5 : ratio >= 7;
    }
    return false;
  }

  // Generate contrast report
  generateContrastReport(results) {
    const report = {
      summary: {
        total: results.length,
        passing: 0,
        failing: 0,
        warnings: 0
      },
      details: []
    };

    for (const result of results) {
      const meetsAA = this.meetsWCAGStandards(result.ratio, 'AA', result.isLargeText);
      const meetsAAA = this.meetsWCAGStandards(result.ratio, 'AAA', result.isLargeText);

      let status = 'fail';
      if (meetsAA) {
        status = meetsAAA ? 'excellent' : 'pass';
        report.summary.passing++;
      } else {
        report.summary.failing++;
      }

      report.details.push({
        ...result,
        status,
        meetsAA,
        meetsAAA,
        recommendation: this.getContrastRecommendation(result.ratio, result.isLargeText)
      });
    }

    return report;
  }

  getContrastRecommendation(ratio, isLargeText) {
    const requiredAA = isLargeText ? 3 : 4.5;
    const requiredAAA = isLargeText ? 4.5 : 7;

    if (ratio >= requiredAAA) {
      return 'Excellent contrast - meets AAA standards';
    } else if (ratio >= requiredAA) {
      return 'Good contrast - meets AA standards';
    } else {
      const improvement = requiredAA / ratio;
      return `Insufficient contrast. Needs ${improvement.toFixed(1)}x improvement to meet AA standards`;
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

module.exports = ColorContrastAnalyzer;