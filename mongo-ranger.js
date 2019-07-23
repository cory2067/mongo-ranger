const blessed = require("blessed");
const assert = require("assert");
const MongoClient = require("mongodb").MongoClient;

const components = require("./components");
const util = require("./util");
const browser = require("./browser");

let focused = 0;
let client, db; // mongo connection
let screen, logger, input, cols; // all Blessed components
let ignoreNextSelection = false;

const DOC_LIMIT = 64;

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

  input = components.input();

  const search = cb => {
    input.clearValue();
    input.setLabel("{cyan-fg}{bold}Search{/}");
    screen.render();

    input.readInput((val, err) => {
      cb(val, err);
      input.clear();
    });
  };

  // this should be customizable
  // janky arbitrary values
  cols = [
    components.column({
      width: "18%",
      level: 0,
      search
    }),

    components.column({
      left: "16%",
      width: "36%",
      level: 1,
      search
    }),

    components.column({
      left: "49%",
      right: 0,
      level: 2,
      search
    })
  ];

  const numCols = cols.length;

  // list of databases is only fetched once
  // admin/local are problematic and cause bugs, esp. for atlas free tier
  cols[0].setKeys(
    dbs.databases
      .map(db => db.name)
      .filter(name => !["admin", "local"].includes(name))
  );

  cols[0].setItems(cols[0].keys);

  // initialize listeners for each column
  cols.forEach((col, index) => {
    screen.append(col);

    // move up/down or select item
    col.key(
      ["j", "k", "up", "down"],
      util.crashOnError(screen, () => applySelection(index))
    );

    col.on("focus", () => {
      setTimeout(
        // on focus, selected element doesn't always update right away, so using this timeout 0
        util.crashOnError(screen, () => applySelection(index)),
        0
      );
    });

    // when we change levels, shift the columns accordingly
    col.key(
      ["l", "right", "enter"],
      util.crashOnError(screen, async () => {
        if (focused === numCols - 2 && browser.canAdvance()) {
          shiftRight();
        } else if (focused < numCols - 1) {
          // can change focused column without needing to shift
          cols[++focused].focus();
        } else if (cols[focused].level > util.levels.DOCUMENT_BASE) {
          // can't move forward any more -- start edit mode
          await promptEdit();
        }
      })
    );

    col.key(["h", "left"], () => {
      if (focused === 1 && cols[0].level > 0) {
        shiftLeft();
      } else if (focused > 0) {
        // can change focused column without needing to shift
        cols[--focused].focus();
      }
    });
  });

  screen.append(input);

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

  // Handle query request
  screen.key([":"], util.crashOnError(screen, promptQuery));

  // Handle add/insert request
  screen.key(["i"], util.crashOnError(screen, promptInsert));

  // Handle delete request
  screen.key(["d"], util.crashOnError(screen, deleteSelected));

  // Quit q or Control-C.
  screen.key(["q", "C-c"], () => {
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
 * @param {Number} index
 */
async function applySelection(index) {
  if (ignoreNextSelection) {
    ignoreNextSelection = false;
    return;
  }

  const col = cols[index];
  const nextCol = cols[index + 1]; // undefined for last column
  const numCols = cols.length;

  const selectedKey = col.getKey(col.selected);
  logger.log("Selected: " + util.stringify(selectedKey));
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

    if (input.getLabelText() === "Query") {
      input.clear(); // clear out any stale queries
    }

    await applyQuery({});
  } else if (col.level >= util.levels.DOCUMENT_BASE) {
    if (!nextCol) return screen.render();

    // content of the document/sub-document the user selected
    const content = browser.traverse(col.level, selectedKey);
    setColumnContents(nextCol, content);
  }

  for (let i = index + 2; i < numCols; i++) {
    // clear out old columns if necessary
    cols[i].setItems([]);
  }

  if (browser.cursor.length) {
    logger.log(`Cursor: ${util.stringify(browser.cursor)}`);
  }

  screen.render();
}

// set the contents of a column to display the specified javascript object, with pretty printing
// accepts true columns and virtual (not visible) columns
function setColumnContents(col, content) {
  if (Array.isArray(content)) {
    col.setItems(content.map(util.stringify));
    col.setKeys(Array.from(content.keys())); // arr of indices
  } else if (util.isObject(content)) {
    //q && Object.keys(content).length) {
    col.setKeys(Object.keys(content));
    col.setItems(
      col.keys.map(k => `{bold}${k}:{/} ${util.stringify(content[k])}`)
    );
  } else {
    col.setKeys([JSON.stringify(content)]); // plain/unformatted
    col.setItems([util.stringify(content)]);
  }
}

// shift columns when user moves to the right
function shiftRight() {
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
function shiftLeft() {
  const numCols = cols.length;
  for (let i = numCols - 1; i > 0; i--) {
    cols[i].copyFrom(cols[i - 1]);
  }

  util.loadColumn(cols[0], cols[0].level - 1);

  cols[focused].focus(); // trigger reload data
  screen.render();
}

/**
 * Apply a user-inputted query to the currently-selected collection
 * @param {Object} query
 */
async function applyQuery(queryObj) {
  const col = cols[focused];
  const nextCol = cols[focused + 1];
  assert(col.level === util.levels.COLLECTION);
  assert(!!nextCol);

  const collection = col.getKey(col.selected);
  logger.log(`Querying "${util.stringify(queryObj)}" on db.${collection}`);

  let docs;
  try {
    docs = await db
      .collection(collection)
      .find(queryObj)
      .limit(DOC_LIMIT)
      .toArray();
  } catch (e) {
    input.setError(e.toString());
    return screen.render();
  }

  logger.log(`Found ${docs.length} results`);
  browser.load(collection, docs);
  setColumnContents(nextCol, docs);
  screen.render();
}

// used to query a collection (prompts user for input, then calls applyQuery)
async function promptQuery() {
  const col = cols[focused];
  input.setLabel("{green-fg}{bold}Query{/}");
  if (col.level !== util.levels.COLLECTION) {
    input.setError(
      "Must select a collection in order to query!" +
        (col.level === util.levels.DOCUMENT_BASE ? " (Go back a level)" : "")
    );
    return screen.render();
  }

  input.clearValue();
  screen.render();

  const val = await input.readObject();
  if (!val) return screen.render();

  ignoreNextSelection = true; // avoid resetting documents once column is refocused
  await applyQuery(val);
}

// called when user pushes i, to insert a new document/field
async function promptInsert() {
  const col = cols[focused];
  if (col.level > util.levels.DOCUMENT_BASE) {
    return await promptAddField(); // add field rather than insert doc
  }

  if (col.level < util.levels.DOCUMENT_BASE) {
    input.setError("Adding new db/collections is unsupported");
    return screen.render();
  }

  logger.log("Inserting document into db." + browser.collection);
  input.setLabel("{blue-fg}{bold}Insert new document{/}");
  input.clearValue();
  screen.render();

  const valObj = await input.readObject();
  input.clear();
  if (valObj === null) return screen.render();

  try {
    await db.collection(browser.collection).insertOne(valObj);
  } catch (e) {
    input.setError(e.toString());
    return screen.render();
  }

  propogateInsert(valObj);
  screen.render();
}

// Adder used to add a new field to a document
async function promptAddField() {
  const col = cols[focused];
  if (col.level <= util.levels.DOCUMENT_BASE) {
    return; // can't add a field to this low a level
  }

  const doc = browser.get(util.levels.DOCUMENT_BASE + 1);
  const prop = browser.cursor
    .slice(1, col.level - util.levels.DOCUMENT_BASE)
    .join("."); // property to be updated

  const content = browser.get(col.level); // array/obj to insert to
  assert(!!doc._id);
  if (Array.isArray(content)) {
    logger.log("Append to " + util.stringify(prop));
    input.setLabel("{blue-fg}{bold}Add to array{/}");
    input.clearValue();
    screen.render();

    const valObj = await input.readObject();
    input.clear();
    if (valObj === null) return screen.render();

    const res = await dbUpdate(doc, { $push: { [prop]: valObj } });
    if (!res) return;

    propogateUpdate(res);
    screen.render();
  } else if (util.isObject(content)) {
    logger.log("Add to " + util.stringify(prop));
    input.setLabel("{blue-fg}{bold}Add new field{/}");
    input.clearValue();
    screen.render();

    const key = await input.readString();
    if (!key) return screen.render();

    input.setLabel(`{blue-fg}{bold}Specify value for "${key}"{/}`);
    input.clearValue();
    screen.render();

    const valObj = await input.readObject();
    input.clear();
    if (valObj === null) return screen.render();

    let pathToKey = `${prop}${prop ? "." : ""}${key}`;
    const res = await dbUpdate(doc, { $set: { [pathToKey]: valObj } });
    if (!res) return;

    propogateUpdate(res);
    screen.render();
  } else {
    input.setError(
      "Cannot append to field of type " + util.colorize(typeof content)
    );
    return screen.render();
  }
}

// Editor used to edit existing fields
async function promptEdit() {
  input.setLabel("{blue-fg}{bold}Edit{/}");
  const content = browser.get();

  logger.log("Editing: " + util.stringify(content));
  input.setValue(JSON.stringify(content));
  screen.render();

  const valObj = await input.readObject();
  input.clear();
  if (valObj === null) return screen.render();

  const doc = browser.get(util.levels.DOCUMENT_BASE + 1);
  const prop = browser.cursor.slice(1).join("."); // property to be updated
  logger.log(`Updating ${prop} to: ${util.stringify(valObj)}`);

  assert(!!doc._id);
  const res = await dbUpdate(doc, { $set: { [prop]: valObj } });
  if (!res) return;

  propogateUpdate(res);
  screen.render();
}

async function deleteSelected() {
  const col = cols[focused];
  if (col.level < util.levels.DOCUMENT_BASE) {
    input.setError("Deleting this is not yet supported");
    return screen.render();
  }

  if (col.level === util.levels.DOCUMENT_BASE) {
    const doc = browser.get();
    logger.log(`Deleting ${doc._id} from db.${browser.collection}`);

    try {
      await db.collection(browser.collection).deleteOne({ _id: doc._id });
    } catch (e) {
      input.setError(e.toString());
      return screen.render();
    }

    propogateDelete(doc);
    screen.render();
  } else {
    if (focused === cols.length - 1) {
      input.setError("To delete properties, go back a layer");
      return screen.render();
    }

    const prop = browser.cursor.slice(1).join("."); // property to be deleted
    const doc = browser.get(util.levels.DOCUMENT_BASE + 1);
    logger.log(`Deleting ${prop} from document ${doc._id}`);

    const fromArr = Array.isArray(browser.get(col.level));
    let res;

    if (fromArr) {
      // this is so sketchy, why isn't there a simple way to remove by index?
      const deleteKey = `__toDelete%${doc._id}%${col.selected}`;
      const arr = prop.substr(0, prop.lastIndexOf("."));

      await dbUpdate(doc, { $set: { [prop]: deleteKey } });
      res = await dbUpdate(doc, { $pull: { [arr]: deleteKey } });
    } else {
      res = await dbUpdate(doc, { $unset: { [prop]: "" } });
    }

    if (!res) return;
    propogateUpdate(res);
    screen.render();
  }
}

// update all columns to reflect an updated document
function propogateUpdate(doc) {
  assert(!!doc);

  // update data stored in the browser, but we have to update the UI separately
  browser.update(doc);

  // update cols from right to left
  for (let i = focused; i >= 0; i--) {
    const col = cols[i];

    const content = browser.get(col.level);
    setColumnContents(col, content);
  }

  const lowestVisibleLevel = cols[0].level;
  for (
    let level = lowestVisibleLevel - 1;
    level >= util.levels.DOCUMENT_BASE;
    level--
  ) {
    // for deeply nested updates, we may need to update columns that are off the screen
    const col = util.getVirtualColumn(level);

    const content = browser.get(level);
    setColumnContents(col, content);
  }

  if (focused === cols.length - 1 && browser.canAdvance()) {
    shiftRight(); // we may have introduced a new layer during the edit
    cols[--focused].focus();
  } else if (
    focused === cols.length - 2 &&
    util.isEmpty(browser.get(cols[focused].level))
  ) {
    shiftLeft();
    cols[++focused].focus(); // if you deleted the last item in an object/array
  } else {
    cols[focused].focus();
  }
}

// update all columns to reflect an inserted document
function propogateInsert(doc) {
  assert(!!doc);

  browser.insert(doc);

  // update document layer
  const col = cols[focused];
  assert(col.level === util.levels.DOCUMENT_BASE);
  const content = browser.get(col.level);
  setColumnContents(col, content);

  if (browser.docs.length === 1) {
    // edge case: adding the first document
    shiftRight();
    cols[--focused].focus();
  }
}

function propogateDelete(doc) {
  assert(!!doc);

  browser.delete(doc);

  // update document layer
  const col = cols[focused];
  assert(col.level === util.levels.DOCUMENT_BASE);
  const content = browser.get(col.level);
  setColumnContents(col, content);

  if (browser.docs.length === 0) {
    // edge case: deleting the final document
    shiftLeft();
  }

  // always refocus so last column reflects the delete
  cols[focused].focus();
}

/**
 * Wraps the monogdb driver findOneAndUpdate and handles errors
 *
 * @param {Object} doc document to be updated
 * @param {Object} update
 */
function dbUpdate(doc, update) {
  return db
    .collection(browser.collection)
    .findOneAndUpdate({ _id: doc._id }, update, { returnOriginal: false })
    .then(e => e.value)
    .catch(e => {
      input.setError(e.toString());
      screen.render();
      return null;
    });
}

module.exports = main;
