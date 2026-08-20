/**
 * author.js
 * Author / Edit mode logic.
 * Handles the rule-builder visual editor and live validation UI.
 */

'use strict';

/* global parse, validate */

/**
 * Create an author-mode controller.
 *
 * @param {object} opts
 * @param {HTMLTextAreaElement} opts.sourceEl  - the <textarea> for the source text
 * @param {HTMLElement}         opts.diagsEl   - container for diagnostics display
 * @param {function}            opts.onChange  - called when the source is updated and valid
 * @returns {object}
 */
function createAuthor(opts) {
  const { sourceEl, diagsEl, onChange } = opts;
  let debounceTimer = null;

  function renderDiagnostics(diags) {
    diagsEl.innerHTML = '';

    if (!diags || diags.length === 0) {
      const ok = document.createElement('div');
      ok.className = 'diag-item ok';
      ok.innerHTML = '<span class="diag-icon" aria-hidden="true">✓</span><span>I understand all your rules.</span>';
      diagsEl.appendChild(ok);
      return;
    }

    for (const d of diags) {
      const el = document.createElement('div');
      el.className = 'diag-item ' + (d.type === 'error' ? 'error' : 'warning');
      const icon = d.type === 'error' ? '✗' : '?';
      const lineInfo = d.line ? `Line ${d.line}: ` : '';
      el.innerHTML =
        `<span class="diag-icon" aria-hidden="true">${icon}</span>` +
        `<span><strong>${lineInfo}</strong>${escAuthor(d.message)}` +
        (d.suggestion ? `<br><em>Suggestion: ${escAuthor(d.suggestion)}</em>` : '') +
        '</span>';
      diagsEl.appendChild(el);
    }
  }

  function escAuthor(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function liveValidate() {
    const source = sourceEl.value;
    const program = parse(source);
    const diags = validate(program);
    renderDiagnostics(diags);
    if (onChange) onChange(source, program);
  }

  function scheduleValidate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(liveValidate, 400);
  }

  sourceEl.addEventListener('input', scheduleValidate);

  function getSource() {
    return sourceEl.value;
  }

  function setSource(text) {
    sourceEl.value = text;
    liveValidate();
  }

  function validateNow() {
    liveValidate();
  }

  return { getSource, setSource, validateNow, renderDiagnostics };
}

/**
 * Build the visual rule-builder DOM and return a controller.
 *
 * @param {HTMLElement} containerEl
 * @param {function} onInsert  - called with the generated source line(s)
 * @returns {object}
 */
function createRuleBuilder(containerEl, onInsert) {
  containerEl.innerHTML = '';

  // WHEN section
  const whenLabel = document.createElement('div');
  whenLabel.className = 'rb-label';
  whenLabel.textContent = 'WHEN';

  const whenRow = document.createElement('div');
  whenRow.className = 'rb-row rb-section';

  const whenType = document.createElement('select');
  whenType.className = 'rb-select';
  whenType.setAttribute('aria-label', 'Trigger type');
  [
    ['says', 'someone says'],
    ['asks', 'someone asks'],
    ['fallback', "I don't know"]
  ].forEach(([v, t]) => {
    const o = document.createElement('option');
    o.value = v; o.textContent = t;
    whenType.appendChild(o);
  });

  const whenInput = document.createElement('input');
  whenInput.className = 'rb-input';
  whenInput.type = 'text';
  whenInput.placeholder = 'e.g. hello  or  My name is [name]';
  whenInput.style.flex = '1';
  whenInput.setAttribute('aria-label', 'Trigger phrase');

  whenRow.appendChild(whenType);
  whenRow.appendChild(whenInput);

  whenType.addEventListener('change', () => {
    whenInput.style.display = whenType.value === 'fallback' ? 'none' : '';
  });

  // DO section
  const doLabel = document.createElement('div');
  doLabel.className = 'rb-label';
  doLabel.style.marginTop = '0.75rem';
  doLabel.textContent = 'DO';

  const doRow = document.createElement('div');
  doRow.className = 'rb-row rb-section';

  const doType = document.createElement('select');
  doType.className = 'rb-select';
  doType.setAttribute('aria-label', 'Action type');
  [
    ['say', 'say'],
    ['remember', 'remember'],
    ['forget', 'forget']
  ].forEach(([v, t]) => {
    const o = document.createElement('option');
    o.value = v; o.textContent = t;
    doType.appendChild(o);
  });

  const doInput = document.createElement('input');
  doInput.className = 'rb-input';
  doInput.type = 'text';
  doInput.placeholder = 'e.g. Hello!  or  name = [name]';
  doInput.style.flex = '1';
  doInput.setAttribute('aria-label', 'Action value');

  doRow.appendChild(doType);
  doRow.appendChild(doInput);

  // Insert button
  const insertBtn = document.createElement('button');
  insertBtn.className = 'btn btn-primary';
  insertBtn.style.marginTop = '0.75rem';
  insertBtn.textContent = 'Add rule to chatbot';

  insertBtn.addEventListener('click', () => {
    const whenVal = whenType.value;
    const phrase = whenInput.value.trim();
    const action = doType.value;
    const actionVal = doInput.value.trim();

    if (whenVal !== 'fallback' && !phrase) {
      whenInput.focus();
      return;
    }
    if (!actionVal) {
      doInput.focus();
      return;
    }

    let lines = '';
    if (whenVal === 'fallback') {
      lines = `If I don't know:\n    ${action} ${actionVal}\n`;
    } else {
      const keyword = whenVal === 'says' ? 'says' : 'asks';
      lines = `If someone ${keyword} ${phrase}:\n    ${action} ${actionVal}\n`;
    }

    if (onInsert) onInsert(lines);

    // Clear inputs
    whenInput.value = '';
    doInput.value = '';
    whenInput.focus();
  });

  containerEl.appendChild(whenLabel);
  containerEl.appendChild(whenRow);
  containerEl.appendChild(doLabel);
  containerEl.appendChild(doRow);
  containerEl.appendChild(insertBtn);

  return { container: containerEl };
}

if (typeof module !== 'undefined') {
  module.exports = { createAuthor, createRuleBuilder };
}
