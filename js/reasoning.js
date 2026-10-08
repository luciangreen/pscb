/**
 * reasoning.js
 * Logical inference engine for chatbot facts and rules.
 * Supports is_a chains, negative facts, and simple category reasoning.
 */

'use strict';

/**
 * Create a new reasoning engine from a program's facts.
 * @param {import('./parser').Fact[]} facts
 * @returns {object}
 */
function createEngine(facts, rules) {
  const positive = [];
  const negative = [];
  const implications = [];

  for (const f of facts) {
    if (f.type === 'negative') {
      negative.push(f);
    } else {
      positive.push(f);
    }
  }

  for (const rule of (rules || [])) {
    if (rule.type === 'inference') {
      for (const action of (rule.actions || [])) {
        if (action.type === 'infer_is_a') {
          implications.push({ subject: rule.ifCategory, object: action.category });
        }
      }
    }
  }

  function nextCategories(category) {
    return positive.filter(f => f.type === 'is_a' && f.subject === category).map(f => f.object)
      .concat(implications.filter(r => r.subject === category).map(r => r.object));
  }

  /**
   * Check whether subject is_a category (transitively).
   * Uses iterative DFS to avoid infinite loops.
   */
  function isA(subject, category) {
    subject = subject.trim().toLowerCase();
    category = category.trim().toLowerCase();

    if (subject === category) return true;

    // Check explicit negation first
    for (const n of negative) {
      if (n.subject === subject && n.object === category) return false;
    }

    const visited = new Set();
    const stack = [subject];

    while (stack.length > 0) {
      const current = stack.pop();
      if (visited.has(current)) continue;
      visited.add(current);

      for (const next of nextCategories(current)) {
        if (next === category) return true;
        if (!visited.has(next)) stack.push(next);
      }
    }

    return false;
  }

  /**
   * Return all categories a subject belongs to (transitively).
   */
  function categoriesOf(subject) {
    subject = subject.trim().toLowerCase();
    const result = [];
    const visited = new Set();
    const stack = [subject];

    while (stack.length > 0) {
      const current = stack.pop();
      if (visited.has(current)) continue;
      visited.add(current);

      for (const next of nextCategories(current)) {
        if (!result.includes(next)) result.push(next);
        if (!visited.has(next)) stack.push(next);
      }
    }

    return result;
  }

  /**
   * Return all members of a category (directly).
   */
  function membersOf(category) {
    category = category.trim().toLowerCase();
    const result = [];
    for (const f of positive) {
      if (f.type === 'is_a' && f.object === category) {
        result.push(f.subject);
      }
    }
    return result;
  }

  /**
   * Build an explanation trace for isA.
   * Returns array of strings describing the reasoning chain.
   */
  function explainIsA(subject, category) {
    subject = subject.trim().toLowerCase();
    category = category.trim().toLowerCase();

    if (subject === category) return [`${subject} is the same as ${category}.`];

    const steps = [];
    const visited = new Set();
    const stack = [[subject, []]];

    while (stack.length > 0) {
      const [current, path] = stack.pop();
      if (visited.has(current)) continue;
      visited.add(current);

      for (const next of nextCategories(current)) {
        const isRule = implications.some(rule => rule.subject === current && rule.object === next);
        const newPath = [...path, isRule
          ? `Your rule says that anything that is a ${current} is also a ${next}.`
          : `${current} is a ${next}`];
        if (next === category) return newPath;
        stack.push([next, newPath]);
      }
    }

    return steps;
  }

  function isNotA(subject, category) {
    subject = subject.trim().toLowerCase();
    category = category.trim().toLowerCase();
    return negative.some(f => f.subject === subject && f.object === category);
  }

  return { isA, isNotA, categoriesOf, membersOf, explainIsA, facts: positive, negativeFacts: negative };
}

if (typeof module !== 'undefined') {
  module.exports = { createEngine };
}
