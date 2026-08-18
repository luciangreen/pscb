/**
 * memory.js
 * Conversation memory: stores key/value pairs for the current session.
 */

'use strict';

function createMemory() {
  const store = {};

  function set(key, value) {
    store[key.toLowerCase()] = value;
  }

  function get(key) {
    return store[key.toLowerCase()];
  }

  function has(key) {
    return key.toLowerCase() in store;
  }

  function forget(key) {
    delete store[key.toLowerCase()];
  }

  function forgetAll() {
    for (const k of Object.keys(store)) {
      delete store[k];
    }
  }

  function all() {
    return Object.assign({}, store);
  }

  function describe() {
    const entries = Object.entries(store);
    if (entries.length === 0) return 'No information stored yet.';
    return entries.map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join('\n');
  }

  return { set, get, has, forget, forgetAll, all, describe };
}

if (typeof module !== 'undefined') {
  module.exports = { createMemory };
}
