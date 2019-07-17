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
 * @param options.level where 0 is Database, 1 is Collection, 2 is top level of Document, etc
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
    left: options.left || "0",
    width: options.width,
    height: "100%",
    tags: true,
    keys: true,
    vi: true,
    border: {
      type: "line"
    },
    style
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

module.exports = {
  column
};
