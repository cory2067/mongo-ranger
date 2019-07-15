const blessed = require("blessed");
const assert = require("assert");
const MongoClient = require("mongodb").MongoClient;

const components = require("./components");

let focused = 0;

function main(host, port) {
  const client = new MongoClient("mongodb://localhost:27017", {
    useNewUrlParser: true
  });

  const screen = blessed.screen({
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

  client.connect(async err => {
    assert.equal(null, err);
    const admin = client.db("test").admin();
    const dbs = await admin.listDatabases();
    cols[0].setItems(dbs.databases.map(db => db.name));

    const collections = await client
      .db("backupjobs")
      .listCollections()
      .toArray();
    cols[1].setItems(collections.map(coll => coll.name));

    const docs = await client
      .db("backupjobs")
      .collection("jobs")
      .find()
      .toArray();
    cols[2].setItems(docs.map(doc => doc._id + ""));
    screen.render();
  });

  for (const col of cols) {
    screen.append(col);
  }

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

module.exports = main;
