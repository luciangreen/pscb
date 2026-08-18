/**
 * export.js
 * Export the chatbot as a self-contained HTML web page.
 */

'use strict';

/**
 * Generate a self-contained chatbot HTML page.
 * @param {string} source - authored rules source text
 * @param {object} program - parsed program
 * @param {string} parserSource - contents of parser.js
 * @param {string} reasoningSource - contents of reasoning.js
 * @param {string} memorySource - contents of memory.js
 * @param {string} runtimeSource - contents of runtime.js
 * @returns {string} full HTML
 */
function exportChatbot(source, program, parserSource, reasoningSource, memorySource, runtimeSource) {
  const botName = (program.name || 'My Chatbot').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escapedSource = source.replace(/`/g, '\\`').replace(/\\/g, '\\\\').replace(/\$/g, '\\$');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${botName}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f2f5; display: flex;
           justify-content: center; align-items: center; min-height: 100vh; padding: 1rem; }
    .chat-container { background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.12);
                      width: 100%; max-width: 480px; display: flex; flex-direction: column; height: 90vh; max-height: 700px; }
    .chat-header { background: #4f46e5; color: #fff; padding: 1rem 1.25rem; border-radius: 16px 16px 0 0;
                   display: flex; align-items: center; gap: 0.75rem; }
    .chat-avatar { width: 40px; height: 40px; border-radius: 50%; background: #818cf8;
                   display: flex; align-items: center; justify-content: center; font-size: 1.25rem; }
    .chat-title { flex: 1; font-size: 1.1rem; font-weight: 600; }
    .chat-messages { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .message { max-width: 80%; padding: 0.625rem 0.875rem; border-radius: 16px; line-height: 1.5; font-size: 0.95rem; }
    .message.bot { background: #f3f4f6; color: #111; align-self: flex-start; border-bottom-left-radius: 4px; }
    .message.user { background: #4f46e5; color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
    .chat-input-row { padding: 0.75rem 1rem; border-top: 1px solid #e5e7eb; display: flex; gap: 0.5rem; }
    .chat-input { flex: 1; padding: 0.625rem 0.875rem; border: 1.5px solid #d1d5db; border-radius: 24px;
                  font-size: 0.95rem; outline: none; }
    .chat-input:focus { border-color: #4f46e5; }
    .chat-send { background: #4f46e5; color: #fff; border: none; border-radius: 24px; padding: 0.625rem 1.125rem;
                 font-size: 0.95rem; cursor: pointer; font-weight: 600; }
    .chat-send:hover { background: #4338ca; }
  </style>
</head>
<body>
<div class="chat-container" role="main">
  <header class="chat-header">
    <div class="chat-avatar" aria-hidden="true">🤖</div>
    <span class="chat-title">${botName}</span>
  </header>
  <div class="chat-messages" id="messages" aria-live="polite" aria-label="Conversation"></div>
  <div class="chat-input-row">
    <label for="userInput" class="sr-only">Your message</label>
    <input class="chat-input" id="userInput" type="text" placeholder="Ask something..." autocomplete="off" aria-label="Your message">
    <button class="chat-send" id="sendBtn">Send</button>
  </div>
</div>

<script>
// ---- Embedded runtime ----
${parserSource}
${reasoningSource}
${memorySource}
${runtimeSource}

const SOURCE = \`${escapedSource}\`;
const program = parse(SOURCE);
const runtime = createRuntime(program, { createEngineFunc: createEngine, createMemoryFunc: createMemory });

function addMessage(text, who) {
  const msgs = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = 'message ' + who;
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById('userInput');
  const text = input.value.trim();
  if (!text) return;
  addMessage(text, 'user');
  input.value = '';
  const result = runtime.chat(text);
  addMessage(result.text, 'bot');
}

document.getElementById('sendBtn').addEventListener('click', sendMessage);
document.getElementById('userInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') sendMessage();
});

addMessage('Hello! How can I help?', 'bot');
</script>
</body>
</html>`;
}

if (typeof module !== 'undefined') {
  module.exports = { exportChatbot };
}
