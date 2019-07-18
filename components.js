const blessed = require("blessed");
const assert = require("assert");
const util = require("./util");

/**
 * Create a new column element for mongo-ranger
 *
 * Wraps blessed.list, and adds the following functions:
 * setLevel(level), getItems(), copyFrom(other), moveLevel(delta),
 * setKeys(keyList), getKey(index)
 *
 * @param options.width
 * @param options.left
 * @param options.right
 * @param options.level where 0 is Database, 1 is Collection, 2 is top level of Document, etc
 * @param options.search a function to run on key /, accepts a cb which expects a search string
 * @returns a column object
 */
function column(options) {
  const style = {
    item: {
      hover: {
        bg: "blue",
        bold: true
      }
    },
    selected: {
      bg: "blue",
      bold: true
    }
  };

  const col = blessed.list({
    left: options.left,
    width: options.width,
    right: options.right,
    height: "100%-2",
    tags: true,
    keys: true,
    vi: true,
    border: {
      type: "line"
    },
    style,
    search: options.search
  });

  // contains the raw keys used to index into the next level
  // unlike col.items which contains a human-readable formatted string
  col.keys = [];

  col.setKeys = keys => {
    col.keys = keys;
  };

  col.getKey = index => {
    return col.keys[index];
  };

  col.setLevel = level => {
    assert(level >= util.levels.DATABASE);
    col.level = level;
    col.setLabel(getLabel(level));
  };

  col.moveLevel = delta => {
    col.setLevel(col.level + delta);
  };

  col.getItems = () => {
    return col.items.map(i => i.content);
  };

  col.copyFrom = other => {
    col.setItems(other.getItems());
    col.select(other.selected);
    col.setLevel(other.level);
    col.setKeys(other.keys);
  };

  if (options.level != undefined) {
    col.setLevel(options.level);
  }

  col.on("focus", () => {
    if (col.level == undefined) {
      return;
    }

    // there doesn't seem to be a good way to do this from `style`
    col.setLabel(`{red-fg}{bold}${getLabel(col.level)}{/bold}{/red-fg}`);
  });

  col.on("blur", () => {
    if (col.level == undefined) {
      return;
    }

    // strips formatting
    col.setLabel(getLabel(col.level));
  });

  return col;
}

function getLabel(level) {
  switch (level) {
    case util.levels.DATABASE:
      return "Databases";
    case util.levels.COLLECTION:
      return "Collections";
    case util.levels.DOCUMENT_BASE:
      return "Documents";
  }

  return `Document (Level ${level - util.levels.DOCUMENT_BASE})`;
}

/**
 * Returns a log for debugging purposes anchored on the right of the screen.
 */
function logger() {
  const logger = blessed.log({
    left: "80%",
    height: "100%",
    label: "Debug Log",
    width: "20%",
    tags: true,
    border: {
      type: "line"
    }
  });

  logger.logObject = obj => logger.log(util.stringify(obj));

  return logger;
}

/**
 * Returns a textbox across the bottom of the screen
 */
function input() {
  const input = blessed.textbox({
    top: "100%-3",
    height: 3,
    tags: true,
    width: "100%",
    border: {
      type: "line"
    }
  });

  return input;
}

module.exports = {
  column,
  logger,
  input
};
