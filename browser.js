const util = require("./util");
const assert = require("assert");

/**
 * Utility for browsing the contents of a collection.
 *
 * Is loaded with documents, and then can move through it
 * one level at a time using the traverse function.
 */
const browser = {
  collection: null,
  docs: [],
  cursor: [],

  load: function(collection, docs) {
    this.collection = collection;
    this.docs = docs;
    this.cursor = [];
  },

  traverse: function(level, selection) {
    // depth 0 -> topmost layer of document
    const depth = level - util.levels.DOCUMENT_BASE;

    if (depth + 2 === this.cursor.length) {
      // we backed out a level, trim the cursor shorter
      this.cursor.pop();
      assert(selection === this.cursor[depth]);
      return this.get();
    }

    if (depth + 1 === this.cursor.length) {
      // we moved to a different branch on the same level
      this.cursor[depth] = selection;
      return this.get();
    }

    // make sure we didn't somehow skip a level otherwise
    assert(depth === this.cursor.length);
    this.cursor.push(selection);

    return this.get();
  },

  get: function(level) {
    const maxDepth =
      level === undefined
        ? this.cursor.length
        : level - util.levels.DOCUMENT_BASE;

    let result = this.docs;
    for (const depth in this.cursor) {
      if (depth >= maxDepth) break;
      result = result[this.cursor[depth]];
    }

    return result;
  },

  update: function(doc) {
    assert(this.cursor.length > 0);
    this.docs[this.cursor[0]] = doc;
  },

  insert: function(doc) {
    assert(!!doc._id);
    this.docs.push(doc);
  },

  delete: function(doc) {
    assert(!!doc._id);
    this.docs = this.docs.filter(d => d._id !== doc._id);
  },

  canAdvance: function() {
    if (!Object.keys(this.docs).length) return false;

    const item = this.get();
    return !util.isEmpty(item);
  }
};

module.exports = browser;
