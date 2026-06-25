// Web Audio Synth Engine for interactive sound effects
let audioCtx = null;
let soundEnabled = true;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

window.toggleSound = function() {
  soundEnabled = !soundEnabled;
  const btn = document.getElementById("btn-sound-toggle");
  if (btn) {
    if (soundEnabled) {
      btn.textContent = "🔊 Sound On";
      btn.style.color = "var(--primary-cyan)";
      btn.style.borderColor = "var(--primary-cyan)";
    } else {
      btn.textContent = "🔇 Sound Off";
      btn.style.color = "var(--text-muted)";
      btn.style.borderColor = "var(--border-color)";
    }
  }
};

function playTone(freq, type, duration, volume, slideToFreq = null) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    if (slideToFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(slideToFreq, ctx.currentTime + duration);
    }
    
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn("Audio play blocked/failed", e);
  }
}

// Predefined synthesized sounds (maximized volume for extreme amplification)
window.sounds = {
  playTick: () => playTone(1200, 'sine', 0.04, 0.9),
  playPop: () => playTone(250, 'triangle', 0.08, 1.0, 450),
  playClean: () => playTone(600, 'triangle', 0.15, 0.9, 150),
  playSlide: () => playTone(400, 'sine', 0.25, 0.9, 200),
  playChime: () => {
    if (!soundEnabled) return;
    playTone(523.25, 'sine', 0.1, 1.0); // C5
    setTimeout(() => playTone(659.25, 'sine', 0.25, 1.0), 80); // E5
  },
  playHighlight: () => playTone(350, 'sine', 0.15, 0.9, 750),
  playNotification: () => {
    if (!soundEnabled) return;
    playTone(880, 'sine', 0.08, 1.0); // A5
    setTimeout(() => playTone(880, 'sine', 0.08, 1.0), 120);
  }
};

// State Machine for the NLP Educational Web App
const appState = {
  currentStep: 0, // 0 to 9 representing Screen 1 to Screen 10
  userMessage: "Hi, I want to join the event tomorrow.",
  nlpResult: null,
  animationIntervals: [],
  presenterNotesVisible: false
};

// Steps definition with basic metrics
const stepsConfig = [
  { label: "Intro", time: "About 10 min left" },
  { label: "1. Message", time: "About 9 min left" },
  { label: "2. Split Words", time: "About 8 min left" },
  { label: "3. Clean Text", time: "About 7 min left" },
  { label: "4. Numbers", time: "About 6 min left" },
  { label: "5. Intent", time: "About 4 min left" },
  { label: "6. Details", time: "About 3 min left" },
  { label: "7. Workflow", time: "About 2 min left" },
  { label: "8. Reply", time: "About 1 min left" },
  { label: "Traditional vs LLM", time: "Nearly finished!" }
];

// Seed word database for token mapping and embedding simulation
const wordDictionary = {
  "hi": { embed: [0.05, 0.12, 0.01], category: "Greeting" },
  "hello": { embed: [0.06, 0.14, 0.01], category: "Greeting" },
  "hey": { embed: [0.04, 0.11, 0.02], category: "Greeting" },
  "i": { embed: [0.01, 0.05, 0.02], category: "Pronoun" },
  "want": { embed: [0.10, 0.32, 0.15], category: "Verb" },
  "to": { embed: [0.02, 0.04, 0.01], category: "Preposition" },
  "join": { embed: [0.12, 0.84, 0.31], category: "Verb (Action: Join)" },
  "register": { embed: [0.15, 0.91, 0.28], category: "Verb (Action: Register)" },
  "attend": { embed: [0.11, 0.79, 0.30], category: "Verb (Action: Attend)" },
  "signup": { embed: [0.13, 0.82, 0.29], category: "Verb (Action: Signup)" },
  "sign": { embed: [0.08, 0.45, 0.20], category: "Verb" },
  "up": { embed: [0.02, 0.05, 0.01], category: "Preposition" },
  "the": { embed: [0.01, 0.03, 0.01], category: "Article" },
  "event": { embed: [0.45, 0.18, 0.92], category: "Noun (Topic: Event)" },
  "workshop": { embed: [0.48, 0.20, 0.88], category: "Noun (Topic: Workshop)" },
  "seminar": { embed: [0.46, 0.19, 0.90], category: "Noun (Topic: Seminar)" },
  "class": { embed: [0.42, 0.16, 0.95], category: "Noun (Topic: Class)" },
  "course": { embed: [0.44, 0.17, 0.93], category: "Noun (Topic: Course)" },
  "tomorrow": { embed: [0.85, 0.52, 0.11], category: "Noun (Date: Tomorrow)" },
  "today": { embed: [0.81, 0.50, 0.15], category: "Noun (Date: Today)" },
  "monday": { embed: [0.78, 0.48, 0.12], category: "Noun (Date: Monday)" },
  "tuesday": { embed: [0.78, 0.48, 0.13], category: "Noun (Date: Tuesday)" },
  "wednesday": { embed: [0.78, 0.48, 0.14], category: "Noun (Date: Wednesday)" },
  "thursday": { embed: [0.78, 0.48, 0.15], category: "Noun (Date: Thursday)" },
  "friday": { embed: [0.78, 0.48, 0.16], category: "Noun (Date: Friday)" },
  "saturday": { embed: [0.78, 0.48, 0.17], category: "Noun (Date: Saturday)" },
  "sunday": { embed: [0.78, 0.48, 0.18], category: "Noun (Date: Sunday)" },
  "cost": { embed: [0.23, 0.72, 0.54], category: "Noun (Price Indicator)" },
  "price": { embed: [0.25, 0.75, 0.51], category: "Noun (Price Indicator)" },
  "fee": { embed: [0.21, 0.70, 0.58], category: "Noun (Price Indicator)" },
  "ticket": { embed: [0.24, 0.73, 0.55], category: "Noun" },
  "pay": { embed: [0.22, 0.69, 0.50], category: "Verb" },
  "money": { embed: [0.26, 0.76, 0.52], category: "Noun" },
  "where": { embed: [0.61, 0.23, 0.74], category: "Adverb (Location Inquiry)" },
  "location": { embed: [0.63, 0.25, 0.71], category: "Noun (Location Info)" },
  "address": { embed: [0.65, 0.27, 0.69], category: "Noun (Location Info)" },
  "place": { embed: [0.58, 0.22, 0.72], category: "Noun" },
  "venue": { embed: [0.64, 0.26, 0.70], category: "Noun (Location Info)" }
};

