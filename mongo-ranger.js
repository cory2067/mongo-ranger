const blessed = require("blessed");
const assert = require("assert");
const MongoClient = require("mongodb").MongoClient;

const components = require("./components");

function main(host, port) {
  const client = new MongoClient("mongodb://localhost:27017", {
    useNewUrlParser: true
  });

  // Create a screen object.
  const screen = blessed.screen({
    title: "mongo-ranger",
    smartCSR: true,
    dockBorders: true,
    ignoreDockContrast: true
  });

  const dbList = components.column({
    width: "17%"
  });

  const colList = components.column({
    left: "16%",
    width: "34%",
    level: 1
  });

  const itemList = components.column({
    left: "49%",
    width: "51%",
    level: 2
  });

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

  client.connect(async err => {
    assert.equal(null, err);
    const admin = client.db("test").admin();
    const dbs = await admin.listDatabases();
    dbList.setItems(dbs.databases.map(db => db.name));

    const cols = await client
      .db("backupjobs")
      .listCollections()
      .toArray();
    colList.setItems(cols.map(col => col.name));

    const docs = await client
      .db("backupjobs")
      .collection("jobs")
      .find()
      .toArray();
    itemList.setItems(docs.map(doc => doc._id + ""));
    screen.render();
  });

  screen.append(dbList);
  screen.append(colList);
  screen.append(itemList);

  dbList.key(["l", "right", "enter"], function(ch, key) {
    colList.focus();
    screen.render();
  });

  // Quit q or Control-C.
  screen.key(["q", "C-c"], function(ch, key) {
    return process.exit(0);
  });

  dbList.focus();

  screen.render();
}

module.exports = main;
