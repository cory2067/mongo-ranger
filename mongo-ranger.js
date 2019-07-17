const blessed = require("blessed");
const assert = require("assert");
const MongoClient = require("mongodb").MongoClient;

const components = require("./components");
const util = require("./util");

let focused = 0;
let client, db, screen, logger;

async function main(options) {
  const uri = options.port ? `${options.host}:${options.port}` : options.host;
  console.log(`Connecting to ${uri}`);

  client = new MongoClient(uri, {
    useNewUrlParser: true,
    appname: "mongo-ranger"
  });

  await client.connect();
  const admin = client.db("test").admin();
  const dbs = await admin.listDatabases();

  screen = blessed.screen({
    title: "mongo-ranger",
    smartCSR: true,
    dockBorders: true
  });

  // this should be customizable
  // janky arbitrary values
  const cols = [
    components.column({
      width: "18%",
      level: 0
    }),

    components.column({
      left: "16%",
      width: "36%",
      level: 1
    }),

    components.column({
      left: "49%",
      width: "51%",
      level: 2
    })
  ];

  const numCols = cols.length;

  // list of databases is only fetched once
  cols[0].setKeys(dbs.databases.map(db => db.name));
  cols[0].setItems(cols[0].keys);

  // initialize listeners for each column
  cols.forEach((col, index) => {
    screen.append(col);

    // move up/down or select item
    col.key(
      ["j", "k", "up", "down"],
      util.crashOnError(screen, () => applySelection(cols, index))
    );

    col.on(
      "focus",
      util.crashOnError(screen, () => applySelection(cols, index))
    );

    // when we change levels, shift the columns accordingly
    col.key(["l", "right", "enter"], () => {
      if (focused === numCols - 2 && util.browser.canAdvance()) {
        shiftRight(cols);
      } else if (focused < numCols - 1) {
        // can change focused column without needing to shift
        cols[++focused].focus();
      }
    });

    col.key(["h", "left"], () => {
      if (focused === 1 && cols[0].level > 0) {
        shiftLeft(cols);
      } else if (focused > 0) {
        // can change focused column without needing to shift
        cols[--focused].focus();
      }
    });
  });

  // Handle debug mode
  if (options.debug) {
    logger = components.logger();
    screen.append(logger);
  } else {
    logger = {
      // no-op all prints
      log: () => {}
    };
  }

  // Quit q or Control-C.
  screen.key(["q", "C-c"], function(ch, key) {
    client.close();
    return process.exit(0);
  });

  cols[focused].focus();

  screen.render();
}

/**
 * Apply the selected item at cols[index], and make the appropriate
 * database calls to populate the column(s) to the right. Re-renders the UI.
 *
 * @param {Array} cols
 * @param {Number} index
 */
async function applySelection(cols, index) {
  const col = cols[index];
  const nextCol = cols[index + 1]; // undefined for last column
  const numCols = cols.length;

  const selectedKey = col.getKey(col.selected);
  logger.log("Selected: " + selectedKey);
  if (selectedKey === undefined) {
    return screen.render(); // list was empty
  }

  if (col.level === util.levels.DATABASE) {
    // A selection on the DATABASE level loads the COLLECTION level
    assert(index === 0);

    db = client.db(selectedKey);
    const collections = await db.listCollections().toArray();
    nextCol.setKeys(collections.map(coll => coll.name));
    nextCol.setItems(nextCol.keys); // no formatting
  } else if (col.level === util.levels.COLLECTION) {
    // A selection on the COLLECTION level loads the DOCUMENT_BASE level
    assert(index <= 1);

    const docs = await db
      .collection(selectedKey)
      .find({ _id: { $exists: true } })
      .limit(64)
      .toArray();

    util.browser.load(docs);
    nextCol.setKeys(docs.map(doc => doc._id.toString()));
    nextCol.setItems(docs.map(doc => util.stringify(doc)));
  } else if (col.level >= util.levels.DOCUMENT_BASE) {
    if (!nextCol) return screen.render();

    // content of the document/sub-document the user selected
    const content = util.browser.traverse(col.level, selectedKey);

    if (Array.isArray(content)) {
      nextCol.setItems(content.map(util.stringify));
      nextCol.setKeys(Array.from(content.keys())); // arr of indices
    } else if (util.isObject(content)) {
      nextCol.setKeys(Object.keys(content));
      nextCol.setItems(
        nextCol.keys.map(k => `{bold}${k}:{/} ${util.stringify(content[k])}`)
      );
    } else {
      nextCol.setKeys([util.stringify(content)]);
      nextCol.setItems(nextCol.keys);
    }
  }

  for (let i = index + 2; i < numCols; i++) {
    // propogate change to the right, and clear out old columns
    cols[i].setItems([]);
  }

  if (util.browser.cursor.length) {
    logger.log(`Cursor: [${util.browser.cursor}]`);
  }

  screen.render();
}

// shift columns when user moves to the right
function shiftRight(cols) {
  const numCols = cols.length;
  util.saveColumn(cols[0]); // save this before it is removed from the screen

  for (let i = 0; i < numCols - 1; i++) {
    cols[i].copyFrom(cols[i + 1]);
  }

  // need to populate this
  cols[numCols - 1].setItems([]);
  cols[numCols - 1].moveLevel(1);

  cols[focused].focus(); // trigger reload data
  screen.render();
}

// shift columns when user moves to the left
function shiftLeft(cols) {
  const numCols = cols.length;
  for (let i = numCols - 1; i > 0; i--) {
    cols[i].copyFrom(cols[i - 1]);
  }

  util.loadColumn(cols[0], cols[0].level - 1);

  cols[focused].focus(); // trigger reload data
  screen.render();
}

module.exports = main;
