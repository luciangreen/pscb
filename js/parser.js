/**
 * parser.js
 * Parses the simple primary-school authoring language into an internal program
 * representation.
 *
 * Authoring language examples:
 *   My chatbot is called Sunny.
 *   Sunny is friendly.
 *   If someone says hello:
 *       say Hello!
 *   Question: What is your name?
 *   Answer: My name is Sunny.
 *   A dog is an animal.
 *   If someone says My name is [name]:
 *       remember their name is [name].
 *       say Hello [name]!
 */

'use strict';

// ---------------------------------------------------------------------------
// Types produced by the parser
// ---------------------------------------------------------------------------

/**
 * A parsed chatbot program.
 * @typedef {{
 *   name: string,
 *   personality: string[],
 *   rules: Rule[],
 *   facts: Fact[],
 *   aliases: Object.<string,string[]>,
 *   diagnostics: Diagnostic[]
 * }} Program
 */

/**
 * @typedef {{line:number, type:string, message:string, suggestion:string}} Diagnostic
 */

/**
 * @typedef {{
 *   type: 'trigger'|'qa'|'inference'|'fallback',
 *   trigger?: string,
 *   triggerVars?: string[],
 *   conditions?: Condition[],
 *   actions: Action[],
 *   lineNumber: number,
 *   orTriggers?: string[]
 * }} Rule
 */

/**
 * @typedef {{
 *   type: 'is_a'|'property'|'negative',
 *   subject: string,
 *   predicate: string,
 *   object?: string
 * }} Fact
 */

/**
 * @typedef {{
 *   type: 'say'|'remember'|'forget'|'ask'|'score'|'choose'|'show_image'|'show_button',
 *   value: string
 * }} Action
 */

/**
 * @typedef {{
 *   type: 'known'|'comparison'|'property'|'is_a'|'not'
 *   key?: string,
 *   operator?: string,
 *   value?: string,
 *   subject?: string,
 *   predicate?: string,
 *   object?: string
 * }} Condition
 */

// ---------------------------------------------------------------------------
// Tokeniser helpers
// ---------------------------------------------------------------------------

function normaliseText(text) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function stripComment(line) {
  // Lines beginning with # are comments
  const idx = line.indexOf('#');
  if (idx === -1) return line;
  return line.slice(0, idx);
}

function isBlank(line) {
  return line.trim() === '';
}

function indentOf(line) {
  let n = 0;
  for (const ch of line) {
    if (ch === ' ') { n++; }
    else if (ch === '\t') { n += 4; }
    else break;
  }
  return n;
}

// ---------------------------------------------------------------------------
// Variable extraction
// ---------------------------------------------------------------------------

function extractVars(text) {
  const vars = [];
  const re = /\[([a-zA-Z][a-zA-Z0-9_ ]*)\]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const v = m[1].trim().toLowerCase().replace(/ /g, '_');
    if (!vars.includes(v)) vars.push(v);
  }
  return vars;
}

function normaliseVarNames(text) {
  return text.replace(/\[([a-zA-Z][a-zA-Z0-9_ ]*)\]/g, (_, v) => {
    return '[' + v.trim().toLowerCase().replace(/ /g, '_') + ']';
  });
}

// ---------------------------------------------------------------------------
// Fact parser
// ---------------------------------------------------------------------------

const FACT_PATTERNS = [
  // A dog is an animal.  /  A cat is an animal.
  /^[Aa]n?\s+([a-zA-Z][a-zA-Z0-9 _'-]*?)\s+is\s+(?:an?\s+)?([a-zA-Z][a-zA-Z0-9 _'-]*)\.?$/i,
  // The sky is blue.
  /^[Tt]he\s+([a-zA-Z][a-zA-Z0-9 _'-]*?)\s+is\s+([a-zA-Z][a-zA-Z0-9 _'-]*)\.?$/i,
  // My favourite colour is green.
  /^[Mm]y\s+([a-zA-Z][a-zA-Z0-9 _'-]*?)\s+is\s+([a-zA-Z][a-zA-Z0-9 _'-]*)\.?$/i,
  // Dogs are animals.
  /^([a-zA-Z][a-zA-Z0-9 _'-]*?)\s+are\s+([a-zA-Z][a-zA-Z0-9 _'-]*)\.?$/i,
];

