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
function createEngine(facts) {
  const positive = [];
  const negative = [];

  for (const f of facts) {
    if (f.type === 'negative') {
      negative.push(f);
    } else {
      positive.push(f);
    }
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

      for (const f of positive) {
        if (f.type === 'is_a' && f.subject === current) {
          if (f.object === category) return true;
          if (!visited.has(f.object)) stack.push(f.object);
        }
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

      for (const f of positive) {
        if (f.type === 'is_a' && f.subject === current) {
          if (!result.includes(f.object)) result.push(f.object);
          if (!visited.has(f.object)) stack.push(f.object);
        }
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

      for (const f of positive) {
        if (f.type === 'is_a' && f.subject === current) {
          const newPath = [...path, `${current} is a ${f.object}`];
          if (f.object === category) {
            return newPath;
          }
          stack.push([f.object, newPath]);
        }
      }
    }

    return steps;
  }

  return { isA, categoriesOf, membersOf, explainIsA, facts: positive, negativeFacts: negative };
}

if (typeof module !== 'undefined') {
  module.exports = { createEngine };
}