// Helper to generate a deterministic pseudo-random embedding vector for unknown words
function getWordEmbedding(word) {
  const cleanWord = word.toLowerCase().trim();
  if (wordDictionary[cleanWord]) {
    return wordDictionary[cleanWord].embed;
  }
  // Simple hash function to generate consistent floats between 0 and 1
  let h1 = 0, h2 = 0, h3 = 0;
  for (let i = 0; i < cleanWord.length; i++) {
    const charCode = cleanWord.charCodeAt(i);
    h1 = (h1 * 31 + charCode) % 100;
    h2 = (h2 * 37 + charCode) % 100;
    h3 = (h3 * 41 + charCode) % 100;
  }
  return [
    Math.round((h1 / 100) * 100) / 100,
    Math.round((h2 / 100) * 100) / 100,
    Math.round((h3 / 100) * 100) / 100
  ];
}

// Perform NLP Analysis of the user message
function analyzeMessage(message) {
  // 1. Raw Character count
  const rawText = message;
  
  // 2. Tokenization: Split words
  // Match words, keeping punctuation separate or strip it. In standard NLP tokenization, we split punctuation as separate tokens.
  const regexTokens = message.match(/\w+|[^\w\s]+/g) || [];
  
  // 3. Cleaning: lowercase, remove punctuation, remove extra spaces
  // Create an array of operations for animation:
  const cleaningSteps = [];
  const lowercaseTokens = [];
  
  regexTokens.forEach(token => {
    const hasPunctuation = /^[^\w\s]+$/.test(token);
    const hasUppercase = /[A-Z]/.test(token);
    
    let clean = token.toLowerCase();
    let action = "keep";
    
    if (hasPunctuation) {
      action = "remove";
      clean = "";
    } else if (hasUppercase) {
      action = "lowercase";
    }
    
    cleaningSteps.push({
      original: token,
      clean: clean,
      action: action
    });
    
    if (clean) {
      lowercaseTokens.push(clean);
    }
  });
  
  const cleanedText = lowercaseTokens.join(" ");

  // 4. Words to Numbers: Vector representations and Keyword lookup
  const wordVectors = lowercaseTokens.map(word => {
    return {
      word: word,
      vector: getWordEmbedding(word)
    };
  });
  
  // Pattern table list (for Screen 5)
  const patternKeywords = ["register", "join", "attend", "event", "price", "location", "cost", "where"];
  const patternTable = patternKeywords.map(keyword => {
    const found = lowercaseTokens.includes(keyword);
    return {
      word: keyword,
      found: found ? "Yes" : "No"
    };
  });

  // 5. Intent Detection: Score intents based on keyword weights
  const registrationKeywords = ["join", "register", "attend", "signup", "sign", "inscribe", "participate", "entry"];
  const pricingKeywords = ["cost", "price", "fee", "pay", "money", "ticket", "charge", "cheap", "expensive"];
  const locationKeywords = ["where", "location", "address", "place", "venue", "directions", "map", "room", "building"];
  
  let regScore = 0;
  let prcScore = 0;
  let locScore = 0;
  
  lowercaseTokens.forEach(word => {
    if (registrationKeywords.includes(word)) regScore += 10;
    if (pricingKeywords.includes(word)) prcScore += 10;
    if (locationKeywords.includes(word)) locScore += 10;
  });
  
  // Default override for the standard message "Hi, I want to join the event tomorrow"
  let registrationPct = 35, pricingPct = 25, locationPct = 20, otherPct = 20;
  
  if (message.trim().toLowerCase() === "hi, i want to join the event tomorrow.") {
    registrationPct = 92;
    locationPct = 5; // categorized as Info
    pricingPct = 2;
    otherPct = 1;
  } else {
    // Dynamic calculation
    const total = regScore + prcScore + locScore + 5; // +5 for baseline other
    registrationPct = Math.round((regScore / total) * 90) + 5;
    pricingPct = Math.round((prcScore / total) * 90) + 2;
    locationPct = Math.round((locScore / total) * 90) + 2;
    otherPct = 100 - (registrationPct + pricingPct + locationPct);
    
    // Safety clamp
    if (otherPct < 1) {
      registrationPct -= (1 - otherPct);
      otherPct = 1;
    }
  }
  
  let winner = "Other";
  let maxScore = Math.max(registrationPct, pricingPct, locationPct, otherPct);
  if (maxScore === registrationPct) winner = "Registration";
  else if (maxScore === pricingPct) winner = "Pricing";
  else if (maxScore === locationPct) winner = "Location";
  
  // 6. Entity Extraction
  // Extract Topic entity (event, workshop, class, etc.)
  let extractedTopic = "Not specified";
  const topicWords = ["event", "workshop", "seminar", "class", "course", "meeting", "lecture"];
  for (let word of lowercaseTokens) {
    if (topicWords.includes(word)) {
      extractedTopic = word;
      break;
    }
  }
  
  // Extract Date entity (tomorrow, today, monday, etc.)
  let extractedDate = "Not specified";
  const dateWords = ["tomorrow", "today", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  for (let word of lowercaseTokens) {
    if (dateWords.includes(word)) {
      extractedDate = word;
      break;
    }
  }
  
  // 7. Workflow selection and Reply
  let workflowSteps = [];
  let botReply = "";
  
  if (winner === "Registration") {
    workflowSteps = [
      "Registration Request",
      "Ask for Full Name",
      "Ask for Email Address",
      "Save Registration",
      "Send Confirmation"
    ];
    botReply = `Great! I can help you register for the ${extractedTopic === "Not specified" ? "event" : extractedTopic}. Please send your full name and email address.`;
  } else if (winner === "Pricing") {
    workflowSteps = [
      "Pricing Request",
      "Check Database for Ticket Fees",
      "Retrieve Early Bird Discount Details",
      "Format Pricing Details",
      "Send Price Details"
    ];
    botReply = "The ticket price is $49. Early bird tickets are available for $29 until this Friday!";
  } else if (winner === "Location") {
    workflowSteps = [
      "Location Request",
      "Check Database for Venue Address",
      "Generate Map Directions Link",
      "Retrieve Parking/Transit info",
      "Send Location Details"
    ];
    botReply = "The workshop is being held at the Tech Innovation Center in Room 302. Map link: maps.google.com/center";
  } else {
    workflowSteps = [
      "Unrecognized Request",
      "Log Dialogue Details",
      "Select General Query Fallback",
      "Format Helpful Greeting",
      "Send Response"
    ];
    botReply = "Hmm, I didn't quite get that. Could you please specify if you'd like to register, check ticket pricing, or get the venue address?";
  }
  
  return {
    rawText,
    tokens: regexTokens,
    cleaningSteps,
    cleanedText,
    wordVectors,
    patternTable,
    intents: [
      { name: "Registration", score: registrationPct },
      { name: "Pricing", score: pricingPct },
      { name: "Location", score: locationPct },
      { name: "Other", score: otherPct }
    ],
    winner,
    entities: {
      topic: extractedTopic,
      date: extractedDate
    },
    workflowSteps,
    botReply
  };
}

// Clear all active simulation timers
function clearAllIntervals() {
  appState.animationIntervals.forEach(clearInterval);
  appState.animationIntervals = [];
}

// Initialise progress bar states
function updateProgressUI() {
  const barFill = document.getElementById("progress-bar-fill");
  const percentText = document.getElementById("progress-percent");
  const timeText = document.getElementById("time-left");
  
  // Total screens is 10 (index 0 to 9)
  // Calculate percentage
  const pct = Math.round((appState.currentStep / 9) * 100);
  barFill.style.width = `${pct}%`;
  percentText.textContent = `${pct}% Complete`;
  timeText.textContent = stepsConfig[appState.currentStep].time;
  
  // Update step nodes
  for (let i = 1; i <= 8; i++) {
    const node = document.getElementById(`step-node-${i}`);
    if (node) {
      node.classList.remove("active", "completed");
      if (appState.currentStep === i) {
        node.classList.add("active");
      } else if (appState.currentStep > i) {
        node.classList.add("completed");
      }
    }
  }
}

// Handle navigation buttons availability
function updateNavButtons() {
  const btnBack = document.getElementById("btn-back");
  const btnNext = document.getElementById("btn-next");
  const btnRestart = document.getElementById("btn-restart");
  
  // Back button
  btnBack.disabled = (appState.currentStep === 0);
  
  // Next button text
  if (appState.currentStep === 0) {
    btnNext.innerHTML = 'Find Out <span class="arrow">&rarr;</span>';
  } else if (appState.currentStep === 1) {
    btnNext.innerHTML = 'Show Me What Happens Next <span class="arrow">&rarr;</span>';
  } else if (appState.currentStep === 8) {
    btnNext.innerHTML = 'Compare This With an LLM <span class="arrow">&rarr;</span>';
  } else if (appState.currentStep === 9) {
    btnNext.innerHTML = 'Try Another Message <span class="arrow">&rarr;</span>';
  } else {
    btnNext.innerHTML = 'Continue <span class="arrow">&rarr;</span>';
  }
}

// Render dynamic content for the Explanation Panel
function renderExplanation() {
  const label = document.getElementById("step-num-label");
  const title = document.getElementById("step-title");
  const content = document.getElementById("explanation-content-area");
  
  const step = appState.currentStep;
  const nlp = appState.nlpResult;
  
  // Reset scroll position
  document.getElementById("explanation-scroll-container").scrollTop = 0;
  
  if (step === 0) {
    if (label) label.textContent = "Lesson Introduction";
    title.textContent = "Can a Computer Understand What You Mean?";
    content.innerHTML = `
      <div class="info-section">
        <p class="info-text">When you send a message to a chatbot, it does not understand it like a human being. It looks for patterns, predicts what you want, finds important details, and follows the right workflow.</p>
      </div>
      <div class="info-section">
        <span class="info-label">Your Message</span>
        <blockquote class="preset-message">"${appState.userMessage}"</blockquote>
      </div>
      <div class="info-section">
        <p class="intro-question">How does the chatbot know this person is asking to register?</p>
      </div>
    `;
    return;
  }
  
  // Structured information variables based on current step
  let heading = "";
  let doing = "";
  let technical = "";
  let analogy = "";
  let why = "";
  let skipped = "";
  let example = "";
  let takeaway = "";
  let presenterNotes = "";
  
  switch(step) {
    case 1: // Raw Message
      heading = "Step 1: The Chatbot Receives Your Message";
      doing = "The chatbot captures the text you sent, exactly as you typed it, and loads it into its memory.";
      technical = "The computer receives the message as a raw stream of characters (letters, numbers, spaces, and punctuation). At this point, it is just a sequence of text characters stored in computer memory — no meaning or structure has been analyzed yet.";
      analogy = "It's like someone dropping a letter into your mailbox. You have received the letter physically, but you haven't opened the envelope or read a single word yet.";
      why = "The chatbot needs to store the exact input from the user before it can run any algorithms on it. This raw message is the starting point for all processing.";
      skipped = "Without this step, the chatbot would have nothing to process. It is the absolute entry point of the entire pipeline.";
      example = `The chatbot captures your raw message: <strong>"${nlp.rawText}"</strong> consisting of ${nlp.rawText.length} characters (including letters, spaces, and punctuation).`;
      takeaway = "Receiving text is not the same as understanding text.";
      presenterNotes = "Explain to the workshop attendees that the chatbot doesn't have human sensory organs. A text box input is simply a data array of ASCII/Unicode characters to a CPU.";
      break;
      
    case 2: // Tokenization
      heading = "Step 2: It Breaks the Message Into Pieces";
      doing = "The chatbot chops the long sequence of characters into individual, manageable pieces (usually words).";
      technical = "This step is called <strong>Tokenization</strong>. The chatbot uses a set of rules (like splitting text wherever it sees a space or a punctuation mark) to slice the sentence into an array of smaller strings called <strong>tokens</strong>.";
      analogy = "Think of this like breaking a large Lego model down into its individual building blocks. Before you can build a new model or analyze the shapes, you need the individual pieces separated.";
      why = "A computer cannot easily understand a whole paragraph or sentence in one piece because there are infinite ways to combine words. Breaking it down lets the computer inspect individual words one at a time.";
      skipped = "Without Tokenization, the chatbot would have to look up the exact entire sentence in a database. If a user changed even one word or letter, the chatbot would fail because it couldn't analyze the separate parts.";
      example = `Your sentence is split into ${nlp.tokens.length} tokens: <br><div style="margin-top: 0.5rem; display: flex; gap: 0.4rem; flex-wrap: wrap;">${nlp.tokens.map(t => `<span style="background: rgba(6,182,212,0.1); border: 1px solid var(--border-color); padding: 0.1rem 0.4rem; border-radius: 4px; font-family: var(--font-display); font-size: 0.85rem;">${t}</span>`).join('')}</div>`;
      takeaway = "Tokenization slices raw text into bite-sized tokens (words) so they can be analyzed.";
      presenterNotes = "Emphasize that tokens are usually words, but punctuation marks like '.' or '?' are also treated as tokens because they can indicate the end of a thought or a question.";
      break;
      
    case 3: // Text Cleaning
      heading = "Step 3: It Makes the Text Consistent";
      doing = "The chatbot strips out minor variations, punctuation, and capitalization to make words uniform.";
      technical = "This is called <strong>Text Normalization</strong>. The computer performs three tasks: 1) Converts all letters to lowercase. 2) Removes punctuation marks (commas, periods, exclamation points). 3) Strips extra spaces. This makes matching words much more reliable.";
      analogy = "It's like sorting laundry. Before you wash them, you make sure all socks are turned right-side out and laid flat. You reduce the messy details so matching them is quick and simple.";
      why = "In human writing, 'Join', 'JOIN', 'join', and 'join!' all mean the same action. But to a computer, they look like completely different words because their character codes don't match. Cleaning standardizes the text.";
      skipped = "Without text cleaning, the chatbot would require millions of extra rules. If the user typed 'tomorrow.' with a period, the chatbot might fail to recognize it if it only knew the word 'tomorrow' without punctuation.";
      example = `Original text is standardized:<br><strong>Original:</strong> "${nlp.rawText}"<br><strong>Cleaned:</strong> "${nlp.cleanedText}"`;
      takeaway = "Normalization removes cosmetic differences in spelling and punctuation without changing the core meaning.";
      presenterNotes = "Ask the class: 'Do you write differently when you're excited?' Mention that users type 'PLEASE!!!' or 'please...'. Cleaning ensures the bot sees both as simply 'please'.";
      break;
      
    case 4: // Words to Numbers
      heading = "Step 4: It Converts Words Into Numbers";
      doing = "The chatbot translates the cleaned words into coordinates and cross-references them against an internal dictionary.";
      technical = "Computers cannot do math with letters; they calculate using numbers. In traditional NLP, words are mapped to numerical codes. High-tech chatbots map words to coordinates in space called <strong>Vectors</strong> (or <strong>Embeddings</strong>). It also checks which important keywords are present using a <strong>Pattern Table</strong>.";
      analogy = "Think of this as assigning a catalog number to items in a warehouse. Instead of searching for 'the blue ceramic coffee mug', you look up item 'ID #45032'. Numbers are faster to process and sort.";
      why = "Representing words mathematically allows the chatbot to run statistical algorithms, calculate similarities, and quickly check for key patterns.";
      skipped = "Without numbers, the computer would have to compare string characters character-by-character, which is incredibly slow and prevents the chatbot from doing any statistical calculations or machine learning.";
      example = `Look at these vector values (simplified illustration) for your words:<br>
      <div style="font-size:0.85rem; background:rgba(0,0,0,0.2); padding:0.5rem; border-radius:6px; margin: 0.5rem 0;">
        ${nlp.wordVectors.slice(0, 4).map(v => `<strong>${v.word}</strong> &rarr; [${v.vector.join(', ')}]`).join('<br>')}
      </div>`;
      takeaway = "Computers do not read words; they compare mathematical patterns and numbers.";
      presenterNotes = "Explain that in real NLP models, these numbers (embeddings) represent where a word sits in a giant multidimensional space, putting similar words (like 'register' and 'join') close to each other.";
      break;
      
    case 5: // Intent Detection
      heading = "Step 5: It Predicts What You Want";
      doing = "The chatbot reads the pattern of words and predicts the overall goal of your message.";
      technical = "This step is <strong>Intent Classification</strong>. The chatbot compares the numerical patterns in your message with training examples (categories it learned during training, like 'Registration', 'Location', or 'Pricing'). It calculates a confidence percentage for each category.";
      analogy = "Imagine you work at a customer service desk. A person walks up and says, 'I need a seat for the talk.' You immediately classify their request under the category: 'Registration' and direct them to the sign-up sheet.";
      why = "Understanding the user's intent is the core job of a chatbot. It connects human phrasing to the computer's predefined features.";
      skipped = "Without Intent Detection, the chatbot would not know the objective. It would just see a pile of words without knowing what task it is supposed to perform.";
      example = `The chatbot matches your words against database categories and predicts:<br>
      <strong>Predicted Goal (Intent):</strong> <span style="color:var(--primary-cyan); font-weight:700;">${nlp.winner}</span> (Confidence: ${nlp.intents.find(i => i.name === nlp.winner).score}%)`;
      takeaway = "Intent = the goal or task the user wants to accomplish.";
      presenterNotes = "Point out that traditional NLP doesn't 'think' on its own. It's a classifier that places your input into one of several preset bins. If you ask it about baking a cake, it will still try to fit that into Registration, Pricing, or Location!";
      break;
      
    case 6: // Entity Extraction
      heading = "Step 6: It Finds Important Details";
      doing = "The chatbot scans your message for specific keywords or names that act as parameters for your request.";
      technical = "This is called <strong>Entity Extraction</strong> or **Named Entity Recognition (NER)**. The chatbot uses pattern rules to look for variables like dates, locations, times, names, or product types. These details fill in the blanks of the detected intent.";
      analogy = "If Intent is the *verb* (e.g., 'Order pizza'), Entities are the *adjectives* (e.g., 'Large', 'Pepperoni', '7:00 PM'). You can't execute the order without knowing the specific details.";
      why = "An intent like 'Registration' is too broad. The chatbot needs to extract details like *which* event you want to join and *when* you are coming to take action.";
      skipped = "Without Entity Extraction, the chatbot would know you want to register, but it wouldn't know *what* you want to register for, forcing it to ask follow-up questions for information you already provided.";
      example = `The chatbot extracts parameters from your message:<br>
      <strong>Topic:</strong> <span style="color:var(--secondary-blue); font-weight:700;">${nlp.entities.topic}</span><br>
      <strong>Date:</strong> <span style="color:var(--accent-purple); font-weight:700;">${nlp.entities.date}</span>`;
      takeaway = "Entities = the key parameters and variables needed to carry out the request.";
      presenterNotes = "Explain that entity extractors are often trained like search engines, specifically looking for capitalized words (names/locations) or number patterns (dates/times).";
      break;
      
    case 7: // Workflow
      heading = "Step 7: It Chooses the Right Next Action";
      doing = "The chatbot passes the goal and details to a decision tree that controls what step to take next.";
      technical = "This is <strong>Workflow Routing</strong>. The chatbot triggers a structured program (a state machine or decision flowchart) linked to the detected intent. It feeds the extracted entities (Topic, Date) into this flowchart to decide the next step.";
      analogy = "It's like a restaurant ordering system. When the kitchen receives an order for 'Pizza' (Intent) with pepperoni (Entity), it triggers the pizza-baking workflow, rather than the ice-cream scooping workflow.";
      why = "A chatbot is only useful if it can connect words to functional computer operations. The workflow connects language recognition to active business processes (like searching a database or writing a file).";
      skipped = "Without Workflow Routing, the chatbot might understand what you want, but it would sit idle, unable to trigger the correct code or database update to help you.";
      example = `Because intent is <strong>${nlp.winner}</strong>, the chatbot routes your query to the: <span style="color:var(--primary-cyan); font-weight:700;">${nlp.winner} Workflow Pipeline</span>.`;
      takeaway = "Workflows connect parsed language to programmatic actions and responses.";
      presenterNotes = "Explain that in traditional NLP chatbots, these workflows are hardcoded by human developers. They are highly reliable but very rigid.";
      break;
      
    case 8: // Reply
      heading = "Step 8: It Responds";
      doing = "The chatbot translates the result of its workflow back into human language and displays it.";
      technical = "The chatbot generates a final string (using a predefined template filled with extracted details) and sends it back to the UI. The user sees a natural-looking conversation bubble.";
      analogy = "It's like a drive-through teller. They verify your card, withdraw the money from the drawer (workflow), and hand you the cash with a friendly phrase, 'Here is your withdrawal.'";
      why = "Humans communicate in sentences, not in variables. The chatbot must translate its database achievements back into clean text so the user knows what happened.";
      skipped = "Without this step, the chatbot would complete the action (e.g. register you) but leave you in silence. You wouldn't know if the transaction succeeded or failed.";
      example = `The chatbot triggers its reply template and prints:<br>
      <blockquote style="background: rgba(6,182,212,0.05); border: 1.5px solid rgba(6,182,212,0.2); padding: 0.75rem; border-radius: 8px; font-style: italic;">
        "${nlp.botReply}"
      </blockquote>`;
      takeaway = "The reply translates structural actions back into human language.";
      presenterNotes = "Discuss how template-based replies are structured, such as: 'Hi {Name}, your registration for {Topic} on {Date} is confirmed!'";
      break;
      
    case 9: // Traditional vs LLM
      heading = "What Changed With LLMs?";
      doing = "Compare traditional rule-based NLP chatbots with modern Large Language Models (like Gemini).";
      technical = "Traditional NLP uses a pipeline of distinct parts (Classifier, Tokenizer, Entity Extractor, Flowcharts). Modern **LLMs (Large Language Models)** process everything in one massive neural network, predicting the next words based on trillions of examples.";
      analogy = "Traditional NLP is like a train on a track: highly efficient, safe, and goes exactly where the rails go. LLMs are like an off-road SUV: they can navigate rugged terrain and go anywhere, but they might get lost or slide off the path.";
      why = "Understanding both allows you to choose the right tool. For strict banking workflows, traditional NLP is often preferred for safety. For creative writing or broad customer support, LLMs shine.";
      skipped = "Skipping this comparison would leave you thinking that ChatGPT or Gemini work exactly like old phone-tree bots. They represent a massive leap in how computers process context.";
      example = "We just processed your text step-by-step. An LLM would read the whole message, generate a reply directly, and write the registration code in one single neural network pass.";
      takeaway = "Traditional NLP is controlled and predictable; LLMs are flexible and conversational.";
      presenterNotes = "Explain that AI agents are the next step: combining the language flexibility of LLMs with the structured tool-use and workflows of traditional NLP!";
      break;
  }
  if (label) {
    if (step > 0 && step < 9) {
      label.textContent = `Step ${step} of 8: ${stepsConfig[step].label}`;
    } else if (step === 9) {
      label.textContent = "Comparison & Outlook";
    }
  }
  title.textContent = heading;
  content.innerHTML = `
    <!-- 1. What it is doing -->
    <div class="info-section">
      <span class="info-label">What the chatbot is doing</span>
      <p class="info-text">${doing}</p>
    </div>
    
    <!-- 2. Technical details -->
    <div class="info-section">
      <span class="info-label">Behind the Scenes (Technical)</span>
      <p class="info-text">${technical}</p>
    </div>
    
    <!-- 3. Analogy -->
    <div class="info-section">
      <span class="info-label">Real-World Analogy</span>
      <p class="info-text">💡 ${analogy}</p>
    </div>
    
    <!-- 4. Why we need it -->
    <div class="info-section">
      <span class="info-label">Why is this step necessary?</span>
      <p class="info-text">${why}</p>
    </div>
    
    <!-- 5. What if it did not exist -->
    <div class="info-section">
      <span class="info-label">If we skipped this step</span>
      <p class="info-text">⚠️ ${skipped}</p>
    </div>
    
    <!-- 6. Sentence Example -->
    <div class="info-section" style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
      <span class="info-label">On Your Message</span>
      <p class="info-text">${example}</p>
    </div>
    
    <!-- 7. Key Takeaway -->
    <div class="takeaway-card">
      <div class="takeaway-title">💡 Remember this Takeaway</div>
      <div class="takeaway-content">${takeaway}</div>
    </div>
    
    <!-- Presenter Notes Toggle -->
    <div class="presenter-notes">
      <button class="presenter-toggle" onclick="togglePresenterNotes()">
        <span>👁️</span> Presenter Cues & Tips
      </button>
      <div id="presenter-content-box" class="presenter-content ${appState.presenterNotesVisible ? 'show' : ''}">
        ${presenterNotes}
      </div>
    </div>
  `;
}

// Toggle Presenter Notes Visibility
window.togglePresenterNotes = function() {
  const box = document.getElementById("presenter-content-box");
  appState.presenterNotesVisible = !appState.presenterNotesVisible;
  if (appState.presenterNotesVisible) {
    box.classList.add("show");
  } else {
    box.classList.remove("show");
  }
};

// Start Step-Specific Visual Animations
function runVisualAnimation() {
  clearAllIntervals();
  
  const step = appState.currentStep;
  const nlp = appState.nlpResult;
  
  // Hide all stages first
  const stages = document.querySelectorAll(".animation-stage");
  stages.forEach(s => s.classList.add("hidden-stage"));
  
  // Show active stage
  const activeStage = document.getElementById(`stage-${step}`);
  if (activeStage) {
    activeStage.classList.remove("hidden-stage");
  }
  
  const panel = document.getElementById("visual-panel-id");
  panel.classList.add("active-step");
  setTimeout(() => panel.classList.remove("active-step"), 800);
  
  switch(step) {
    case 0: // Intro Screen
      // Static content, no animation needed
      break;
      
    case 1: // Raw Message (Character-by-character render)
      const container1 = document.getElementById("incoming-msg-bubble");
      container1.innerHTML = "";
      const text = nlp.rawText;
      
      // Print characters
      let index = 0;
      const charTimer = setInterval(() => {
        if (index < text.length) {
          const span = document.createElement("span");
          span.className = "char-span";
          span.textContent = text[index];
          container1.appendChild(span);
          index++;
          if (index % 3 === 0) window.sounds.playTick();
        } else {
          clearInterval(charTimer);
        }
      }, 35);
      appState.animationIntervals.push(charTimer);
      break;
      
    case 2: // Tokenization: word separation cards
      const container2 = document.getElementById("tokens-anim-grid");
      container2.innerHTML = "";
      
      // Render tokens
      nlp.tokens.forEach((token, i) => {
        const card = document.createElement("div");
        card.className = "token-card";
        card.textContent = token;
        container2.appendChild(card);
        
        // Stagger fly-in
        const tokenTimer = setTimeout(() => {
          card.classList.add("animate-token");
          window.sounds.playPop();
        }, i * 180);
        appState.animationIntervals.push(tokenTimer);
      });
      break;
      
    case 3: // Text Cleaning: Capital change & fade out punctuation
      const container3 = document.getElementById("cleaning-flow-box");
      container3.innerHTML = "";
      
      // Show Original Row
      const origRow = document.createElement("div");
      origRow.className = "clean-row";
      origRow.innerHTML = `
        <div class="clean-row-title">Original Characters</div>
        <div class="clean-row-content" id="clean-original-text"></div>
      `;
      container3.appendChild(origRow);
      
      // Show Cleaned Row
      const cleanRow = document.createElement("div");
      cleanRow.className = "clean-row";
      cleanRow.innerHTML = `
        <div class="clean-row-title">Normalized Characters</div>
        <div class="clean-row-content" id="clean-processed-text"></div>
      `;
      container3.appendChild(cleanRow);
      
      const origTextSpan = document.getElementById("clean-original-text");
      const procTextSpan = document.getElementById("clean-processed-text");
      
      nlp.cleaningSteps.forEach(step => {
        const origTag = document.createElement("span");
        origTag.className = "clean-tag";
        origTag.textContent = step.original + " ";
        origTextSpan.appendChild(origTag);
        
        const procTag = document.createElement("span");
        procTag.className = "clean-tag";
        procTag.textContent = (step.clean || step.original) + " ";
        procTextSpan.appendChild(procTag);
      });
      
      // Run the clean animation after 400ms
      const cleanTimer = setTimeout(() => {
        window.sounds.playClean();
        const origTags = origTextSpan.querySelectorAll(".clean-tag");
        const procTags = procTextSpan.querySelectorAll(".clean-tag");
        
        nlp.cleaningSteps.forEach((step, idx) => {
          if (step.action === "remove") {
            origTags[idx].classList.add("modified");
            procTags[idx].classList.add("modified");
            setTimeout(() => {
              procTags[idx].style.opacity = "0";
              procTags[idx].style.width = "0px";
              procTags[idx].style.padding = "0px";
              procTags[idx].style.margin = "0px";
            }, 500);
          } else if (step.action === "lowercase") {
            procTags[idx].classList.add("cleaned");
          }
        });
      }, 500);
      appState.animationIntervals.push(cleanTimer);
      break;
      
    case 4: // Words to Numbers
      const cardsBox = document.getElementById("vector-cards-box");
      const tableBody = document.getElementById("vector-table-body");
      
      cardsBox.innerHTML = "";
      tableBody.innerHTML = "";
      
      // Add vector cards
      nlp.wordVectors.forEach((item, idx) => {
        const card = document.createElement("div");
        card.className = "vector-word-card";
        card.style.opacity = "0";
        card.style.transform = "translateY(15px)";
        card.innerHTML = `
          <div class="vector-word-name">${item.word}</div>
          <div class="vector-word-nums">[${item.vector.slice(0, 3).join(', ')}]</div>
        `;
        cardsBox.appendChild(card);
        
        const cardTimer = setTimeout(() => {
          card.style.opacity = "1";
          card.style.transform = "translateY(0)";
          card.style.borderColor = "var(--primary-cyan)";
          window.sounds.playTick();
        }, idx * 100);
        appState.animationIntervals.push(cardTimer);
      });
      
      // Add rows to pattern table
      nlp.patternTable.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${row.word}</strong></td>
          <td class="${row.found === 'Yes' ? 'found-yes' : 'found-no'}">${row.found}</td>
        `;
        tableBody.appendChild(tr);
      });
      break;
      
    case 5: // Intent detection chart
      const intentBox = document.getElementById("intent-charts-box");
      intentBox.innerHTML = "";
      
      const badge = document.getElementById("intent-winner-badge");
      badge.classList.remove("show");
      badge.textContent = `Detected Intent: ${nlp.winner}`;
      
      // Render intent rows
      nlp.intents.forEach(intent => {
        const isWinner = intent.name === nlp.winner;
        const row = document.createElement("div");
        row.className = `intent-row ${isWinner ? 'winner' : ''}`;
        row.innerHTML = `
          <div class="intent-info-row">
            <span class="intent-name">${intent.name}</span>
            <span class="intent-score">${intent.score}%</span>
          </div>
          <div class="intent-track">
            <div class="intent-fill" id="fill-${intent.name}"></div>
          </div>
        `;
        intentBox.appendChild(row);
        
        // Grow bars
        const fillTimer = setTimeout(() => {
          const fill = document.getElementById(`fill-${intent.name}`);
          if (fill) fill.style.width = `${intent.score}%`;
        }, 100);
        appState.animationIntervals.push(fillTimer);
      });
      
      // Show winner badge
      const badgeTimer = setTimeout(() => {
        badge.classList.add("show");
        window.sounds.playChime();
      }, 1000);
      appState.animationIntervals.push(badgeTimer);
      break;
      
    case 6: // Entity Extraction highlights
      const entitySentence = document.getElementById("entity-highlight-sentence");
      const entityGrid = document.getElementById("entities-cards-grid");
      
      // Re-create sentence with highlights
      entitySentence.innerHTML = "";
      nlp.tokens.forEach(token => {
        const clean = token.toLowerCase().trim();
        const span = document.createElement("span");
        span.className = "entity-word";
        span.textContent = token;
        
        if (clean === nlp.entities.topic) {
          span.classList.add("highlight-topic");
        } else if (clean === nlp.entities.date) {
          span.classList.add("highlight-date");
        }
        
        entitySentence.appendChild(span);
        entitySentence.appendChild(document.createTextNode(" "));
      });
      
      // Set cards values
      entityGrid.innerHTML = `
        <div class="entity-card topic">
          <div class="entity-card-label">Topic / Event Details</div>
          <div class="entity-card-val">${nlp.entities.topic}</div>
        </div>
        <div class="entity-card date">
          <div class="entity-card-label">Target Date / Time</div>
          <div class="entity-card-val">${nlp.entities.date}</div>
        </div>
      `;
      window.sounds.playHighlight();
      break;
      
    case 7: // Workflow pipeline nodes
      const wfMap = document.getElementById("workflow-nodes-map");
      wfMap.innerHTML = "";
      
      nlp.workflowSteps.forEach((stepName, i) => {
        // Node
        const node = document.createElement("div");
        node.className = "workflow-node";
        node.textContent = stepName;
        wfMap.appendChild(node);
        
        // Add arrow if not last
        if (i < nlp.workflowSteps.length - 1) {
          const arrow = document.createElement("div");
          arrow.className = "workflow-arrow";
          arrow.innerHTML = "&darr;";
          wfMap.appendChild(arrow);
        }
        
        // Illuminate nodes sequentially
        const nodeTimer = setTimeout(() => {
          // De-activate previous node
          const nodes = wfMap.querySelectorAll(".workflow-node");
          nodes.forEach(n => n.classList.remove("active-node"));
          nodes[i].classList.add("active-node");
          window.sounds.playPop();
        }, i * 400);
        appState.animationIntervals.push(nodeTimer);
      });
      break;
      
    case 8: // Final Bot Reply Bubble
      const botContainer = document.getElementById("reply-chat-bubbles");
      botContainer.innerHTML = "";
      
      // User message bubble
      const userBubble = document.createElement("div");
      userBubble.className = "chat-bubble user-bubble";
      userBubble.textContent = nlp.rawText;
      botContainer.appendChild(userBubble);
      
      // Bot typing bubble
      const typingBubble = document.createElement("div");
      typingBubble.className = "chat-bubble bot-bubble";
      typingBubble.innerHTML = `
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      `;
      botContainer.appendChild(typingBubble);
      window.sounds.playTick();
      
      // Trigger actual response
      const replyTimer = setTimeout(() => {
        typingBubble.innerHTML = "";
        window.sounds.playNotification();
        
        let charIndex = 0;
        const textToType = nlp.botReply;
        const subTimer = setInterval(() => {
          if (charIndex < textToType.length) {
            const span = document.createElement("span");
            span.className = "char-span";
            span.textContent = textToType[charIndex];
            typingBubble.appendChild(span);
            charIndex++;
            if (charIndex % 3 === 0) window.sounds.playTick();
          } else {
            clearInterval(subTimer);
          }
        }, 20);
        appState.animationIntervals.push(subTimer);
      }, 1200);
      appState.animationIntervals.push(replyTimer);
      break;
      
    case 9: // Traditional vs LLM comparisons
      // The visual panel shows a comparison table which is static, no complex JS animation needed.
      break;
  }
}

// Render the application state
function renderApp() {
  updateProgressUI();
  updateNavButtons();
  renderExplanation();
  runVisualAnimation();
}

// Go to next step
window.goNext = function() {
  window.sounds.playSlide();
  if (appState.currentStep === 9) {
    // Restart to Intro step
    appState.currentStep = 0;
    renderApp();
  } else {
    appState.currentStep++;
    renderApp();
  }
};

// Go to previous step
window.goBack = function() {
  window.sounds.playSlide();
  if (appState.currentStep > 0) {
    appState.currentStep--;
    renderApp();
  }
};

// Replay active animation
window.replayAnimation = function() {
  window.sounds.playSlide();
  runVisualAnimation();
};

// Restart lesson entirely
window.restartLesson = function() {
  window.sounds.playSlide();
  appState.currentStep = 0;
  renderApp();
};

// Set custom message
window.setCustomMessage = function() {
  const input = document.getElementById("custom-input-field");
  if (input && input.value.trim().length > 0) {
    window.sounds.playChime();
    appState.userMessage = input.value.trim();
    appState.nlpResult = analyzeMessage(appState.userMessage);
    
    // Jump directly to step 1 (Raw message)
    appState.currentStep = 1;
    renderApp();
  }
};

// Choose preset message
window.selectPresetMessage = function() {
  window.sounds.playChime();
  appState.userMessage = "Hi, I want to join the event tomorrow.";
  appState.nlpResult = analyzeMessage(appState.userMessage);
  
  // Jump to step 1
  appState.currentStep = 1;
  renderApp();
};

// Initialize App on DOM Load
document.addEventListener("DOMContentLoaded", () => {
  // Pre-calculate NLP values for default message
  appState.nlpResult = analyzeMessage(appState.userMessage);
  
  // Render
  renderApp();
  
  // Add support for custom input Enter key
  const input = document.getElementById("custom-input-field");
  if (input) {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        window.setCustomMessage();
      }
    });
  }

  // Attach click sounds to all interactive elements dynamically
  const attachClickSounds = () => {
    const targets = document.querySelectorAll("button, .btn, .btn-use-custom, .step-node");
    targets.forEach(el => {
      if (!el.dataset.clickSoundBound) {
        el.dataset.clickSoundBound = "true";
        el.addEventListener("click", () => {
          if (window.sounds && typeof window.sounds.playTick === "function") {
            window.sounds.playTick();
          }
        });
      }
    });
  };

  attachClickSounds();

  // Observe dynamically rendered components
  const observer = new MutationObserver(() => {
    attachClickSounds();
  });
  observer.observe(document.body, { childList: true, subtree: true });
});
