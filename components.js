const blessed = require("blessed");
const assert = require("assert");

/**
 * Create a new column element for mongor
 *
 * @param options.width
 * @param options.left
 * @param options.level where 0 is Database, 1 is Collection, 2 is top level of Document, etc
 * @returns a blessed.list object, with an added .setLevel() function
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
    },
    focus: {
      border: {
        bold: true
      }
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

  col.setLevel = level => {
    assert(level >= 0);

    switch (level) {
      case 0:
        col.setLabel("Databases");
        break;
      case 1:
        col.setLabel("Collections");
        break;
      case 2:
        col.setLabel("Documents");
        break;
      default:
        col.setLabel(`Document (Level ${level - 1})`);
    }
  };

  if (options.level != undefined) {
    col.setLevel(options.level);
  }

  return col;
}

module.exports = {
  column
};
