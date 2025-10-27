// Comprehensive remediation prompts for WCAG compliance issues

const remediationPrompts = {
  // WCAG 1.1.1 - Non-text Content
  "1.1.1": {
    prompt: `Fix missing or inadequate alt text for images. You must:
1. Add meaningful alt attributes to images that convey information
2. Use empty alt="" for purely decorative images
3. Provide descriptive alt text that conveys the image's purpose and content
4. For complex images (charts, diagrams), consider if a longer description is needed
5. For images within links, describe the link destination or function`,
    guidelines: [
      "Alt text should be concise but descriptive (typically under 125 characters)",
      "Don't start with 'image of' or 'picture of'",
      "For decorative images, use alt=''",
      "For functional images (buttons, links), describe the function",
      "For informative images, describe the essential information conveyed"
    ]
  },

  // WCAG 1.2.1 - Audio-only and Video-only
  "1.2.1": {
    prompt: `Provide alternatives for audio-only and video-only content. You must:
1. Add transcript links for audio-only content
2. Add audio descriptions or transcripts for video-only content
3. Ensure alternative content is easily discoverable near the media
4. Use appropriate markup to associate alternatives with media`,
    guidelines: [
      "Place transcript links immediately before or after the media element",
      "Use descriptive link text like 'Read transcript'",
      "Consider using details/summary elements for inline transcripts",
      "Ensure transcript links are keyboard accessible"
    ]
  },

  // WCAG 1.2.2 - Captions (Prerecorded)
  "1.2.2": {
    prompt: `Add captions for prerecorded video content. You must:
1. Add track elements with captions to video elements
2. Ensure captions are synchronized with the audio
3. Include both dialogue and important sound effects
4. Provide controls to enable/disable captions`,
    guidelines: [
      "Use <track kind='captions'> elements",
      "Captions should include speaker identification when relevant",
      "Include sound effects and music cues when important",
      "Ensure caption files are in proper WebVTT format"
    ]
  },

  // WCAG 1.3.1 - Info and Relationships
  "1.3.1": {
    prompt: `Fix semantic markup and structural relationships. You must:
1. Use proper heading hierarchy (h1, h2, h3, etc.)
2. Associate form labels with their controls
3. Use appropriate semantic elements (nav, main, article, section)
4. Group related form controls with fieldset/legend
5. Ensure data tables have proper headers and structure`,
    guidelines: [
      "Use only one h1 per page",
      "Don't skip heading levels",
      "Use semantic HTML5 elements instead of generic divs",
      "Associate labels using 'for' attribute or by wrapping",
      "Use th elements for table headers with scope attributes"
    ]
  },

  // WCAG 1.3.2 - Meaningful Sequence
  "1.3.2": {
    prompt: `Ensure content has a logical reading order. You must:
1. Arrange content in source order that matches visual/logical order
2. Use CSS for visual positioning instead of relying on source order
3. Ensure tabindex doesn't disrupt natural reading flow
4. Place content in DOM order that makes sense without CSS`,
    guidelines: [
      "Source order should match visual order",
      "Avoid positive tabindex values",
      "Use CSS positioning for layout, not HTML order",
      "Test reading order with CSS disabled"
    ]
  },

  // WCAG 1.3.3 - Sensory Characteristics
  "1.3.3": {
    prompt: `Remove instructions that rely solely on sensory characteristics. You must:
1. Replace shape-only instructions (e.g., "click the round button") with text labels
2. Add location information beyond visual position (e.g., "Settings button in the top right")
3. Supplement color-only instructions with text or symbols
4. Provide multiple ways to identify interactive elements`,
    guidelines: [
      "Don't rely on 'click the red button' - use labels",
      "Don't use only 'on the left' - add specific identifiers",
      "Include text labels alongside icons",
      "Use multiple identifying characteristics"
    ]
  },

  // WCAG 1.4.1 - Use of Color
  "1.4.1": {
    prompt: `Ensure information isn't conveyed by color alone. You must:
1. Add text labels or symbols alongside color coding
2. Use patterns, textures, or shapes in addition to color
3. Ensure links are distinguishable from surrounding text without color
4. Provide additional indicators for required fields beyond color`,
    guidelines: [
      "Add icons or text labels to color-coded information",
      "Use underlines or other styling for links",
      "Include asterisks (*) or 'required' text for mandatory fields",
      "Provide pattern fills in charts/graphs"
    ]
  },

  // WCAG 1.4.3 - Contrast (Minimum)
  "1.4.3": {
    prompt: `Fix color contrast issues to meet minimum standards. You must:
1. Increase contrast between text and background colors
2. Ensure normal text has at least 4.5:1 contrast ratio
3. Ensure large text has at least 3:1 contrast ratio
4. Fix contrast for UI components and graphical objects`,
    guidelines: [
      "Use darker text on light backgrounds or lighter text on dark backgrounds",
      "Large text is 18pt+ or 14pt+ bold",
      "Test with online contrast analyzers",
      "Consider using system colors for better compatibility"
    ]
  },

  // WCAG 1.4.4 - Resize Text
  "1.4.4": {
    prompt: `Ensure text can be resized to 200% without loss of functionality. You must:
1. Use relative units (em, rem, %) instead of fixed pixels for text
2. Ensure layouts don't break when text is enlarged
3. Avoid horizontal scrolling when text is resized
4. Use responsive design techniques`,
    guidelines: [
      "Use em or rem units for font sizes",
      "Use flexible layouts that adapt to content",
      "Test at 200% zoom level",
      "Avoid fixed width containers for text"
    ]
  },

  // WCAG 2.1.1 - Keyboard
  "2.1.1": {
    prompt: `Make all functionality keyboard accessible. You must:
1. Ensure all interactive elements can be reached via keyboard
2. Add keyboard event handlers where mouse events exist
3. Make custom controls keyboard operable with appropriate ARIA
4. Provide visible focus indicators`,
    guidelines: [
      "Add onkeydown/onkeyup handlers alongside onclick",
      "Use tabindex='0' for custom interactive elements",
      "Implement arrow key navigation for complex widgets",
      "Ensure Tab key moves through all interactive elements"
    ]
  },

  // WCAG 2.1.2 - No Keyboard Trap
  "2.1.2": {
    prompt: `Prevent keyboard focus traps. You must:
1. Ensure users can move focus away from any element using standard navigation
2. If non-standard navigation is required, provide clear instructions
3. Implement proper focus management in modal dialogs
4. Allow Escape key to close modal dialogs`,
    guidelines: [
      "Test that Tab key can move through entire page",
      "Provide escape mechanisms for modal dialogs",
      "Document any non-standard keyboard navigation",
      "Implement focus cycling within modal dialogs"
    ]
  },

  // WCAG 2.4.1 - Bypass Blocks
  "2.4.1": {
    prompt: `Add skip navigation links to bypass repetitive content. You must:
1. Add a 'Skip to main content' link as the first focusable element
2. Create target anchors for skip links
3. Ensure skip links are visible when focused
4. Consider skip links for other repetitive blocks`,
    guidelines: [
      "Place skip link as first element in body",
      "Use href='#main' or similar meaningful target",
      "Make skip links visible on focus",
      "Include skip links for navigation, sidebars, etc."
    ]
  },

  // WCAG 2.4.2 - Page Titled
  "2.4.2": {
    prompt: `Provide descriptive and unique page titles. You must:
1. Add or improve the title element content
2. Make titles descriptive of page content or purpose
3. Include site name if appropriate
4. Keep titles concise but informative`,
    guidelines: [
      "Start with the most specific/unique information",
      "Include site name at the end if space allows",
      "Keep titles under 60 characters when possible",
      "Make each page title unique within the site"
    ]
  },

  // WCAG 2.4.3 - Focus Order
  "2.4.3": {
    prompt: `Ensure logical focus order through interactive elements. You must:
1. Remove or fix problematic positive tabindex values
2. Arrange elements in source order that matches logical flow
3. Use tabindex='-1' for elements that shouldn't receive focus
4. Implement proper focus management for dynamic content`,
    guidelines: [
      "Avoid positive tabindex values (use 0 or -1)",
      "Arrange source order to match visual/logical order",
      "Manage focus when content changes dynamically",
      "Test tab order without CSS styling"
    ]
  },

  // WCAG 2.4.4 - Link Purpose (In Context)
  "2.4.4": {
    prompt: `Make link purposes clear from link text or context. You must:
1. Replace generic link text ('click here', 'more') with descriptive text
2. Add context to ambiguous links using aria-label or surrounding text
3. Make link text unique when links go to different destinations
4. Provide additional context for links that aren't self-explanatory`,
    guidelines: [
      "Use descriptive link text that makes sense out of context",
      "Avoid 'click here', 'read more', 'more info'",
      "Include destination or function in link text",
      "Use aria-label for additional context when needed"
    ]
  },

  // WCAG 2.4.6 - Headings and Labels
  "2.4.6": {
    prompt: `Provide descriptive headings and labels. You must:
1. Add clear, descriptive headings that outline content structure
2. Provide informative labels for form controls
3. Ensure headings describe the content that follows
4. Make labels descriptive of the input's purpose`,
    guidelines: [
      "Use headings to create content outline",
      "Make headings descriptive of section content",
      "Provide clear labels for all form inputs",
      "Use fieldset/legend for grouped form controls"
    ]
  },

  // WCAG 2.4.7 - Focus Visible
  "2.4.7": {
    prompt: `Ensure keyboard focus is always visible. You must:
1. Add visible focus indicators for all interactive elements
2. Use CSS :focus styles that are clearly visible
3. Ensure focus indicators have sufficient contrast
4. Don't remove default focus styles without providing alternatives`,
    guidelines: [
      "Use outline or border for focus indicators",
      "Ensure focus indicators are clearly visible",
      "Don't use outline: none without replacement",
      "Test focus visibility in different browsers"
    ]
  },

  // WCAG 3.1.1 - Language of Page
  "3.1.1": {
    prompt: `Specify the language of the page. You must:
1. Add lang attribute to the html element
2. Use appropriate language codes (e.g., 'en', 'es', 'fr')
3. Ensure the language code matches the primary language of the content`,
    guidelines: [
      "Use two-letter ISO language codes",
      "Add lang attribute to <html> element",
      "Use lang='en' for English content",
      "Consider regional variants (en-US, en-GB) when appropriate"
    ]
  },

  // WCAG 3.1.2 - Language of Parts
  "3.1.2": {
    prompt: `Identify language changes within the content. You must:
1. Add lang attributes to elements containing foreign language text
2. Use appropriate language codes for different languages
3. Only mark substantial foreign language content`,
    guidelines: [
      "Use lang attribute on elements with foreign text",
      "Don't mark proper names or technical terms",
      "Mark phrases or sentences in different languages",
      "Use appropriate language codes for each language"
    ]
  },

  // WCAG 3.2.1 - On Focus
  "3.2.1": {
    prompt: `Prevent unexpected context changes when elements receive focus. You must:
1. Remove or modify focus events that cause page navigation or major changes
2. Ensure focus events only provide feedback, not navigation
3. Use click or activation events for navigation instead of focus`,
    guidelines: [
      "Don't navigate away from page on focus events",
      "Don't auto-submit forms when fields receive focus",
      "Use visual feedback only for focus events",
      "Require explicit activation for major changes"
    ]
  },

  // WCAG 3.2.2 - On Input
  "3.2.2": {
    prompt: `Prevent unexpected context changes when form controls change. You must:
1. Remove auto-submit functionality from form controls
2. Provide explicit submit buttons for forms
3. Don't navigate or refresh page when users change form values
4. Provide clear indication when input will cause changes`,
    guidelines: [
      "Don't auto-submit forms when values change",
      "Provide submit buttons for form submission",
      "Don't refresh page content automatically",
      "Warn users before automatic changes occur"
    ]
  },

  // WCAG 3.3.1 - Error Identification
  "3.3.1": {
    prompt: `Clearly identify and describe input errors. You must:
1. Provide clear error messages for invalid inputs
2. Associate error messages with their corresponding form controls
3. Use text to describe errors, not just color or icons
4. Make error messages specific and helpful`,
    guidelines: [
      "Use aria-describedby to associate errors with inputs",
      "Provide specific error messages, not just 'invalid'",
      "Don't rely only on color to indicate errors",
      "Place error messages near their associated controls"
    ]
  },

  // WCAG 3.3.2 - Labels or Instructions
  "3.3.2": {
    prompt: `Provide labels or instructions for user input. You must:
1. Add labels to all form inputs using label elements or aria-label
2. Provide instructions for required fields or specific formats
3. Group related form controls with fieldset and legend
4. Indicate required fields clearly`,
    guidelines: [
      "Use <label> elements associated with form controls",
      "Provide format instructions (e.g., 'MM/DD/YYYY')",
      "Mark required fields with asterisks or 'required' text",
      "Use fieldset/legend for grouped controls"
    ]
  },

  // WCAG 4.1.2 - Name, Role, Value
  "4.1.2": {
    prompt: `Ensure UI components have accessible names, roles, and values. You must:
1. Provide accessible names for custom controls using aria-label or aria-labelledby
2. Define roles for custom UI components using ARIA
3. Expose states and properties of interactive elements
4. Ensure custom controls work with assistive technologies`,
    guidelines: [
      "Use semantic HTML elements when possible",
      "Add ARIA labels to custom controls",
      "Use appropriate ARIA roles for custom widgets",
      "Expose states like expanded, selected, checked"
    ]
  },

  // WCAG 4.1.3 - Status Messages
  "4.1.3": {
    prompt: `Ensure status messages are announced to assistive technologies. You must:
1. Use aria-live regions for dynamic status messages
2. Add role='status' or role='alert' for important messages
3. Ensure status updates are announced without moving focus
4. Provide appropriate live region politeness levels`,
    guidelines: [
      "Use aria-live='polite' for non-urgent status messages",
      "Use aria-live='assertive' or role='alert' for urgent messages",
      "Use role='status' for completion messages",
      "Don't move focus to status messages"
    ]
  },

  // Generic handlers for issue types that don't have specific criteria
  "missing-alt": {
    prompt: `Fix missing alt attributes on images. Add appropriate alt text that describes the content or function of each image. Use empty alt='' for decorative images.`,
    guidelines: [
      "Describe the content and function of informative images",
      "Use empty alt='' for purely decorative images",
      "Keep alt text concise but descriptive",
      "Don't start with 'image of' or 'picture of'"
    ]
  },

  "missing-label": {
    prompt: `Add labels to form controls. Associate each form input with a descriptive label using label elements or aria-label attributes.`,
    guidelines: [
      "Use <label> elements with 'for' attributes",
      "Or wrap inputs with label elements",
      "Use aria-label for inputs without visible labels",
      "Make labels descriptive and clear"
    ]
  },

  "missing-heading": {
    prompt: `Add proper heading structure to the page. Use h1-h6 elements to create a logical document outline.`,
    guidelines: [
      "Use only one h1 per page",
      "Don't skip heading levels",
      "Make headings descriptive of content",
      "Create a logical hierarchy"
    ]
  },

  "color-contrast": {
    prompt: `Fix color contrast issues by adjusting foreground or background colors to meet WCAG standards.`,
    guidelines: [
      "Ensure 4.5:1 contrast for normal text",
      "Ensure 3:1 contrast for large text",
      "Use darker text or lighter backgrounds",
      "Test with color contrast analyzers"
    ]
  },

  "keyboard-access": {
    prompt: `Make interactive elements keyboard accessible by adding appropriate keyboard event handlers and ensuring proper focus management.`,
    guidelines: [
      "Add keyboard event handlers alongside mouse events",
      "Ensure all interactive elements are focusable",
      "Provide visible focus indicators",
      "Implement logical tab order"
    ]
  }
};

