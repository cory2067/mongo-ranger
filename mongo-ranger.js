const blessed = require("blessed");
const assert = require("assert");
const MongoClient = require("mongodb").MongoClient;

const components = require("./components");

let focused = 0;
let db;

async function main(host, port) {
  console.log("Connecting to MongoDB...");

  const uri = port ? `${host}:${port}` : host;
  const client = new MongoClient(uri, {
    useNewUrlParser: true
  });

  await client.connect();
  const admin = client.db("test").admin();
  const dbs = await admin.listDatabases();

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

  cols[0].setItems(dbs.databases.map(db => db.name));

  /*client.connect(async err => {
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
  });*/

  cols.forEach((col, index) => {
    screen.append(col);

    // move up/down or select item
    col.key(["j", "k", "up", "down", "enter"], async () => {
      const selected = col.getItem(col.selected).content;
      if (col.level === 0) {
        assert(index === 0);

        const nextCol = cols[index + 1];
        db = client.db(selected);
        const collections = await db.listCollections().toArray();
        nextCol.setItems(collections.map(coll => coll.name));
      } else if (col.level === 1) {
        assert(index <= 1);

        const nextCol = cols[index + 1];
        const docs = await db
          .collection(selected)
          .find()
          .limit(20)
          .toArray();

        nextCol.setItems(docs.map(doc => "tehe"));
      }

      screen.render();
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

module.exports = main;