const NEGATIVE_FACT_PATTERNS = [
  // A square is not a circle.
  /^[Aa]n?\s+([a-zA-Z][a-zA-Z0-9 _'-]*?)\s+is\s+not\s+(?:an?\s+)?([a-zA-Z][a-zA-Z0-9 _'-]*)\.?$/i,
];

const INFERENCE_PATTERN =
  /^[Ii]f\s+something\s+is\s+(?:an?\s+)?([a-zA-Z][a-zA-Z0-9 _'-]*):\s*$/i;

function parseFact(line) {
  const stripped = line.trim();

  for (const p of NEGATIVE_FACT_PATTERNS) {
    const m = stripped.match(p);
    if (m) {
      return {
        type: 'negative',
        subject: m[1].trim().toLowerCase(),
        predicate: 'is_a',
        object: m[2].trim().toLowerCase()
      };
    }
  }

  for (const p of FACT_PATTERNS) {
    const m = stripped.match(p);
    if (m) {
      return {
        type: 'is_a',
        subject: m[1].trim().toLowerCase(),
        predicate: 'is_a',
        object: m[2].trim().toLowerCase()
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Action parser
// ---------------------------------------------------------------------------

function parseAction(line, lineNumber) {
  const t = line.trim();

  if (/^say\s+one\s+of\s*:/i.test(t)) {
    return { type: 'say_one_of_start', lineNumber };
  }
  if (/^say\s+/i.test(t)) {
    return { type: 'say', value: normaliseVarNames(t.slice(4).trim()), lineNumber };
  }
  if (/^remember\s+/i.test(t)) {
    return parseRememberAction(t, lineNumber);
  }
  if (/^forget\s+/i.test(t)) {
    return { type: 'forget', value: t.slice(7).trim(), lineNumber };
  }
  if (/^ask\s*:/i.test(t)) {
    return { type: 'ask_start', lineNumber };
  }
  if (/^score\s+/i.test(t)) {
    return { type: 'score', value: t.slice(6).trim(), lineNumber };
  }
  if (/^show\s+image\s+/i.test(t)) {
    const val = t.replace(/^show\s+image\s+/i, '').replace(/^["']|["']$/g, '').trim();
    return { type: 'show_image', value: val, lineNumber };
  }
  if (/^show\s+button\s+/i.test(t)) {
    return { type: 'show_button', value: t.replace(/^show\s+button\s+/i, '').trim(), lineNumber };
  }
  if (/^add\s+\[([^\]]+)\]\s+and\s+\[([^\]]+)\]/i.test(t)) {
    const m = t.match(/^add\s+\[([^\]]+)\]\s+and\s+\[([^\]]+)\]/i);
    return { type: 'arithmetic', op: 'add', a: m[1].trim(), b: m[2].trim(), lineNumber };
  }
  if (/^subtract\s+/i.test(t)) {
    const m = t.match(/^subtract\s+\[([^\]]+)\]\s+from\s+\[([^\]]+)\]/i);
    if (m) return { type: 'arithmetic', op: 'subtract', a: m[2].trim(), b: m[1].trim(), lineNumber };
  }
  if (/^multiply\s+/i.test(t)) {
    const m = t.match(/^multiply\s+\[([^\]]+)\]\s+by\s+\[([^\]]+)\]/i);
    if (m) return { type: 'arithmetic', op: 'multiply', a: m[1].trim(), b: m[2].trim(), lineNumber };
  }
  if (/^divide\s+/i.test(t)) {
    const m = t.match(/^divide\s+\[([^\]]+)\]\s+by\s+\[([^\]]+)\]/i);
    if (m) return { type: 'arithmetic', op: 'divide', a: m[1].trim(), b: m[2].trim(), lineNumber };
  }

  return { type: 'say', value: normaliseVarNames(t), lineNumber };
}

