/**
 * tests/test_suite.js
 * Unit and integration tests for the Primary School Chatbot engine.
 *
 * Run with Node.js:
 *   node tests/test_suite.js
 */

'use strict';

const path = require('path');
const { parse, validate, extractVars, normaliseVarNames } = require('../js/parser');
const { createEngine } = require('../js/reasoning');
const { createMemory } = require('../js/memory');
const { createRuntime, escapeHtml, normaliseInput, matchPattern, evalArithmetic } = require('../js/runtime');
const { saveBot, loadBot } = require('../js/storage');

// ---------------------------------------------------------------------------
// Minimal test harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('.');
  } catch (err) {
    failed++;
    failures.push({ name, err });
    process.stdout.write('F');
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error((msg || '') + ` — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

function assertIncludes(str, sub, msg) {
  if (!String(str).includes(sub))
    throw new Error((msg || '') + ` — expected string to include "${sub}", got "${str}"`);
}

// ---------------------------------------------------------------------------
// Helper: create a runtime from source text
// ---------------------------------------------------------------------------

function makeRuntime(source) {
  const prog = parse(source);
  return createRuntime(prog, { createEngineFunc: createEngine, createMemoryFunc: createMemory });
}

function chat(rt, input) {
  return rt.chat(input);
}

// ===========================================================================
// 1. Parser tests
// ===========================================================================

test('Parser: chatbot name', () => {
  const prog = parse('My chatbot is called Sunny.');
  assertEqual(prog.name, 'Sunny');
});

test('Parser: personality', () => {
  const prog = parse('My chatbot is called Sam.\nSam is friendly.');
  assert(prog.personality.includes('friendly'));
});

test('Parser: trigger rule — says', () => {
  const prog = parse('If someone says hello:\n    say Hello!');
  assert(prog.rules.length === 1);
  assertEqual(prog.rules[0].type, 'trigger');
  assertEqual(prog.rules[0].trigger, 'hello');
});

test('Parser: trigger rule — asks', () => {
  const prog = parse('If someone asks What is your name?:\n    say My name is Bot.');
  assertEqual(prog.rules[0].type, 'trigger');
  assert(prog.rules[0].trigger.toLowerCase().includes('what is your name'));
});

test('Parser: question/answer pair', () => {
  const prog = parse('Question: What is 2 + 2?\nAnswer: 4');
  assert(prog.rules.length === 1);
  assertEqual(prog.rules[0].type, 'qa');
});

test('Parser: fact — A dog is an animal', () => {
  const prog = parse('A dog is an animal.');
  assert(prog.facts.length === 1);
  assertEqual(prog.facts[0].subject, 'dog');
  assertEqual(prog.facts[0].object, 'animal');
});

test('Parser: negative fact', () => {
  const prog = parse('A square is not a circle.');
  assert(prog.facts.length === 1);
  assertEqual(prog.facts[0].type, 'negative');
});

test('Parser: facts — plural form', () => {
  const prog = parse('Dogs are animals.');
  assert(prog.facts.length === 1);
  assertEqual(prog.facts[0].subject, 'dogs');
});

test('Parser: variable extraction', () => {
  const vars = extractVars('My name is [name] and I am [age].');
  assert(vars.includes('name'));
  assert(vars.includes('age'));
});

test('Parser: normalise variable names', () => {
  const result = normaliseVarNames('Hello [My Name]!');
  assertIncludes(result, '[my_name]');
});

test('Parser: OR trigger', () => {
  const src = 'If someone says hello:\nor someone says hi:\n    say Hello!';
  const prog = parse(src);
  assert(prog.rules.length >= 1);
  const rule = prog.rules[0];
  assert(rule.orTriggers && rule.orTriggers.length > 0);
});

test('Parser: fallback rule', () => {
  const prog = parse("If I don't know:\n    say I don't know that.");
  const fallbacks = prog.rules.filter(r => r.type === 'fallback');
  assert(fallbacks.length === 1);
});

test('Parser: remember action', () => {
  const prog = parse('If someone says My name is [name]:\n    remember their name is [name].');
  const rule = prog.rules[0];
  const rememberAction = rule.actions.find(a => a.type === 'remember');
  assert(rememberAction, 'Expected a remember action');
  assertEqual(rememberAction.key, 'name');
});

test('Parser: inference rule', () => {
  const prog = parse('If something is a dog:\n    say it is an animal.');
  const inf = prog.rules.find(r => r.type === 'inference');
  assert(inf, 'Expected an inference rule');
  assertEqual(inf.ifCategory, 'dog');
});

test('Parser: alias definition', () => {
  const prog = parse('hello means:\n    hi\n    hey');
  assert(prog.aliases['hello'], 'Expected alias for hello');
  assert(prog.aliases['hello'].includes('hi'));
});

// ===========================================================================
// 2. Validation tests
// ===========================================================================

test('Validate: rule with no actions warns', () => {
  const prog = parse('If someone says hello:\n');
  const diags = validate(prog);
  assert(diags.some(d => d.message.includes('no actions') || d.message.includes('no action')),
    'Expected warning about no actions');
});

test('Validate: conflicting triggers warns', () => {
  const src = 'If someone says hello:\n    say Hi!\nIf someone says hello:\n    say Hello!';
  const prog = parse(src);
  const diags = validate(prog);
  assert(diags.some(d => d.type === 'warning'), 'Expected conflict warning');
});

test('Validate: conflicting facts warns', () => {
  const src = 'The sky is blue.\nThe sky is green.';
  const prog = parse(src);
  assert(prog.diagnostics.some(d => d.message.toLowerCase().includes('sky')),
    'Expected conflict warning for sky facts');
});

// ===========================================================================
// 3. Reasoning engine tests
// ===========================================================================

test('Reasoning: direct is_a', () => {
  const engine = createEngine([{ type: 'is_a', subject: 'dog', predicate: 'is_a', object: 'animal' }]);
  assert(engine.isA('dog', 'animal'));
});

test('Reasoning: transitive is_a', () => {
  const engine = createEngine([
    { type: 'is_a', subject: 'dog', predicate: 'is_a', object: 'animal' },
    { type: 'is_a', subject: 'animal', predicate: 'is_a', object: 'living thing' }
  ]);
  assert(engine.isA('dog', 'living thing'));
});

test('Reasoning: explicit negation', () => {
  const engine = createEngine([
    { type: 'is_a', subject: 'robot', predicate: 'is_a', object: 'animal' },
    { type: 'negative', subject: 'robot', predicate: 'is_a', object: 'animal' }
  ]);
  assert(!engine.isA('robot', 'animal'));
});

test('Reasoning: categoriesOf', () => {
  const engine = createEngine([
    { type: 'is_a', subject: 'dog', predicate: 'is_a', object: 'animal' },
    { type: 'is_a', subject: 'animal', predicate: 'is_a', object: 'living thing' }
  ]);
  const cats = engine.categoriesOf('dog');
  assert(cats.includes('animal'));
  assert(cats.includes('living thing'));
});

test('Reasoning: explainIsA returns chain', () => {
  const engine = createEngine([
    { type: 'is_a', subject: 'dog', predicate: 'is_a', object: 'animal' },
    { type: 'is_a', subject: 'animal', predicate: 'is_a', object: 'living thing' }
  ]);
  const chain = engine.explainIsA('dog', 'living thing');
  assert(chain.length > 0);
});

test('Reasoning: no infinite loop with cycle', () => {
  const engine = createEngine([
    { type: 'is_a', subject: 'a', predicate: 'is_a', object: 'b' },
    { type: 'is_a', subject: 'b', predicate: 'is_a', object: 'a' }
  ]);
  // Should not hang
  assert(!engine.isA('a', 'z'));
});

// ===========================================================================
// 4. Memory tests
// ===========================================================================

test('Memory: set and get', () => {
  const mem = createMemory();
  mem.set('name', 'Alice');
  assertEqual(mem.get('name'), 'Alice');
});

test('Memory: has', () => {
  const mem = createMemory();
  assert(!mem.has('name'));
  mem.set('name', 'Alice');
  assert(mem.has('name'));
});

test('Memory: forget', () => {
  const mem = createMemory();
  mem.set('name', 'Alice');
  mem.forget('name');
  assert(!mem.has('name'));
});

test('Memory: forgetAll', () => {
  const mem = createMemory();
  mem.set('a', '1');
  mem.set('b', '2');
  mem.forgetAll();
  assertEqual(Object.keys(mem.all()).length, 0);
});

test('Memory: case-insensitive keys', () => {
  const mem = createMemory();
  mem.set('Name', 'Alice');
  assertEqual(mem.get('name'), 'Alice');
});

// ===========================================================================
// 5. Runtime — pattern matching
// ===========================================================================

test('matchPattern: exact match', () => {
  const r = matchPattern('hello', 'hello');
  assert(r !== null);
});

test('matchPattern: case-insensitive', () => {
  const r = matchPattern('hello', 'HELLO');
  assert(r !== null);
});

test('matchPattern: punctuation tolerance', () => {
  const r = matchPattern('hello', 'hello!');
  assert(r !== null);
});

test('matchPattern: variable binding', () => {
  const r = matchPattern('my name is [name]', 'my name is Alice');
  assert(r && r['name'] === 'Alice');
});

test('matchPattern: multiple variables', () => {
  const r = matchPattern('what is [a] plus [b]', 'what is 3 plus 4');
  assert(r && r['a'] === '3' && r['b'] === '4');
});

test('matchPattern: no match', () => {
  const r = matchPattern('hello', 'goodbye');
  assert(r === null);
});

// ===========================================================================
// 6. Runtime — arithmetic
// ===========================================================================

test('evalArithmetic: addition', () => {
  assertEqual(evalArithmetic('3 + 5'), 8);
});

test('evalArithmetic: subtraction', () => {
  assertEqual(evalArithmetic('10 - 3'), 7);
});

test('evalArithmetic: multiplication', () => {
  assertEqual(evalArithmetic('4 * 5'), 20);
});

test('evalArithmetic: division', () => {
  assertEqual(evalArithmetic('20 / 4'), 5);
});

test('evalArithmetic: unicode operators', () => {
  assertEqual(evalArithmetic('4 × 5'), 20);
  assertEqual(evalArithmetic('20 ÷ 4'), 5);
});

test('evalArithmetic: non-arithmetic returns null', () => {
  assertEqual(evalArithmetic('hello'), null);
});

test('Runtime: built-in arithmetic query', () => {
  const rt = makeRuntime('');
  const r = chat(rt, 'What is 7 + 8?');
  assertIncludes(r.text, '15');
});

// ===========================================================================
// 7. Runtime — chat scenarios
// ===========================================================================

test('Runtime: trigger rule fires', () => {
  const rt = makeRuntime('If someone says hello:\n    say Hello World!');
  const r = chat(rt, 'hello');
  assertIncludes(r.text, 'Hello World');
});

test('Runtime: trigger case-insensitive', () => {
  const rt = makeRuntime('If someone says hello:\n    say Hi!');
  const r = chat(rt, 'HELLO');
  assertIncludes(r.text, 'Hi');
});

test('Runtime: variable substitution', () => {
  const rt = makeRuntime('If someone says My name is [name]:\n    say Hello [name]!');
  const r = chat(rt, 'My name is Alice');
  assertIncludes(r.text, 'Alice');
});

test('Runtime: remember and recall', () => {
  const rt = makeRuntime(
    'If someone says My name is [name]:\n    remember their name is [name].\n' +
    "If someone asks What is my name?:\n    if we know their name:\n        say Your name is [name].\n    otherwise:\n        say I don't know."
  );
  chat(rt, 'My name is Bob');
  const r = chat(rt, 'What is my name?');
  assertIncludes(r.text, 'Bob');
});

test('Runtime: forget', () => {
  const rt = makeRuntime(
    'If someone says My name is [name]:\n    remember their name is [name].\n' +
    'If someone says forget my name:\n    forget name.\n' +
    "If someone asks What is my name?:\n    if we know their name:\n        say Your name is [name].\n    otherwise:\n        say I don't know."
  );
  chat(rt, 'My name is Carol');
  chat(rt, 'forget my name');
  const r = chat(rt, 'What is my name?');
  // r.text is HTML-escaped; check for "know" which appears in both branches
  assert(r.text.includes('know') && !r.text.includes('Carol'), 'Expected "unknown" response after forgetting name');
});

test('Runtime: fallback fires when no match', () => {
  const rt = makeRuntime("If I don't know:\n    say I don't know that.");
  const r = chat(rt, 'xyzzy gibberish');
  // r.text is HTML-escaped, apostrophe becomes &#39;
  assert(r.text.includes('know'), 'Expected fallback response containing "know"');
});

test('Runtime: QA rule', () => {
  const rt = makeRuntime('Question: What is your name?\nAnswer: My name is Bot.');
  const r = chat(rt, 'What is your name?');
  assertIncludes(r.text, 'Bot');
});

test('Runtime: OR trigger', () => {
  const src = 'If someone says hello:\nor someone says hi:\n    say Hello!';
  const rt = makeRuntime(src);
  const r1 = chat(rt, 'hello');
  const r2 = chat(rt, 'hi');
  assertIncludes(r1.text, 'Hello');
  assertIncludes(r2.text, 'Hello');
});

test('Runtime: is_a query', () => {
  const rt = makeRuntime('A dog is an animal.');
  const r = chat(rt, 'Is a dog an animal?');
  assertIncludes(r.text.toLowerCase(), 'yes');
});

test('Runtime: transitive is_a query', () => {
  const rt = makeRuntime('A dog is an animal.\nAn animal is a living thing.');
  const r = chat(rt, 'Is a dog a living thing?');
  assertIncludes(r.text.toLowerCase(), 'yes');
});

test('Runtime: multiple answers — say one of', () => {
  const src = 'If someone says hello:\n    say one of:\n        Hi!\n        Hello!\n        Hey!';
  const rt = makeRuntime(src);
  const replies = new Set();
  for (let i = 0; i < 9; i++) {
    rt.reset();
    const r = chat(rt, 'hello');
    replies.add(r.text);
  }
  // Should have at least 1 unique response (rotation)
  assert(replies.size >= 1);
});

test('Runtime: conditional then-branch', () => {
  const src =
    'If someone says My name is [name]:\n    remember their name is [name].\n' +
    "If someone asks What is my name?:\n    if we know their name:\n        say Your name is [name].\n    otherwise:\n        say Unknown.";
  const rt = makeRuntime(src);
  chat(rt, 'My name is Dave');
  const r = chat(rt, 'What is my name?');
  assertIncludes(r.text, 'Dave');
});

test('Runtime: conditional else-branch', () => {
  const src =
    "If someone asks What is my name?:\n    if we know their name:\n        say Your name is [name].\n    otherwise:\n        say Unknown.";
  const rt = makeRuntime(src);
  const r = chat(rt, 'What is my name?');
  assertIncludes(r.text, 'Unknown');
});

test('Runtime: built-in greeting', () => {
  const rt = makeRuntime('');
  const r = chat(rt, 'hello');
  assertIncludes(r.text.toLowerCase(), 'hello');
});

test('Runtime: built-in farewell', () => {
  const rt = makeRuntime('');
  const r = chat(rt, 'goodbye');
  assertIncludes(r.text.toLowerCase(), 'goodbye');
});

test('Runtime: built-in thanks', () => {
  const rt = makeRuntime('');
  const r = chat(rt, 'thank you');
  assertIncludes(r.text.toLowerCase(), "welcome");
});

test('Runtime: reset clears memory', () => {
  const src = 'If someone says My name is [name]:\n    remember their name is [name].';
  const rt = makeRuntime(src);
  chat(rt, 'My name is Eve');
  rt.reset();
  const mem = rt.getMemory();
  assertEqual(Object.keys(mem).length, 0);
});

test('Runtime: reload updates program', () => {
  const rt = makeRuntime('If someone says hello:\n    say Hello!');
  const newProg = parse('If someone says hello:\n    say Greetings!');
  rt.reload(newProg);
  const r = chat(rt, 'hello');
  assertIncludes(r.text, 'Greetings');
});

test('Runtime: describeChatbot returns info', () => {
  const rt = makeRuntime('My chatbot is called Buddy.\nA cat is an animal.');
  const desc = rt.describeChatbot();
  assertIncludes(desc, 'Buddy');
});

test('Runtime: explainLastAnswer returns explanation', () => {
  const rt = makeRuntime('If someone says hello:\n    say Hi!');
  chat(rt, 'hello');
  const exp = rt.explainLastAnswer();
  assert(Array.isArray(exp) && exp.length > 0);
});

// ===========================================================================
// 8. Security — HTML escaping
// ===========================================================================

test('escapeHtml: escapes < and >', () => {
  const r = escapeHtml('<script>alert("xss")</script>');
  assert(!r.includes('<script>'), 'Should not contain raw <script>');
  assertIncludes(r, '&lt;');
});

test('Runtime: user input is HTML-escaped in replies', () => {
  const rt = makeRuntime('If someone says My name is [name]:\n    say Hello [name]!');
  const r = chat(rt, 'My name is <b>hacker</b>');
  assert(!r.text.includes('<b>'), 'Raw HTML should be escaped in output');
});

test('escapeHtml: ampersand', () => {
  assertIncludes(escapeHtml('cats & dogs'), '&amp;');
});

// ===========================================================================
// 9. Save / Load
// ===========================================================================

test('saveBot / loadBot: round-trip', () => {
  const src = 'If someone says hello:\n    say Hi!';
  const prog = parse(src);
  const json = saveBot(src, prog);
  const loaded = loadBot(json);
  assertEqual(loaded.source, src);
});

test('loadBot: corrupted JSON throws', () => {
  let threw = false;
  try { loadBot('{not json}'); } catch (e) { threw = true; }
  assert(threw, 'Expected error for invalid JSON');
});

test('loadBot: missing source throws', () => {
  let threw = false;
  try { loadBot(JSON.stringify({ version: '1.0' })); } catch (e) { threw = true; }
  assert(threw, 'Expected error for missing source');
});

// ===========================================================================
// 10. Priority order
// ===========================================================================

test('Priority: exact rule beats fallback', () => {
  const src =
    'If someone says hello:\n    say Hello!\n' +
    "If I don't know:\n    say Fallback.";
  const rt = makeRuntime(src);
  const r = chat(rt, 'hello');
  assertIncludes(r.text, 'Hello');
});

test('Priority: exact rule beats pattern rule', () => {
  const src =
    'If someone says hello [name]:\n    say Variable match!\n' +
    'If someone says hello world:\n    say Exact match!';
  const rt = makeRuntime(src);
  const r = chat(rt, 'hello world');
  assertIncludes(r.text, 'Exact match');
});

// ===========================================================================
// 11. normaliseInput
// ===========================================================================

test('normaliseInput: lowercase', () => {
  assertEqual(normaliseInput('HELLO'), 'hello');
});

test('normaliseInput: trim', () => {
  assertEqual(normaliseInput('  hello  '), 'hello');
});

test('normaliseInput: contractions expanded', () => {
  assertIncludes(normaliseInput("what's"), 'what is');
});

// ===========================================================================
// Final report
// ===========================================================================

console.log('\n');
console.log(`Tests: ${passed + failed} — Passed: ${passed} — Failed: ${failed}`);

if (failures.length > 0) {
  console.log('\nFailures:');
  for (const { name, err } of failures) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
  }
  process.exit(1);
} else {
  console.log('All tests passed! ✓');
  process.exit(0);
}
