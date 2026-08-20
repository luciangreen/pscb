/**
 * app.js
 * Main application entry point.
 * Wires together the chat UI, author panel, runtime, storage and export.
 */

'use strict';

/* global parse, validate, createEngine, createMemory, createRuntime,
          saveBot, loadBot, downloadFile, exportChatbot,
          createAuthor, createRuleBuilder */

// ---------------------------------------------------------------------------
// Default chatbot source shown on first load
// ---------------------------------------------------------------------------

const DEFAULT_SOURCE = `My chatbot is called Coco.
Coco is friendly.

If someone says hello:
    say Hello! How can I help?
If someone says goodbye:
    say Goodbye! Have a great day!
If someone says My name is [name]:
    remember their name is [name].
    say Nice to meet you, [name]!
If someone asks What is my name?:
    if we know their name:
        say Your name is [name].
    otherwise:
        say You haven't told me your name yet.

A dog is an animal.
A cat is an animal.
A bird is an animal.
An animal is a living thing.
If someone asks Is a [thing] an animal?:
    if [thing] is an animal:
        say Yes, a [thing] is an animal.
    otherwise:
        say I don't think [thing] is an animal.

If someone asks What is [a] plus [b]?:
    add [a] and [b].
    say The answer is [answer].

If I don't know:
    say I don't know that yet. You can teach me!
`;

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------

const chatTitle     = document.getElementById('chat-title');
const chatMessages  = document.getElementById('messages');
const userInput     = document.getElementById('user-input');
const sendBtn       = document.getElementById('send-btn');
const authorToggle  = document.getElementById('author-toggle');
const newChatBtn    = document.getElementById('new-chat-btn');
const authorPanel   = document.getElementById('author-panel');
const appWrapper    = document.querySelector('.app-wrapper');

const sourceEl      = document.getElementById('author-source');
const diagsEl       = document.getElementById('diagnostics');
const applyBtn      = document.getElementById('apply-btn');
const saveBtn       = document.getElementById('save-btn');
const loadInput     = document.getElementById('load-input');
const loadBtn       = document.getElementById('load-btn');
const exportBtn     = document.getElementById('export-btn');
const clearMemBtn   = document.getElementById('clear-mem-btn');

const rbContainer   = document.getElementById('rule-builder-container');
const inspectorEl   = document.getElementById('inspector-content');
const memoryEl      = document.getElementById('memory-content');

const tabBtns       = document.querySelectorAll('.author-tab');
const tabContents   = document.querySelectorAll('.tab-content');

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let program  = null;
let runtime  = null;
let lastReply = null;

// ---------------------------------------------------------------------------
// Runtime helpers
// ---------------------------------------------------------------------------

