/**
 * runtime.js
 * The chatbot conversation runtime.
 * Takes a compiled program and answers user messages.
 */

'use strict';

/* global createEngine, createMemory */

/**
 * Escape HTML to prevent XSS.
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Normalise user input for matching.
 * - lowercase
 * - trim
 * - collapse whitespace
 * - remove trailing punctuation
 */
function normalise(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[?!.,;]+$/, '');
}

/**
 * Remove common contractions for matching.
 */
function expandContractions(text) {
  return text
    .replace(/what's/gi, 'what is')
    .replace(/it's/gi, 'it is')
    .replace(/i'm/gi, 'i am')
    .replace(/i've/gi, 'i have')
    .replace(/don't/gi, 'do not')
    .replace(/doesn't/gi, 'does not')
    .replace(/can't/gi, 'cannot')
    .replace(/won't/gi, 'will not')
    .replace(/isn't/gi, 'is not')
    .replace(/aren't/gi, 'are not');
}

function normaliseInput(text) {
  return normalise(expandContractions(text));
}

/**
 * Try to match a pattern (which may contain [variable] placeholders) against
 * an input string.
 *
 * Returns an object of bindings { varName: value } if matched, else null.
 */
function matchPattern(pattern, input) {
  // Normalise both for structural matching
  const normPattern = normalise(expandContractions(pattern));
  const normInput = normaliseInput(input);

  // Prepare original input (contractions expanded, whitespace normalised,
  // trailing punctuation stripped) so captured values preserve original case.
  const origInput = expandContractions(input)
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[?!.,;]+$/, '');

  // Extract variable names in order
  const varNames = [];
  let regexStr = normPattern.replace(/\[([^\]]+)\]/g, (_, name) => {
    varNames.push(name.trim());
    return '(.+?)';
  });

  // Anchor
  regexStr = '^' + regexStr + '$';

  try {
    const re = new RegExp(regexStr, 'i');
    // First check structural match on normalised input
    if (!normInput.match(re)) return null;
    // Extract values from original input to preserve caller's casing
    const m = origInput.match(re) || normInput.match(re);
    const bindings = {};
    for (let i = 0; i < varNames.length; i++) {
      bindings[varNames[i]] = m[i + 1].trim();
    }
    return bindings;
  } catch (e) {
    return null;
  }
}

/**
 * Substitute [varName] placeholders in text using bindings + memory.
 */
function substitute(text, bindings, memory) {
  return text.replace(/\[([^\]]+)\]/g, (_, name) => {
    const key = name.trim();
    if (bindings && key in bindings) return bindings[key];
    if (memory && memory.has(key)) return memory.get(key);
    return '[' + key + ']';
  });
}

/**
 * Evaluate an arithmetic expression in a string like "3 + 5".
 * Returns the result as a number, or null if not arithmetic.
 */
function evalArithmetic(expr) {
  const cleaned = String(expr).trim();
  // Allow: digits, spaces, +, -, *, ×, /, ÷, (, ), .
  if (!/^[\d\s+\-*/×÷().]+$/.test(cleaned)) return null;
  const normalised = cleaned.replace(/×/g, '*').replace(/÷/g, '/');
  try {
    // Use Function constructor to evaluate (safe: no variables, only arithmetic)
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + normalised + ')')();
    if (typeof result === 'number' && isFinite(result)) return result;
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Choose one of several options. Rotates through them deterministically.
 */
function choose(options, counter) {
  if (!options || options.length === 0) return '';
  return options[counter % options.length];
}

/**
 * Evaluate a condition given bindings, memory, and reasoning engine.
 */
function evalCondition(cond, bindings, memory, engine) {
  if (!cond) return true;

  switch (cond.type) {
    case 'known':
      return memory.has(cond.key);

    case 'memory_eq':
      return memory.has(cond.key) && memory.get(cond.key).toLowerCase() === cond.value.toLowerCase();

    case 'comparison': {
      const raw = substitute(cond.subject, bindings, memory);
      const valRaw = substitute(cond.value, bindings, memory);
      const a = parseFloat(raw);
      const b = parseFloat(valRaw);
      if (isNaN(a) || isNaN(b)) return false;
      if (cond.operator === '>') return a > b;
      if (cond.operator === '<') return a < b;
      if (cond.operator === '=') return a === b;
      return false;
    }

    case 'is_a': {
      const subj = substitute(cond.subject, bindings, memory).toLowerCase();
      return engine.isA(subj, cond.object);
    }

    case 'not':
      return !evalCondition(cond.inner, bindings, memory, engine);

    default:
      return true;
  }
}

/**
 * Execute an action, returning { text, explanation, newState }.
 */
function execAction(action, bindings, memory, engine, counter) {
  if (!action) return { text: '', explanation: '' };

  switch (action.type) {
    case 'say': {
      const text = substitute(action.value, bindings, memory);
      return { text, explanation: `Rule: say "${action.value}"` };
    }

    case 'say_one_of': {
      const chosen = choose(action.options, counter);
      const text = substitute(chosen, bindings, memory);
      return { text, explanation: `Rule: say one of [${action.options.join(' / ')}]` };
    }

    case 'remember': {
      const value = substitute(action.value, bindings, memory);
      memory.set(action.key, value);
      return { text: null, explanation: `Remembered: ${action.key} = ${value}` };
    }

    case 'forget': {
      const key = substitute(action.value, bindings, memory);
      memory.forget(key);
      return { text: null, explanation: `Forgot: ${key}` };
    }

    case 'arithmetic': {
      const a = parseFloat(substitute('[' + action.a + ']', bindings, memory));
      const b = parseFloat(substitute('[' + action.b + ']', bindings, memory));
      if (!isNaN(a) && !isNaN(b)) {
        let result;
        switch (action.op) {
          case 'add': result = a + b; break;
          case 'subtract': result = a - b; break;
          case 'multiply': result = a * b; break;
          case 'divide': result = b !== 0 ? a / b : 'undefined'; break;
          default: result = 0;
        }
        memory.set('answer', String(result));
      }
      return { text: null, explanation: `Arithmetic: ${action.op}` };
    }

    case 'conditional': {
      const condResult = evalCondition(action.condition, bindings, memory, engine);
      const branch = condResult ? action.then : action.else;
      const results = [];
      if (branch) {
        for (const a2 of branch) {
          const r = execAction(a2, bindings, memory, engine, counter);
          if (r.text !== null) results.push(r.text);
        }
      }
      return { text: results.join(' '), explanation: `Conditional (${condResult ? 'then' : 'else'})` };
    }

    case 'show_image':
      return { text: null, explanation: '', image: escapeHtml(action.value) };

    case 'show_button':
      return { text: null, explanation: '', button: escapeHtml(action.value) };

    default:
      return { text: null, explanation: '' };
  }
}

// ---------------------------------------------------------------------------
// Primary-school arithmetic detection
// ---------------------------------------------------------------------------

const ARITHMETIC_RE = /^what\s+is\s+([\d\s+\-*/×÷().]+)\??$/i;

function tryArithmetic(input) {
  const m = normaliseInput(input).match(ARITHMETIC_RE);
  if (m) {
    const result = evalArithmetic(m[1].trim());
    if (result !== null) {
      const formatted = Number.isInteger(result) ? String(result) : result.toFixed(4).replace(/\.?0+$/, '');
      return { text: formatted, explanation: `Built-in arithmetic: ${m[1].trim()} = ${formatted}` };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Built-in responses
// ---------------------------------------------------------------------------

const BUILTINS = [
  {
    patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
    respond(_, memory) {
      if (memory.has('name')) return `Hello ${memory.get('name')}! How can I help?`;
      return 'Hello! How can I help?';
    },
    explanation: 'Built-in: greeting'
  },
  {
    patterns: ['goodbye', 'bye', 'see you', 'see you later'],
    respond() { return 'Goodbye! Have a great day!'; },
    explanation: 'Built-in: farewell'
  },
  {
    patterns: ['thank you', 'thanks', 'thank you very much'],
    respond() { return "You're welcome!"; },
    explanation: 'Built-in: thanks'
  },
  {
    patterns: ['help'],
    respond() {
      return 'You can ask me questions or tell me things. Type "clear" to start a new conversation.';
    },
    explanation: 'Built-in: help'
  },
  {
    patterns: ['clear', 'reset', 'start over', 'new conversation'],
    respond() { return '__RESET__'; },
    explanation: 'Built-in: reset'
  },
  {
    patterns: ['what is your name', 'what are you called', 'who are you'],
    respond(botName) { return `My name is ${botName}.`; },
    explanation: 'Built-in: name query'
  }
];

// ---------------------------------------------------------------------------
// Main chat function
// ---------------------------------------------------------------------------

/**
 * Create a chatbot runtime from a compiled program.
 *
 * @param {object} program - parsed program from parser.js
 * @param {object} [opts]
 * @param {function} [opts.createEngineFunc] - inject reasoning engine creator
 * @param {function} [opts.createMemoryFunc] - inject memory creator
 * @returns {object}
 */
function createRuntime(program, opts) {
  opts = opts || {};
  const _createEngine = opts.createEngineFunc || createEngine;
  const _createMemory = opts.createMemoryFunc || createMemory;

  let engine = _createEngine(program.facts || []);
  let memory = _createMemory();
  let counter = 0;
  let lastExplanation = [];
  let conversationState = null;

  function reset() {
    memory = _createMemory();
    counter = 0;
    lastExplanation = [];
    conversationState = null;
  }

  function reload(newProgram) {
    program = newProgram;
    engine = _createEngine(program.facts || []);
    reset();
  }

  /**
   * Main chat entry point.
   * @param {string} input
   * @returns {{ text: string, explanation: string[], buttons: string[], images: string[] }}
   */
  function chat(input) {
    counter++;
    lastExplanation = [];
    const buttons = [];
    const images = [];

    const safeInput = String(input).slice(0, 2000);

    // 1. Try built-in arithmetic
    const arith = tryArithmetic(safeInput);
    if (arith) {
      lastExplanation = [arith.explanation];
      return { text: escapeHtml(arith.text), explanation: lastExplanation, buttons, images };
    }

    // 2. Check all authored rules in priority order
    const normIn = normaliseInput(safeInput);

    // Priority: exact QA/trigger > pattern-with-vars > fallback
    const exactRules = [];
    const patternRules = [];
    const fallbackRules = [];

    for (const rule of (program.rules || [])) {
      if (rule.type === 'fallback') { fallbackRules.push(rule); continue; }
      if (rule.type === 'inference') continue; // handled separately

      const hasVars = rule.triggerVars && rule.triggerVars.length > 0;
      if (hasVars) {
        patternRules.push(rule);
      } else {
        exactRules.push(rule);
      }
    }

    // Try exact rules first
    for (const rule of exactRules) {
      const result = tryRule(rule, safeInput, normIn);
      if (result) return result;
    }

    // Try pattern rules
    for (const rule of patternRules) {
      const result = tryRule(rule, safeInput, normIn);
      if (result) return result;
    }

    // 3. Try built-in knowledge (is_a queries)
    const isAResult = tryIsAQuery(normIn);
    if (isAResult) {
      lastExplanation = isAResult.explanation;
      return { text: escapeHtml(isAResult.text), explanation: lastExplanation, buttons, images };
    }

    // 4. Built-in conversational responses
    const builtin = tryBuiltin(normIn);
    if (builtin) {
      if (builtin.text === '__RESET__') {
        reset();
        return { text: 'Conversation cleared!', explanation: ['Built-in: reset'], buttons, images };
      }
      lastExplanation = [builtin.explanation];
      return { text: escapeHtml(builtin.text), explanation: lastExplanation, buttons, images };
    }

    // 5. Fallback rules
    for (const rule of fallbackRules) {
      const result = tryRule(rule, safeInput, normIn);
      if (result) return result;
    }

    // 6. Ultimate fallback
    lastExplanation = ["No rule matched. You haven't taught your chatbot what to do in this situation yet."];
    return {
      text: "I don't know that yet. You can teach me!",
      explanation: lastExplanation,
      buttons,
      images
    };
  }

  function tryRule(rule, input, normIn) {
    let bindings = null;

    if (rule.type !== 'fallback') {
      bindings = matchPattern(rule.trigger, input);

      // If primary trigger didn't match, try OR triggers
      if (!bindings && rule.orTriggers) {
        for (const orT of rule.orTriggers) {
          bindings = matchPattern(orT, input);
          if (bindings) break;
        }
      }

      if (!bindings) return null;
    } else {
      bindings = {};
    }

    // Evaluate conditions
    if (rule.conditions) {
      for (const cond of rule.conditions) {
        if (!evalCondition(cond, bindings, memory, engine)) return null;
      }
    }

    return executeActions(rule.actions, bindings, rule);
  }

  function executeActions(actions, bindings, rule) {
    const texts = [];
    const explanation = [`Rule on line ${rule.lineNumber || '?'}: trigger "${rule.trigger || rule.type}"`];
    const buttons = [];
    const images = [];

    for (const action of (actions || [])) {
      const r = execAction(action, bindings, memory, engine, counter);
      if (r.text !== null && r.text !== undefined && r.text !== '') {
        texts.push(r.text);
      }
      if (r.explanation) explanation.push(r.explanation);
      if (r.button) buttons.push(r.button);
      if (r.image) images.push(r.image);
    }

    if (texts.length === 0 && buttons.length === 0) return null;

    lastExplanation = explanation;
    return {
      text: texts.map(t => escapeHtml(t)).join(' '),
      explanation,
      buttons,
      images
    };
  }

  function tryIsAQuery(normIn) {
    // "is a dog an animal?" / "is dog an animal"
    const m1 = normIn.match(/^is\s+(?:a\s+|an\s+)?([a-zA-Z][a-zA-Z0-9 _'-]*?)\s+(?:a\s+|an\s+)?([a-zA-Z][a-zA-Z0-9 _'-]*)[\s?]*$/i);
    if (m1) {
      const subj = m1[1].trim().toLowerCase();
      const cat = m1[2].trim().toLowerCase();
      const result = engine.isA(subj, cat);
      if (result) {
        const chain = engine.explainIsA(subj, cat);
        return {
          text: 'Yes.',
          explanation: chain.length > 0
            ? ['Built-in reasoning:', ...chain]
            : ['Built-in: ' + subj + ' is a ' + cat]
        };
      } else {
        // Only say No if we have some facts about the subject
        const cats = engine.categoriesOf(subj);
        if (cats.length > 0) {
          return { text: 'No.', explanation: ['Built-in reasoning: ' + subj + ' is not known to be a ' + cat] };
        }
      }
    }

    // "what is a dog?" / "what is a [thing]?"
    const m2 = normIn.match(/^what\s+is\s+(?:a\s+|an\s+)?([a-zA-Z][a-zA-Z0-9 _'-]*)[\s?]*$/i);
    if (m2) {
      const subj = m2[1].trim().toLowerCase();
      const cats = engine.categoriesOf(subj);
      if (cats.length > 0) {
        return {
          text: `A ${subj} is a ${cats.join(', '+ 'and a ')}.`,
          explanation: ['Built-in facts: ' + subj + ' is a ' + cats.join(', ')]
        };
      }
    }

    return null;
  }

  function tryBuiltin(normIn) {
    for (const b of BUILTINS) {
      if (b.patterns.includes(normIn)) {
        return { text: b.respond(program.name, memory), explanation: b.explanation };
      }
    }
    return null;
  }

  function explainLastAnswer() {
    return lastExplanation;
  }

  function describeMemory() {
    return memory.describe();
  }

  function clearMemory() {
    memory.forgetAll();
  }

  function getMemory() {
    return memory.all();
  }

  function describeChatbot() {
    const factCount = (program.facts || []).length;
    const ruleCount = (program.rules || []).filter(r => r.type !== 'fallback').length;
    const memCount = Object.keys(memory.all()).length;
    const lines = [
      `Your chatbot is called ${program.name}.`,
      `It knows ${factCount} fact${factCount !== 1 ? 's' : ''}.`,
      `It has ${ruleCount} conversation rule${ruleCount !== 1 ? 's' : ''}.`,
      `It currently remembers ${memCount} thing${memCount !== 1 ? 's' : ''}.`
    ];
    if (program.personality && program.personality.length > 0) {
      lines.push(`Personality: ${program.personality.join(', ')}.`);
    }
    return lines.join('\n');
  }

  return {
    chat,
    reset,
    reload,
    explainLastAnswer,
    describeMemory,
    clearMemory,
    getMemory,
    describeChatbot,
    escapeHtml
  };
}

if (typeof module !== 'undefined') {
  module.exports = { createRuntime, escapeHtml, normaliseInput, matchPattern, substitute, evalArithmetic };
}
