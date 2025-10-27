// Complete WCAG 2.0, 2.1, and 2.2 Success Criteria Database

const wcagCriteria = {
  "1.1": {
    title: "Text Alternatives",
    description: "Provide text alternatives for any non-text content",
    criteria: {
      "1.1.1": {
        title: "Non-text Content",
        level: "A",
        version: "2.0",
        description: "All non-text content that is presented to the user has a text alternative that serves the equivalent purpose",
        guidelines: [
          "Images, image buttons, and image map hot spots have appropriate, equivalent alternative text",
          "Images that do not convey content are given empty alternative text (alt=\"\")",
          "Complex images have descriptive alternatives provided in context or on a separate linked page",
          "Form buttons have a descriptive value",
          "Inputs have associated accessible names",
          "Embedded multimedia is identified via accessible text",
          "Frames and iframes are appropriately titled"
        ]
      }
    }
  },
  "1.2": {
    title: "Time-based Media",
    description: "Provide alternatives for time-based media",
    criteria: {
      "1.2.1": {
        title: "Audio-only and Video-only (Prerecorded)",
        level: "A",
        version: "2.0",
        description: "For prerecorded audio-only and prerecorded video-only media",
        guidelines: [
          "A descriptive transcript of relevant content is provided for non-live audio-only",
          "A descriptive transcript or audio description is provided for non-live video-only"
        ]
      },
      "1.2.2": {
        title: "Captions (Prerecorded)",
        level: "A",
        version: "2.0",
        description: "Captions are provided for all prerecorded audio content in synchronized media",
        guidelines: [
          "Synchronized captions are provided for non-live video"
        ]
      },
      "1.2.3": {
        title: "Audio Description or Media Alternative (Prerecorded)",
        level: "A",
        version: "2.0",
        description: "An alternative for time-based media or audio description is provided",
        guidelines: [
          "A descriptive transcript or audio description is provided for non-live video"
        ]
      },
      "1.2.4": {
        title: "Captions (Live)",
        level: "AA",
        version: "2.0",
        description: "Captions are provided for all live audio content in synchronized media",
        guidelines: [
          "Synchronized captions are provided for live media that contains audio"
        ]
      },
      "1.2.5": {
        title: "Audio Description (Prerecorded)",
        level: "AA",
        version: "2.0",
        description: "Audio description is provided for all prerecorded video content",
        guidelines: [
          "Audio descriptions are provided for non-live video"
        ]
      },
      "1.2.6": {
        title: "Sign Language (Prerecorded)",
        level: "AAA",
        version: "2.0",
        description: "Sign language interpretation is provided for all prerecorded audio content",
        guidelines: [
          "Sign language interpretation is provided for prerecorded audio content"
        ]
      },
      "1.2.7": {
        title: "Extended Audio Description (Prerecorded)",
        level: "AAA",
        version: "2.0",
        description: "Where pauses in foreground audio are insufficient for audio descriptions",
        guidelines: [
          "Extended audio description is provided for prerecorded video content"
        ]
      },
      "1.2.8": {
        title: "Media Alternative (Prerecorded)",
        level: "AAA",
        version: "2.0",
        description: "An alternative for time-based media is provided for all prerecorded synchronized media",
        guidelines: [
          "A full text alternative is provided for prerecorded synchronized media"
        ]
      },
      "1.2.9": {
        title: "Audio-only (Live)",
        level: "AAA",
        version: "2.0",
        description: "An alternative for time-based media is provided for live audio-only content",
        guidelines: [
          "A descriptive text alternative is provided for live audio-only content"
        ]
      }
    }
  },
  "1.3": {
    title: "Adaptable",
    description: "Create content that can be presented in different ways without losing information or structure",
    criteria: {
      "1.3.1": {
        title: "Info and Relationships",
        level: "A",
        version: "2.0",
        description: "Information, structure, and relationships conveyed through presentation can be programmatically determined",
        guidelines: [
          "Semantic markup is appropriately used to designate headings, regions/landmarks, lists, emphasized text",
          "Tables are used for tabular data and data cells are associated with their headers",
          "Text labels are associated with form inputs",
          "Related form controls are grouped with fieldset/legend"
        ]
      },
      "1.3.2": {
        title: "Meaningful Sequence",
        level: "A",
        version: "2.0",
        description: "When the sequence in which content is presented affects its meaning, a correct reading sequence can be programmatically determined",
        guidelines: [
          "The reading and navigation order is logical and intuitive"
        ]
      },
      "1.3.3": {
        title: "Sensory Characteristics",
        level: "A",
        version: "2.0",
        description: "Instructions provided for understanding and operating content do not rely solely on sensory characteristics",
        guidelines: [
          "Instructions do not rely upon shape, size, or visual location",
          "Instructions do not rely upon sound"
        ]
      },
      "1.3.4": {
        title: "Orientation",
        level: "AA",
        version: "2.1",
        description: "Content does not restrict its view and operation to a single display orientation",
        guidelines: [
          "Orientation of web content is not restricted to only portrait or landscape"
        ]
      },
      "1.3.5": {
        title: "Identify Input Purpose",
        level: "AA",
        version: "2.1",
        description: "The purpose of each input field collecting information about the user can be programmatically determined",
        guidelines: [
          "Input fields that collect user information have appropriate autocomplete attributes"
        ]
      },
      "1.3.6": {
        title: "Identify Purpose",
        level: "AAA",
        version: "2.1",
        description: "In content implemented using markup languages, the purpose of user interface components can be programmatically determined",
        guidelines: [
          "The purpose of UI components, icons, and regions can be programmatically determined"
        ]
      }
    }
  },
  "1.4": {
    title: "Distinguishable",
    description: "Make it easier for users to see and hear content including separating foreground from background",
    criteria: {
      "1.4.1": {
        title: "Use of Color",
        level: "A",
        version: "2.0",
        description: "Color is not used as the only visual means of conveying information",
        guidelines: [
          "Color is not used as the sole method of conveying content or distinguishing visual elements",
          "Color alone is not used to distinguish links from surrounding text"
        ]
      },
      "1.4.2": {
        title: "Audio Control",
        level: "A",
        version: "2.0",
        description: "If any audio on a Web page plays automatically for more than 3 seconds, either a mechanism is available to pause or stop the audio",
        guidelines: [
          "A mechanism is provided to stop, pause, mute, or adjust volume for audio that automatically plays"
        ]
      },
      "1.4.3": {
        title: "Contrast (Minimum)",
        level: "AA",
        version: "2.0",
        description: "The visual presentation of text and images of text has a contrast ratio of at least 4.5:1",
        guidelines: [
          "Text and images of text have a contrast ratio of at least 4.5:1",
          "Large text has a contrast ratio of at least 3:1"
        ]
      },
      "1.4.4": {
        title: "Resize text",
        level: "AA",
        version: "2.0",
        description: "Except for captions and images of text, text can be resized without assistive technology up to 200 percent",
        guidelines: [
          "The page is readable and functional when zoomed to 200%"
        ]
      },
      "1.4.5": {
        title: "Images of Text",
        level: "AA",
        version: "2.0",
        description: "If the technologies being used can achieve the visual presentation, text is used to convey information",
        guidelines: [
          "If the same visual presentation can be made using text alone, an image is not used to present that text"
        ]
      },
      "1.4.6": {
        title: "Contrast (Enhanced)",
        level: "AAA",
        version: "2.0",
        description: "The visual presentation of text and images of text has a contrast ratio of at least 7:1",
        guidelines: [
          "Text and images of text have a contrast ratio of at least 7:1",
          "Large text has a contrast ratio of at least 4.5:1"
        ]
      },
      "1.4.7": {
        title: "Low or No Background Audio",
        level: "AAA",
        version: "2.0",
        description: "For prerecorded audio-only content that is primarily speech in the foreground",
        guidelines: [
          "Background audio is at least 20 decibels lower than foreground speech content"
        ]
      },
      "1.4.8": {
        title: "Visual Presentation",
        level: "AAA",
        version: "2.0",
        description: "For the visual presentation of blocks of text, a mechanism is available to achieve specific visual presentation",
        guidelines: [
          "Foreground and background colors can be selected by the user",
          "Width is no more than 80 characters or glyphs",
          "Text is not justified",
          "Line spacing is at least space-and-a-half within paragraphs"
        ]
      },
      "1.4.9": {
        title: "Images of Text (No Exception)",
        level: "AAA",
        version: "2.0",
        description: "Images of text are only used for pure decoration or where a particular presentation of text is essential",
        guidelines: [
          "Images of text are only used for decoration or when text presentation is essential"
        ]
      },
      "1.4.10": {
        title: "Reflow",
        level: "AA",
        version: "2.1",
        description: "Content can be presented without loss of information or functionality, and without requiring scrolling in two dimensions",
        guidelines: [
          "No loss of content or functionality occurs when content is presented at a width of 320 pixels"
        ]
      },
      "1.4.11": {
        title: "Non-text Contrast",
        level: "AA",
        version: "2.1",
        description: "The visual presentation of user interface components and graphical objects have a contrast ratio of at least 3:1",
        guidelines: [
          "A contrast ratio of at least 3:1 is present for differentiating graphical objects",
          "At least 3:1 contrast is maintained in the various states of interactive components"
        ]
      },
      "1.4.12": {
        title: "Text Spacing",
        level: "AA",
        version: "2.1",
        description: "No loss of content or functionality occurs by setting spacing properties",
        guidelines: [
          "No loss of content when paragraph spacing is set to 2 times the font size",
          "No loss when line height is set to 1.5 times the font size"
        ]
      },
      "1.4.13": {
        title: "Content on Hover or Focus",
        level: "AA",
        version: "2.1",
        description: "Where receiving and then removing pointer hover or keyboard focus triggers additional content to become visible and then hidden",
        guidelines: [
          "The newly revealed content can be dismissed without moving the pointer or keyboard focus",
          "The pointer can be moved to the new content without the content disappearing"
        ]
      }
    }
  },
  "2.1": {
    title: "Keyboard Accessible",
    description: "Make all functionality available from a keyboard",
    criteria: {
      "2.1.1": {
        title: "Keyboard",
        level: "A",
        version: "2.0",
        description: "All functionality of the content is operable through a keyboard interface",
        guidelines: [
          "All page functionality is available using the keyboard",
          "Page-specified shortcut keys do not conflict with existing browser shortcuts"
        ]
      },
      "2.1.2": {
        title: "No Keyboard Trap",
        level: "A",
        version: "2.0",
        description: "If keyboard focus can be moved to a component of the page using a keyboard interface, then focus can be moved away from that component",
        guidelines: [
          "Keyboard focus is never locked or trapped at one particular page element"
        ]
      },
      "2.1.3": {
        title: "Keyboard (No Exception)",
        level: "AAA",
        version: "2.0",
        description: "All functionality of the content is operable through a keyboard interface without exception",
        guidelines: [
          "All functionality is available via keyboard without exception for timing of individual keystrokes"
        ]
      },
      "2.1.4": {
        title: "Character Key Shortcuts",
        level: "A",
        version: "2.1",
        description: "If a keyboard shortcut is implemented in content using only letter, punctuation, number, or symbol characters",
        guidelines: [
          "If a keyboard shortcut uses printable character keys, the user must be able to disable or change it"
        ]
      }
    }
  },
  "2.2": {
    title: "Enough Time",
    description: "Provide users enough time to read and use content",
    criteria: {
      "2.2.1": {
        title: "Timing Adjustable",
        level: "A",
        version: "2.0",
        description: "For each time limit that is set by the content, the user is able to turn off, adjust, or extend that time limit",
        guidelines: [
          "If a page has a time limit, the user is given options to turn off, adjust, or extend that time limit"
        ]
      },
      "2.2.2": {
        title: "Pause, Stop, Hide",
        level: "A",
        version: "2.0",
        description: "For moving, blinking, scrolling, or auto-updating information",
        guidelines: [
          "Automatically moving, blinking, or scrolling content that lasts longer than 5 seconds can be paused, stopped, or hidden",
          "Automatically updating content can be paused, stopped, or hidden by the user"
        ]
      },
      "2.2.3": {
        title: "No Timing",
        level: "AAA",
        version: "2.0",
        description: "Timing is not an essential part of the event or activity presented by the content",
        guidelines: [
          "Content does not have any time limits except for real-time events"
        ]
      },
      "2.2.4": {
        title: "Interruptions",
        level: "AAA",
        version: "2.0",
        description: "Interruptions can be postponed or suppressed by the user",
        guidelines: [
          "Users can control interruptions except for emergencies"
        ]
      },
      "2.2.5": {
        title: "Re-authenticating",
        level: "AAA",
        version: "2.0",
        description: "When an authenticated session expires, the user can continue the activity without loss of data",
        guidelines: [
          "Users can re-authenticate without losing data after session expiration"
        ]
      },
      "2.2.6": {
        title: "Timeouts",
        level: "AAA",
        version: "2.1",
        description: "Users are warned of the duration of any user inactivity that could cause data loss",
        guidelines: [
          "Users are warned about timeouts that could result in data loss"
        ]
      }
    }
  },
  "2.3": {
    title: "Seizures and Physical Reactions",
    description: "Do not design content in a way that is known to cause seizures or physical reactions",
    criteria: {
      "2.3.1": {
        title: "Three Flashes or Below Threshold",
        level: "A",
        version: "2.0",
        description: "Web pages do not contain anything that flashes more than three times in any one second period",
        guidelines: [
          "No page content flashes more than 3 times per second"
        ]
      },
      "2.3.2": {
        title: "Three Flashes",
        level: "AAA",
        version: "2.0",
        description: "Web pages do not contain anything that flashes more than three times in any one second period",
        guidelines: [
          "No content flashes more than 3 times per second"
        ]
      },
      "2.3.3": {
        title: "Animation from Interactions",
        level: "AAA",
        version: "2.1",
        description: "Motion animation triggered by interaction can be disabled",
        guidelines: [
          "Users can disable motion animation triggered by user interaction"
        ]
      }
    }
  },
  "2.4": {
    title: "Navigable",
    description: "Provide ways to help users navigate, find content, and determine where they are",
    criteria: {
      "2.4.1": {
        title: "Bypass Blocks",
        level: "A",
        version: "2.0",
        description: "A mechanism is available to bypass blocks of content that are repeated on multiple Web pages",
        guidelines: [
          "A link is provided to skip navigation and other page elements that are repeated across web pages"
        ]
      },
      "2.4.2": {
        title: "Page Titled",
        level: "A",
        version: "2.0",
        description: "Web pages have titles that describe topic or purpose",
        guidelines: [
          "The web page has a descriptive and informative page title"
        ]
      },
      "2.4.3": {
        title: "Focus Order",
        level: "A",
        version: "2.0",
        description: "If a Web page can be navigated sequentially and the navigation sequences affect meaning or operation",
        guidelines: [
          "The navigation order of links, form controls, etc. is logical and intuitive"
        ]
      },
      "2.4.4": {
        title: "Link Purpose (In Context)",
        level: "A",
        version: "2.0",
        description: "The purpose of each link can be determined from the link text alone or from the link text together with its programmatically determined link context",
        guidelines: [
          "The purpose of each link can be determined from the link text alone, or from the link text and its context",
          "Links with the same text that go to different locations are readily distinguishable"
        ]
      },
      "2.4.5": {
        title: "Multiple Ways",
        level: "AA",
        version: "2.0",
        description: "More than one way is available to locate a Web page within a set of Web pages",
        guidelines: [
          "Multiple ways are available to find other web pages on the site"
        ]
      },
      "2.4.6": {
        title: "Headings and Labels",
        level: "AA",
        version: "2.0",
        description: "Headings and labels describe topic or purpose",
        guidelines: [
          "Page headings and labels for form and interactive controls are informative"
        ]
      },
      "2.4.7": {
        title: "Focus Visible",
        level: "AA",
        version: "2.0",
        description: "Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible",
        guidelines: [
          "There is a visible indicator for page elements when they receive keyboard focus"
        ]
      },
      "2.4.8": {
        title: "Location",
        level: "AAA",
        version: "2.0",
        description: "Information about the user's location within a set of Web pages is available",
        guidelines: [
          "Users can determine their location within a website"
        ]
      },
      "2.4.9": {
        title: "Link Purpose (Link Only)",
        level: "AAA",
        version: "2.0",
        description: "A mechanism is available to allow the purpose of each link to be identified from link text alone",
        guidelines: [
          "Each link's purpose can be determined from the link text alone"
        ]
      },
      "2.4.10": {
        title: "Section Headings",
        level: "AAA",
        version: "2.0",
        description: "Section headings are used to organize the content",
        guidelines: [
          "Headings are used to organize content into sections"
        ]
      },
      "2.4.11": {
        title: "Focus Not Obscured (Minimum)",
        level: "AA",
        version: "2.2",
        description: "When a user interface component receives keyboard focus, the component is not entirely hidden due to author-created content",
        guidelines: [
          "When elements have keyboard focus, they are not entirely covered or hidden by page content"
        ]
      },
      "2.4.12": {
        title: "Focus Not Obscured (Enhanced)",
        level: "AAA",
        version: "2.2",
        description: "When a user interface component receives keyboard focus, no part of the component is hidden by author-created content",
        guidelines: [
          "When elements have keyboard focus, no part is covered or hidden by page content"
        ]
      },
      "2.4.13": {
        title: "Focus Appearance",
        level: "AAA",
        version: "2.2",
        description: "When the keyboard focus indicator is visible, an area of the focus indicator meets certain requirements",
        guidelines: [
          "Focus indicators meet specific visual requirements for size and contrast"
        ]
      }
    }
  },
  "2.5": {
    title: "Input Modalities",
    description: "Make it easier for users to operate functionality through various inputs beyond keyboard",
    criteria: {
      "2.5.1": {
        title: "Pointer Gestures",
        level: "A",
        version: "2.1",
        description: "All functionality that uses multipoint or path-based gestures for operation can be operated with a single pointer",
        guidelines: [
          "If multipoint or path-based gestures are not essential, the functionality can be performed with a single point activation"
        ]
      },
      "2.5.2": {
        title: "Pointer Cancellation",
        level: "A",
        version: "2.1",
        description: "For functionality that can be operated using a single pointer, completion of the function is on the up-event",
        guidelines: [
          "To help avoid inadvertent activation, avoid non-essential down-event activation when clicking or tapping"
        ]
      },
      "2.5.3": {
        title: "Label in Name",
        level: "A",
        version: "2.1",
        description: "For user interface components with labels that include text or images of text, the name contains the text that is presented visually",
        guidelines: [
          "If an interface component presents text, the accessible name for that component must include the visible text"
        ]
      },
      "2.5.4": {
        title: "Motion Actuation",
        level: "A",
        version: "2.1",
        description: "Functionality that can be operated by device motion or user motion can also be operated by user interface components",
        guidelines: [
          "Functionality triggered by moving the device or by user movement can be disabled and equivalent functionality is provided"
        ]
      },
      "2.5.5": {
        title: "Target Size (Enhanced)",
        level: "AAA",
        version: "2.1",
        description: "The size of the target for pointer inputs is at least 44 by 44 CSS pixels",
        guidelines: [
          "Pointer input target sizes are at least 44 by 44 pixels"
        ]
      },
      "2.5.6": {
        title: "Concurrent Input Mechanisms",
        level: "AAA",
        version: "2.1",
        description: "Web content does not restrict use of input modalities available on a platform",
        guidelines: [
          "Users can switch between different input methods without restriction"
        ]
      },
      "2.5.7": {
        title: "Dragging Movements",
        level: "AA",
        version: "2.2",
        description: "All functionality that uses a dragging movement can be achieved by a single pointer without dragging",
        guidelines: [
          "Functionality that uses pointer dragging can also be achieved using a single pointer without dragging"
        ]
      },
      "2.5.8": {
        title: "Target Size (Minimum)",
        level: "AA",
        version: "2.2",
        description: "The size of the target for pointer inputs is at least 24 by 24 CSS pixels",
        guidelines: [
          "Pointer input target sizes are at least 24 by 24 pixels unless exceptions apply"
        ]
      }
    }
  },
  "3.1": {
    title: "Readable",
    description: "Make text content readable and understandable",
    criteria: {
      "3.1.1": {
        title: "Language of Page",
        level: "A",
        version: "2.0",
        description: "The default human language of each Web page can be programmatically determined",
        guidelines: [
          "The language of the page is identified using the lang attribute"
        ]
      },
      "3.1.2": {
        title: "Language of Parts",
        level: "AA",
        version: "2.0",
        description: "The human language of each passage or phrase in the content can be programmatically determined",
        guidelines: [
          "The language of page content that is in a different language is identified using the lang attribute"
        ]
      },
      "3.1.3": {
        title: "Unusual Words",
        level: "AAA",
        version: "2.0",
        description: "A mechanism is available for identifying specific definitions of words or phrases used in an unusual or restricted way",
        guidelines: [
          "Definitions are available for words used in unusual or restricted ways"
        ]
      },
      "3.1.4": {
        title: "Abbreviations",
        level: "AAA",
        version: "2.0",
        description: "A mechanism for identifying the expanded form or meaning of abbreviations is available",
        guidelines: [
          "Expanded forms or meanings of abbreviations are available"
        ]
      },
      "3.1.5": {
        title: "Reading Level",
        level: "AAA",
        version: "2.0",
        description: "When text requires reading ability more advanced than the lower secondary education level",
        guidelines: [
          "Supplemental content or alternative versions are available for content requiring advanced reading skills"
        ]
      },
      "3.1.6": {
        title: "Pronunciation",
        level: "AAA",
        version: "2.0",
        description: "A mechanism is available for identifying specific pronunciation of words where meaning of the words is ambiguous",
        guidelines: [
          "Pronunciation information is available for words where pronunciation affects meaning"
        ]
      }
    }
  },
  "3.2": {
    title: "Predictable",
    description: "Make Web pages appear and operate in predictable ways",
    criteria: {
      "3.2.1": {
        title: "On Focus",
        level: "A",
        version: "2.0",
        description: "When any user interface component receives focus, it does not initiate a change of context",
        guidelines: [
          "When a page element receives focus, it does not result in a substantial change to the page"
        ]
      },
      "3.2.2": {
        title: "On Input",
        level: "A",
        version: "2.0",
        description: "Changing the setting of any user interface component does not automatically cause a change of context",
        guidelines: [
          "When a user inputs information or interacts with a control, it does not result in substantial changes"
        ]
      },
      "3.2.3": {
        title: "Consistent Navigation",
        level: "AA",
        version: "2.0",
        description: "Navigational mechanisms that are repeated on multiple Web pages within a set of Web pages occur in the same relative order each time they are repeated",
        guidelines: [
          "Navigation links that are repeated on web pages do not change order when navigating through the site"
        ]
      },
      "3.2.4": {
        title: "Consistent Identification",
        level: "AA",
        version: "2.0",
        description: "Components that have the same functionality within a set of Web pages are identified consistently",
        guidelines: [
          "Elements that have the same functionality across multiple web pages are consistently identified"
        ]
      },
      "3.2.5": {
        title: "Change on Request",
        level: "AAA",
        version: "2.0",
        description: "Changes of context are initiated only by user request or a mechanism is available to turn off such changes",
        guidelines: [
          "Context changes only occur when requested by the user or can be turned off"
        ]
      },
      "3.2.6": {
        title: "Consistent Help",
        level: "A",
        version: "2.2",
        description: "If a Web page contains any of the following help mechanisms, and those mechanisms are repeated on multiple Web pages within a set of Web pages, they occur in the same relative order",
        guidelines: [
          "Contact and self-help details are presented consistently when present on multiple web pages"
        ]
      }
    }
  },
  "3.3": {
    title: "Input Assistance",
    description: "Help users avoid and correct mistakes",
    criteria: {
      "3.3.1": {
        title: "Error Identification",
        level: "A",
        version: "2.0",
        description: "If an input error is automatically detected, the item that is in error is identified and the error is described to the user in text",
        guidelines: [
          "Required inputs or inputs that require a specific format provide this information within the element's label",
          "Form validation errors are efficient, intuitive, and accessible"
        ]
      },
      "3.3.2": {
        title: "Labels or Instructions",
        level: "A",
        version: "2.0",
        description: "Labels or instructions are provided when content requires user input",
        guidelines: [
          "Inputs are identified by labels or instructions that help users know what information to enter"
        ]
      },
      "3.3.3": {
        title: "Error Suggestion",
        level: "AA",
        version: "2.0",
        description: "If an input error is automatically detected and suggestions for correction are known, then the suggestions are provided to the user",
        guidelines: [
          "If an input error is detected, suggestions are provided for fixing the input in a timely and accessible manner"
        ]
      },
      "3.3.4": {
        title: "Error Prevention (Legal, Financial, Data)",
        level: "AA",
        version: "2.0",
        description: "For Web pages that cause legal commitments or financial transactions for the user to occur, that modify or delete user-controllable data",
        guidelines: [
          "Submissions, changes, and deletions of legal, financial, or test data can be reversed, verified, or confirmed"
        ]
      },
      "3.3.5": {
        title: "Help",
        level: "AAA",
        version: "2.0",
        description: "Context-sensitive help is available",
        guidelines: [
          "Context-sensitive help is available for form inputs"
        ]
      },
      "3.3.6": {
        title: "Error Prevention (All)",
        level: "AAA",
        version: "2.0",
        description: "For Web pages that require the user to submit information, submission is reversible, verified, or confirmed",
        guidelines: [
          "All form submissions can be reversed, verified, or confirmed"
        ]
      },
      "3.3.7": {
        title: "Redundant Entry",
        level: "A",
        version: "2.2",
        description: "Information previously entered by or provided to the user that is required to be entered again in the same process is either auto-populated, or available for the user to select",
        guidelines: [
          "Information that a user must re-enter is auto-populated or available for selection"
        ]
      },
      "3.3.8": {
        title: "Accessible Authentication (Minimum)",
        level: "AA",
        version: "2.2",
        description: "A cognitive function test is not required for any step in an authentication process",
        guidelines: [
          "A cognitive function test is not required unless it can be bypassed or completed with assistance"
        ]
      },
      "3.3.9": {
        title: "Accessible Authentication (Enhanced)",
        level: "AAA",
        version: "2.2",
        description: "A cognitive function test is not required for any step in an authentication process",
        guidelines: [
          "Authentication processes do not require cognitive function tests"
        ]
      }
    }
  },
  "4.1": {
    title: "Compatible",
    description: "Maximize compatibility with current and future user agents, including assistive technologies",
    criteria: {
      "4.1.1": {
        title: "Parsing",
        level: "A",
        version: "2.0",
        description: "In content implemented using markup languages, elements have complete start and end tags",
        guidelines: [
          "HTML markup is valid and elements are properly nested"
        ]
      },
      "4.1.2": {
        title: "Name, Role, Value",
        level: "A",
        version: "2.0",
        description: "For all user interface components, the name and role can be programmatically determined",
        guidelines: [
          "Markup is used in a way that facilitates accessibility",
          "ARIA is used appropriately to enhance accessibility when HTML is not sufficient"
        ]
      },
      "4.1.3": {
        title: "Status Messages",
        level: "AA",
        version: "2.1",
        description: "In content implemented using markup languages, status messages can be programmatically determined through role or properties",
        guidelines: [
          "If an important status message is presented and focus is not set to that message, the message must be announced to screen reader users"
        ]
      }
    }
  }
};

module.exports = wcagCriteria;