function buildRuntime(prog) {
  program = prog;
  runtime = createRuntime(program, {
    createEngineFunc: createEngine,
    createMemoryFunc: createMemory
  });
  chatTitle.textContent = program.name || 'My Chatbot';
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// Message rendering
// ---------------------------------------------------------------------------

function appendMessage(text, role) {
  const div = document.createElement('div');
  div.className = 'message ' + role;
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function appendSystem(text) {
  const div = document.createElement('div');
  div.className = 'message system';
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendBotReply(result) {
  if (result.text) {
    const msgEl = document.createElement('div');
    msgEl.className = 'message bot';
    // result.text is already HTML-escaped by runtime
    msgEl.innerHTML = result.text;
    chatMessages.appendChild(msgEl);
  }

  // Buttons
  if (result.buttons && result.buttons.length > 0) {
    const row = document.createElement('div');
    row.className = 'button-row';
    for (const label of result.buttons) {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        appendMessage(label, 'user');
        const r2 = runtime.chat(label);
        lastReply = r2;
        appendBotReply(r2);
      });
      row.appendChild(btn);
    }
    chatMessages.appendChild(row);
  }

  // Images
  if (result.images && result.images.length > 0) {
    for (const src of result.images) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.style.maxWidth = '200px';
      img.style.borderRadius = '8px';
      img.onerror = () => { img.style.display = 'none'; };
      chatMessages.appendChild(img);
    }
  }

  // "Why?" link
  if (result.explanation && result.explanation.length > 0) {
    const whyRow = document.createElement('div');
    whyRow.className = 'why-row';
    const whyBtn = document.createElement('button');
    whyBtn.className = 'why-btn';
    whyBtn.textContent = 'Why did you say that?';
    whyBtn.setAttribute('aria-expanded', 'false');

    const explanationBox = document.createElement('div');
    explanationBox.className = 'explanation-box hidden';
    explanationBox.setAttribute('role', 'region');
    explanationBox.setAttribute('aria-label', 'Explanation');
    explanationBox.textContent = result.explanation.join('\n');

    whyBtn.addEventListener('click', () => {
      const hidden = explanationBox.classList.toggle('hidden');
      whyBtn.setAttribute('aria-expanded', String(!hidden));
    });

    whyRow.appendChild(whyBtn);
    chatMessages.appendChild(whyRow);
    chatMessages.appendChild(explanationBox);
  }

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ---------------------------------------------------------------------------
// Send message
// ---------------------------------------------------------------------------

function sendMessage() {
  const text = userInput.value.trim();
  if (!text || !runtime) return;
  appendMessage(text, 'user');
  userInput.value = '';

  const result = runtime.chat(text);
  lastReply = result;
  appendBotReply(result);
  updateInspector();
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// ---------------------------------------------------------------------------
// New conversation
// ---------------------------------------------------------------------------

newChatBtn.addEventListener('click', () => {
  if (runtime) runtime.reset();
  chatMessages.innerHTML = '';
  appendSystem('Conversation cleared.');
  const greeting = runtime.chat('hello');
  lastReply = greeting;
  appendBotReply(greeting);
  updateInspector();
});

// ---------------------------------------------------------------------------
// Author toggle
// ---------------------------------------------------------------------------

authorToggle.addEventListener('click', () => {
  const visible = authorPanel.classList.toggle('visible');
  appWrapper.classList.toggle('author-open', visible);
  authorToggle.classList.toggle('active', visible);
  authorToggle.setAttribute('aria-expanded', String(visible));
  if (visible) updateInspector();
});

// ---------------------------------------------------------------------------
// Author tabs
// ---------------------------------------------------------------------------

tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
    tabContents.forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    const target = btn.dataset.tab;
    document.getElementById('tab-' + target).classList.add('active');
    if (target === 'inspector') updateInspector();
  });
});

// ---------------------------------------------------------------------------
// Apply chatbot source
// ---------------------------------------------------------------------------

function applySource(source) {
  const prog = parse(source);
  buildRuntime(prog);
  appendSystem('Chatbot updated: ' + (prog.name || 'My Chatbot'));
  updateInspector();
}

applyBtn.addEventListener('click', () => {
  applySource(sourceEl.value);
});

// ---------------------------------------------------------------------------
// Save / Load
// ---------------------------------------------------------------------------

saveBtn.addEventListener('click', () => {
  const prog = parse(sourceEl.value);
  const json = saveBot(sourceEl.value, prog);
  const name = (prog.name || 'chatbot').toLowerCase().replace(/\s+/g, '_');
  downloadFile(name + '.chatbot', json, 'application/json');
});

loadBtn.addEventListener('click', () => {
  loadInput.click();
});

loadInput.addEventListener('change', () => {
  const file = loadInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const loaded = loadBot(e.target.result);
      sourceEl.value = loaded.source;
      author.validate_now();
      applySource(loaded.source);
    } catch (err) {
      appendSystem('Could not load file: ' + err.message);
    }
  };
  reader.readAsText(file);
  loadInput.value = '';
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

