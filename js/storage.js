/**
 * storage.js
 * Save and load chatbot definitions to/from JSON files.
 */

'use strict';

/**
 * Serialise a chatbot program to a JSON string.
 * @param {object} program
 * @returns {string}
 */
function saveBot(source, program) {
  const data = {
    version: '1.0',
    name: program.name || 'My Chatbot',
    personality: program.personality || [],
    source: source || ''
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Parse a saved JSON string back into a source+meta object.
 * @param {string} json
 * @returns {{ source: string, name: string, personality: string[] }}
 */
function loadBot(json) {
  let data;
  try {
    data = JSON.parse(json);
  } catch (e) {
    throw new Error('Could not read the chatbot file. It may be corrupted.');
  }
  if (!data.source) throw new Error('The chatbot file does not contain any rules.');
  return {
    source: data.source,
    name: data.name || 'My Chatbot',
    personality: data.personality || []
  };
}

/**
 * Trigger a browser file download.
 */
function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType || 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

if (typeof module !== 'undefined') {
  module.exports = { saveBot, loadBot };
}
