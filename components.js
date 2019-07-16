const blessed = require("blessed");
const assert = require("assert");

/**
 * Create a new column element for mongor
 *
 * @param options.width
 * @param options.left
 * @param options.level where 0 is Database, 1 is Collection, 2 is top level of Document, etc
 * @returns a blessed.list object, with added functions: setLevel(level), getItems(), copyFrom(other), moveLevel(delta)
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
    height: "100%-2",
    tags: true,
    keys: true,
    vi: true,
    border: {
      type: "line"
    },
    style
  });

  col.setLevel = level => {
    assert(level >= 0);
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
    case 0:
      return "Databases";
    case 1:
      return "Collections";
    case 2:
      return "Documents";
  }

  return `Document (Level ${level - 2})`;
}

module.exports = {
  column
};
