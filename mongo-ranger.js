const blessed = require("blessed");
const assert = require("assert");
const MongoClient = require("mongodb").MongoClient;

const components = require("./components");

const colCache = {};
let focused = 0;
let db, screen;

async function main(host, port) {
  console.log("Connecting to MongoDB...");

  const uri = port ? `${host}:${port}` : host;
  const client = new MongoClient(uri, {
    useNewUrlParser: true
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
  const cols = [
    components.column({
      width: "17%",
      level: 0
    }),

    components.column({
      left: "16%",
      width: "34%",
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
  cols[0].setItems(dbs.databases.map(db => db.name));

  cols.forEach((col, index) => {
    screen.append(col);

    // move up/down or select item
    col.key(["j", "k", "up", "down", "enter"], async () => {
      const selectedItem = col.getItem(col.selected);
      if (!selectedItem) {
        return; // list was empty
      }

      const selected = selectedItem.content;
      if (col.level === 0) {
        // DATABASE LEVEL
        assert(index === 0);

        const nextCol = cols[index + 1];
        db = client.db(selected);
        const collections = await db.listCollections().toArray();
        nextCol.setItems(collections.map(coll => coll.name));
      } else if (col.level === 1) {
        // COLLECTION LEVEL
        assert(index <= 1);

        const nextCol = cols[index + 1];
        const docs = await db
          .collection(selected)
          .find()
          .limit(20)
          .toArray();

        nextCol.setItems(docs.map(doc => JSON.stringify(doc)));
      } else {
        // DOCUMENT LEVEL
      }

      for (let i = index + 2; i < numCols; i++) {
        // propogate change to the right, and clear out old columns
        cols[i].setItems([]);
        delete colCache[i];
      }
    });

    screen.render();

    // when we change levels, shift the columns accordingly
    col.key(["l", "right", "enter"], () => {
      if (focused > 1) {
        shiftRight(cols);
      }
    });

    col.key(["h", "escape", "left"], () => {
      if (focused < 1) {
        shiftLeft(cols);
      }
    });
  });

  const line = blessed.line({
    orientation: "horizontal",
    top: "100%-2",
    width: "100%",
    style: {
      fg: "blue"
    }
  });

  screen.append(line);

  screen.key(["l", "right", "enter"], function(ch, key) {
    if (focused >= numCols - 1) {
      return;
    }

    focused++;
    cols[focused].focus();
    screen.render();
  });

  screen.key(["h", "left"], function(ch, key) {
    if (focused <= 0) {
      return;
    }

    focused--;
    cols[focused].focus();
    screen.render();
  });

  // Quit q or Control-C.
  screen.key(["q", "C-c"], function(ch, key) {
    return process.exit(0);
  });

  cols[focused].focus();

  screen.render();
}

// shift columns when user moves to the right
function shiftRight(cols) {
  const numCols = cols.length;
  colCache[cols[0].level] = cols[0].getItems();

  for (let i = 0; i < numCols - 1; i++) {
    cols[i].copyFrom(cols[i + 1]);
  }

  // need to populate this
  cols[numCols - 1].setItems([]);
  cols[numCols - 1].moveLevel(1);

  focused--;
  cols[focused].focus();

  screen.render();
}

// shift columns when user moves to the left
function shiftLeft(cols) {
  if (cols[0].level === 0) {
    return; // can't shift any more
  }

  const numCols = cols.length;

  colCache[cols[numCols - 1].level] = cols[numCols - 1].getItems();
  for (let i = numCols - 1; i > 0; i--) {
    cols[i].copyFrom(cols[i - 1]);
  }

  cols[0].setItems(colCache[cols[0].level - 1]);
  cols[0].moveLevel(-1);

  // need to populate this
  cols[numCols - 1].setItems([]);

  focused++;
  cols[focused].focus();

  screen.render();
}

module.exports = main;