function parseRememberAction(t, lineNumber) {
  // remember their [key] is [value].
  const m1 = t.match(/^remember\s+their\s+([a-zA-Z][a-zA-Z0-9 _]*?)\s+is\s+(.+?)\.?\s*$/i);
  if (m1) {
    return {
      type: 'remember',
      key: m1[1].trim().toLowerCase().replace(/ /g, '_'),
      value: normaliseVarNames(m1[2].trim()),
      lineNumber
    };
  }
  // remember [key] = [value]
  const m2 = t.match(/^remember\s+([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*(.+?)\.?\s*$/i);
  if (m2) {
    return {
      type: 'remember',
      key: m2[1].trim().toLowerCase(),
      value: normaliseVarNames(m2[2].trim()),
      lineNumber
    };
  }
  return { type: 'remember', key: 'info', value: t.slice(9).trim(), lineNumber };
}

// ---------------------------------------------------------------------------
// Condition parser
// ---------------------------------------------------------------------------

function parseCondition(text) {
  const t = text.trim();

  // if we know their [key]
  const m1 = t.match(/^if\s+we\s+know\s+their\s+([a-zA-Z][a-zA-Z0-9 _]*)\.?\s*$/i);
  if (m1) {
    return { type: 'known', key: m1[1].trim().toLowerCase().replace(/ /g, '_') };
  }

  // if [number] is bigger than [n]
  const m2 = t.match(/^if\s+\[([^\]]+)\]\s+is\s+bigger\s+than\s+(.+?)\.?\s*$/i);
  if (m2) return { type: 'comparison', subject: m2[1].trim(), operator: '>', value: m2[2].trim() };

  const m3 = t.match(/^if\s+\[([^\]]+)\]\s+is\s+smaller\s+than\s+(.+?)\.?\s*$/i);
  if (m3) return { type: 'comparison', subject: m3[1].trim(), operator: '<', value: m3[2].trim() };

  const m4 = t.match(/^if\s+\[([^\]]+)\]\s+equals?\s+(.+?)\.?\s*$/i);
  if (m4) return { type: 'comparison', subject: m4[1].trim(), operator: '=', value: m4[2].trim() };

  // if [thing] is an animal
  const m5 = t.match(/^if\s+\[([^\]]+)\]\s+is\s+(?:an?\s+)?([a-zA-Z][a-zA-Z0-9 _'-]*)\.?\s*$/i);
  if (m5) return { type: 'is_a', subject: m5[1].trim(), object: m5[2].trim().toLowerCase() };

  // if [thing] is not an animal
  const m6 = t.match(/^if\s+\[([^\]]+)\]\s+is\s+not\s+(?:an?\s+)?([a-zA-Z][a-zA-Z0-9 _'-]*)\.?\s*$/i);
  if (m6) return { type: 'not', inner: { type: 'is_a', subject: m6[1].trim(), object: m6[2].trim().toLowerCase() } };

  // if their [key] is [value]
  const m7 = t.match(/^if\s+their\s+([a-zA-Z][a-zA-Z0-9 _]*?)\s+is\s+([a-zA-Z][a-zA-Z0-9 _'-]*)\.?\s*$/i);
  if (m7) {
    return { type: 'memory_eq', key: m7[1].trim().toLowerCase().replace(/ /g, '_'), value: m7[2].trim().toLowerCase() };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Trigger parser
// ---------------------------------------------------------------------------

function parseTrigger(line) {
  const t = line.trim();

  // If someone says hello:
  const m1 = t.match(/^[Ii]f\s+someone\s+says?\s+(.+?)\s*:\s*$/i);
  if (m1) return { type: 'says', pattern: normaliseVarNames(m1[1].trim()) };

  // If someone asks What is your name?:
  const m2 = t.match(/^[Ii]f\s+someone\s+asks?\s+(.+?)\s*:\s*$/i);
  if (m2) return { type: 'asks', pattern: normaliseVarNames(m2[1].trim()) };

  // If I don't know:
  const m3 = t.match(/^[Ii]f\s+I\s+don'?t\s+know\s*:\s*$/i);
  if (m3) return { type: 'fallback' };

  // or someone says ...
  const m4 = t.match(/^[Oo]r\s+someone\s+says?\s+(.+?)\s*$/i);
  if (m4) return { type: 'or_says', pattern: normaliseVarNames(m4[1].trim()) };

  // or someone asks ...
  const m5 = t.match(/^[Oo]r\s+someone\s+asks?\s+(.+?)\s*$/i);
  if (m5) return { type: 'or_asks', pattern: normaliseVarNames(m5[1].trim()) };

  return null;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Parse chatbot source text into a Program.
 * @param {string} source
 * @returns {Program}
 */
function parse(source) {
  const program = {
    name: 'My Chatbot',
    personality: [],
    rules: [],
    facts: [],
    aliases: {},
    diagnostics: []
  };

  const lines = normaliseText(source).split('\n');
  let i = 0;

  function diag(type, message, suggestion) {
    program.diagnostics.push({ line: i + 1, type, message, suggestion });
  }

  function collectBody(headerIndent) {
    const body = [];
    while (i < lines.length) {
      const rawLine = lines[i];
      if (isBlank(rawLine) || isBlank(stripComment(rawLine))) { i++; continue; }
      const indent = indentOf(rawLine);
      if (indent <= headerIndent) break;
      body.push({ raw: rawLine, trimmed: stripComment(rawLine).trim(), lineNum: i + 1 });
      i++;
    }
    return body;
  }

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = stripComment(rawLine).trim();

    if (isBlank(line)) { i++; continue; }

    const indent = indentOf(rawLine);

    // ---- Chatbot name ----
    const nameMatch = line.match(/^[Mm]y\s+chatbot\s+is\s+called\s+(.+?)\.?\s*$/i);
    if (nameMatch) {
      program.name = nameMatch[1].trim();
      i++;
      continue;
    }

    // ---- Personality ----
    const persMatch = line.match(/^([A-Z][a-zA-Z0-9 ]+?)\s+is\s+(friendly|cheerful|formal|funny|helpful|quiet|short answers|long answers)\.?\s*$/i);
    if (persMatch) {
      program.personality.push(persMatch[2].trim().toLowerCase());
      i++;
      continue;
    }

    // ---- Alias definition ----
    // hello means:
    const aliasMatch = line.match(/^([a-zA-Z][a-zA-Z0-9 _'-]*?)\s+means\s*:\s*$/i);
    if (aliasMatch) {
      const aliasName = aliasMatch[1].trim().toLowerCase();
      i++;
      const body = collectBody(indent);
      program.aliases[aliasName] = body.map(b => b.trimmed.replace(/^\s*-\s*/, '').trim()).filter(Boolean);
      continue;
    }

    // ---- Trigger rule: If someone says / asks ----
    const trigger = parseTrigger(line);
    if (trigger) {
      if (trigger.type === 'fallback') {
        i++;
        const bodyLines = collectBody(indent);
        const actions = parseActionsFromBody(bodyLines, program, diag);
        program.rules.push({ type: 'fallback', actions, lineNumber: i });
        continue;
      }

      const rule = {
        type: 'trigger',
        trigger: trigger.pattern,
        triggerVars: extractVars(trigger.pattern || ''),
        actions: [],
        conditions: [],
        lineNumber: i + 1,
        orTriggers: []
      };

      i++;

      // Collect any "or someone says/asks" lines and conditions that follow
      while (i < lines.length) {
        const peek = stripComment(lines[i]).trim();
        if (isBlank(peek)) { i++; continue; }
        const orT = parseTrigger(peek);
        if (orT && (orT.type === 'or_says' || orT.type === 'or_asks')) {
          rule.orTriggers.push(orT.pattern);
          rule.triggerVars = [...new Set([...rule.triggerVars, ...extractVars(orT.pattern)])];
          i++;
          continue;
        }
        // "and the colour is brown:" — conjunctive condition before actions
        const andMatch = peek.match(/^and\s+(.+?)\s*:\s*$/i);
        if (andMatch) {
          const cond = parseCondition('if ' + andMatch[1]);
          if (cond) rule.conditions.push(cond);
          i++;
          continue;
        }
        break;
      }

      const bodyLines = collectBody(indent);
      rule.actions = parseActionsFromBody(bodyLines, program, diag);
      program.rules.push(rule);
      continue;
    }

    // ---- Question/Answer pair ----
    const qMatch = line.match(/^[Qq]uestion\s*:\s*(.+)$/);
    if (qMatch) {
      const question = normaliseVarNames(qMatch[1].trim());
      i++;
      // Next non-blank line should be Answer:
      while (i < lines.length && isBlank(stripComment(lines[i]).trim())) i++;
      if (i < lines.length) {
        const aLine = stripComment(lines[i]).trim();
        const aMatch = aLine.match(/^[Aa]nswer\s*:\s*(.+)$/);
        if (aMatch) {
          const answer = normaliseVarNames(aMatch[1].trim());
          program.rules.push({
            type: 'qa',
            trigger: question,
            triggerVars: extractVars(question),
            actions: [{ type: 'say', value: answer }],
            conditions: [],
            lineNumber: i + 1,
            orTriggers: []
          });
          i++;
        } else {
          diag('error', `Expected "Answer:" after "Question:" on line ${i + 1}`, 'Answer: My answer here.');
        }
      }
      continue;
    }

    // ---- Inference rule: If something is a dog / animal ----
    const infMatch = line.match(/^[Ii]f\s+something\s+is\s+(?:an?\s+)?([a-zA-Z][a-zA-Z0-9 _'-]*):\s*$/i);
    if (infMatch) {
      i++;
      const bodyLines = collectBody(indent);
      const actions = parseActionsFromBody(bodyLines, program, diag);
      program.rules.push({
        type: 'inference',
        ifCategory: infMatch[1].trim().toLowerCase(),
        actions,
        lineNumber: i,
        orTriggers: []
      });
      continue;
    }

    // ---- Fact ----
    const fact = parseFact(line);
    if (fact) {
      // Check for conflict
      const existing = program.facts.find(f =>
        f.subject === fact.subject &&
        f.predicate === fact.predicate &&
        f.object !== fact.object &&
        f.type === fact.type &&
        fact.type !== 'negative'
      );
      if (existing) {
        diag('warning',
          `Your chatbot has two different facts: "${fact.subject} is ${existing.object}" and "${fact.subject} is ${fact.object}".`,
          'Keep one, or add conditions.');
      }
      program.facts.push(fact);
      i++;
      continue;
    }

    // ---- Unknown line ----
    if (line.length > 0) {
      diag('warning', `I don't understand line ${i + 1}: "${line}"`,
        'Try: "If someone says hello:  \\n    say Hello!" or "A dog is an animal."');
    }
    i++;
  }

  return program;
}

// ---------------------------------------------------------------------------
// Parse actions from body lines (supporting sub-conditions: if/otherwise)
// ---------------------------------------------------------------------------

function parseActionsFromBody(bodyLines, program, diag) {
  const actions = [];
  let j = 0;

  while (j < bodyLines.length) {
    const { trimmed, lineNum } = bodyLines[j];

    // sub-condition: "if we know their name:"
    const subIfMatch = trimmed.match(/^if\s+(.+?)\s*:\s*$/i);
    if (subIfMatch) {
      const cond = parseCondition('if ' + subIfMatch[1]);
      // collect then-branch (indented further)
      const thenLines = [];
      j++;
      while (j < bodyLines.length) {
        const peek = bodyLines[j].trimmed;
        if (/^otherwise\s*:/i.test(peek)) break;
        thenLines.push(bodyLines[j]);
        j++;
      }
      const elseLines = [];
      if (j < bodyLines.length && /^otherwise\s*:/i.test(bodyLines[j].trimmed)) {
        j++;
        while (j < bodyLines.length) {
          elseLines.push(bodyLines[j]);
          j++;
        }
      }
      actions.push({
        type: 'conditional',
        condition: cond,
        then: parseActionsFromBody(thenLines, program, diag),
        else: parseActionsFromBody(elseLines, program, diag)
      });
      continue;
    }

    // "say one of:"
    if (/^say\s+one\s+of\s*:/i.test(trimmed)) {
      const options = [];
      j++;
      while (j < bodyLines.length) {
        const opt = bodyLines[j].trimmed.replace(/^\s*-\s*/, '').trim();
        if (opt) options.push(normaliseVarNames(opt));
        j++;
      }
      actions.push({ type: 'say_one_of', options, lineNumber: lineNum });
      continue;
    }

    const action = parseAction(trimmed, lineNum);
    actions.push(action);
    j++;
  }

  return actions;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate a parsed program, returning diagnostics.
 * @param {Program} program
 * @returns {Diagnostic[]}
 */
function validate(program) {
  const diags = [...program.diagnostics];

  // Warn about rules with no actions
  for (const rule of program.rules) {
    if (!rule.actions || rule.actions.length === 0) {
      diags.push({
        line: rule.lineNumber,
        type: 'warning',
        message: 'This rule has no actions. What should the chatbot do?',
        suggestion: '    say Hello!'
      });
    }
  }

  // Warn about two rules matching the same trigger
  const triggers = {};
  for (const rule of program.rules) {
    if (rule.trigger) {
      const key = rule.trigger.toLowerCase().trim();
      if (triggers[key]) {
        diags.push({
          line: rule.lineNumber,
          type: 'warning',
          message: `Two rules may both answer "${rule.trigger}". Rule ${triggers[key]} and rule ${rule.lineNumber}.`,
          suggestion: 'Choose which rule should come first, or remove one.'
        });
      } else {
        triggers[key] = rule.lineNumber;
      }
    }
  }

  return diags;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

if (typeof module !== 'undefined') {
  module.exports = { parse, validate, extractVars, normaliseVarNames };
}