// Utility functions for the remediation prompts
const remediationUtils = {
  getInstructions: (issueType) => {
    // Try exact match first
    if (remediationPrompts[issueType]) {
      return remediationPrompts[issueType];
    }

    // Try partial matches for common patterns
    const patterns = {
      'alt': 'missing-alt',
      'label': 'missing-label',
      'heading': 'missing-heading',
      'contrast': 'color-contrast',
      'keyboard': 'keyboard-access'
    };

    for (const [pattern, key] of Object.entries(patterns)) {
      if (issueType.toLowerCase().includes(pattern)) {
        return remediationPrompts[key];
      }
    }

    // Fallback to generic instructions
    return {
      prompt: `Fix the accessibility issue described in the problem statement. Follow WCAG guidelines and best practices to resolve the identified problems.`,
      guidelines: [
        "Use semantic HTML elements appropriately",
        "Ensure keyboard accessibility",
        "Provide alternative text for images",
        "Use proper color contrast",
        "Follow WCAG 2.1 AA guidelines"
      ]
    };
  },

  getAllCriteria: () => {
    return Object.keys(remediationPrompts).filter(key => key.match(/^\d+\.\d+\.\d+$/));
  },

  getCriteriaByLevel: (level) => {
    // This would need to cross-reference with the WCAG criteria database
    return Object.keys(remediationPrompts).filter(key => {
      return key.match(/^\d+\.\d+\.\d+$/);
    });
  },

  validatePrompt: (prompt) => {
    return prompt && 
           typeof prompt.prompt === 'string' && 
           Array.isArray(prompt.guidelines) &&
           prompt.prompt.length > 0 &&
           prompt.guidelines.length > 0;
  }
};

module.exports = {
  ...remediationUtils,
  prompts: remediationPrompts
};