exportBtn.addEventListener('click', () => {
  const prog = parse(sourceEl.value);
  const html = exportChatbot(
    sourceEl.value,
    prog,
    document.getElementById('parser-src').textContent,
    document.getElementById('reasoning-src').textContent,
    document.getElementById('memory-src').textContent,
    document.getElementById('runtime-src').textContent
  );
  const name = (prog.name || 'chatbot').toLowerCase().replace(/\s+/g, '_');
  downloadFile(name + '.html', html, 'text/html');
});

// ---------------------------------------------------------------------------
// Clear memory
// ---------------------------------------------------------------------------

clearMemBtn.addEventListener('click', () => {
  if (runtime) {
    runtime.clearMemory();
    appendSystem('Memory cleared.');
    updateInspector();
  }
});

// ---------------------------------------------------------------------------
// Rule builder
// ---------------------------------------------------------------------------

createRuleBuilder(rbContainer, (lines) => {
  sourceEl.value += '\n' + lines;
  author.validate_now();
  // Switch to editor tab to show the insertion
  tabBtns.forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });
  tabContents.forEach(c => c.classList.remove('active'));
  const editorTab = document.querySelector('[data-tab="editor"]');
  if (editorTab) {
    editorTab.classList.add('active');
    editorTab.setAttribute('aria-selected', 'true');
  }
  const editorContent = document.getElementById('tab-editor');
  if (editorContent) editorContent.classList.add('active');
});

// ---------------------------------------------------------------------------
// Knowledge inspector
// ---------------------------------------------------------------------------

function updateInspector() {
  if (!program || !runtime) return;

  const facts = program.facts || [];
  const rules = (program.rules || []).filter(r => r.type !== 'fallback');
  const mem   = runtime.getMemory();
  const memEntries = Object.entries(mem);

  // Stats
  inspectorEl.innerHTML = `
    <div class="stat-box">
      <div class="stat-item"><span class="stat-num">${facts.length}</span><span class="stat-label">Facts</span></div>
      <div class="stat-item"><span class="stat-num">${rules.length}</span><span class="stat-label">Rules</span></div>
      <div class="stat-item"><span class="stat-num">${memEntries.length}</span><span class="stat-label">Memories</span></div>
      <div class="stat-item"><span class="stat-num">${Object.keys(program.aliases || {}).length}</span><span class="stat-label">Intents</span></div>
    </div>
    ${facts.length === 0 ? '<p style="font-size:0.85rem;color:var(--text-muted)">No facts yet.</p>' : ''}
    ${facts.length > 0 ? `<table class="inspector-table"><tbody>${
      facts.map(f => {
        const label = f.type === 'negative'
          ? `${f.subject} is NOT ${f.object}`
          : `${f.subject} is a ${f.object}`;
        return `<tr><td>${escHtml(label)}</td></tr>`;
      }).join('')
    }</tbody></table>` : ''}
  `;

  // Memory table
  memoryEl.innerHTML = memEntries.length === 0
    ? '<p style="font-size:0.85rem;color:var(--text-muted)">No information stored yet.</p>'
    : `<table class="memory-table">
        <thead><tr><th>Key</th><th>Value</th></tr></thead>
        <tbody>${memEntries.map(([k, v]) =>
          `<tr><td>${escHtml(k.replace(/_/g, ' '))}</td><td>${escHtml(v)}</td></tr>`
        ).join('')}</tbody>
      </table>`;
}

// ---------------------------------------------------------------------------
// Live author validation
// ---------------------------------------------------------------------------

const author = createAuthor({
  sourceEl,
  diagsEl,
  onChange: (_src, prog) => {
    chatTitle.textContent = prog.name || 'My Chatbot';
  }
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

(function init() {
  sourceEl.value = DEFAULT_SOURCE;
  const prog = parse(DEFAULT_SOURCE);
  buildRuntime(prog);
  author.validate_now();

  const greeting = runtime.chat('hello');
  lastReply = greeting;
  appendBotReply(greeting);
})();
