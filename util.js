const assert = require("assert");
const blessed = require("blessed");

// Levels used by columns generated by components.js
const levels = {
  DATABASE: 0,
  COLLECTION: 1,
  DOCUMENT_BASE: 2
};

/**
 * Used for handling errors in async functions called by event handlers.
 * Terminates the program if any error occurs.
 *
 * @param {Screen} screen blessed screen to terminate on error
 * @param {function} fn async function to run
 */
function crashOnError(screen, fn) {
  return (...args) => {
    return fn(...args).catch(e => {
      if (screen) screen.destroy();
      console.error(e);
      return process.exit(1);
    });
  };
}

const colCache = {};

/**
 * Save a column's data, so that it can be loaded at a later time.
 *
 * @param {Column} col
 */
function saveColumn(col) {
  colCache[col.level] = {
    items: col.getItems(),
    selected: col.selected,
    keys: col.keys
  };
}

/**
 * Load a previously stored column's data into the specified target.
 *
 * @param {Column} col targets column to load data into
 * @param {Number} level level of the column to load
 */
function loadColumn(col, level) {
  col.setItems(colCache[level].items);
  col.select(colCache[level].selected);
  col.setKeys(colCache[level].keys);
  col.setLevel(level);
}

/**
 * Utility for browsing the contents of a collection.
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
    const depth = level - levels.DOCUMENT_BASE;

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
      level === undefined ? this.cursor.length : level - levels.DOCUMENT_BASE;

    let result = this.docs;
    for (const depth in this.cursor) {
      if (depth > maxDepth) break;
      result = result[this.cursor[depth]];
    }

    return result;
  },

  canAdvance: function() {
    if (!Object.keys(this.docs).length) return false;

    const item = this.get();
    if (Array.isArray(item)) {
      return item.length > 0;
    }

    if (isObject(item)) {
      return Object.keys(item).length > 0;
    }

    return false;
  }
};

function isObject(obj) {
  return !!obj && typeof obj === "object";
}

function stringifyWrapper(obj) {
  return stringifyWithLimit(obj, (process.stdout.columns || 128) / 2);
}

function stringifyWithLimit(obj, maxLength) {
  const str = stringify(obj);
  if (!str || str.length < maxLength) return str;

  // handle large string that may need to be trimmed
  const parts = str.split("{/}");
  let result = "";
  for (const part of parts) {
    result += part + "{/}";

    if (
      result.length >= maxLength && // short circuit to avoid many strip tags
      blessed.stripTags(result).length >= maxLength
    ) {
      result += "...";
      break;
    }
  }

  return result;
}

// like JSON.stringify but a bit prettier
function stringify(obj) {
  if (obj === undefined || obj === null) {
    return colorize("null");
  }

  if (obj.toJSON) {
    // e.g. dates which implement a toJSON
    const json = obj.toJSON();
    if (json.length) return colorize(json);
    return colorize("{Object}"); // some weird object
  }

  if (Array.isArray(obj)) {
    if (obj.length > 8) {
      // too big to display
      return colorize(`[ Array of length ${obj.length} ]`);
    }

    return "[ " + obj.map(val => stringify(val)).join(", ") + " ]";
  }

  if (isObject(obj)) {
    return (
      "{ " +
      Object.keys(obj)
        .map(k => `{bold}${k}{/}: ${stringify(obj[k])}`)
        .join(", ") +
      " }"
    );
  }

  return colorize(JSON.stringify(obj));
}

// syntax highlighting
function colorize(str) {
  if (!str.length) return "";

  if (str[0] === '"') {
    return `{cyan-fg}${str}{/}`;
  }

  if (!isNaN(str)) {
    return `{green-fg}${str}{/}`;
  }

  // some other type like ObjectID or date
  return `{red-fg}${str}{/}`;
}

/**
 * Convert string to a JS object, to be fed to the mongo driver.
 * Will throw an error if the string is malformed.
 * @param {String} string to convert
 */
function stringToQuery(string) {
  // todo: should avoid using eval
  return eval(`(${string})`);
}

module.exports = {
  crashOnError,
  saveColumn,
  loadColumn,
  levels,
  isObject,
  stringify: stringifyWrapper,
  browser,
  stringToQuery
};
