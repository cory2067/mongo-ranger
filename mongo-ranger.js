const blessed = require("blessed");
const assert = require("assert");
const MongoClient = require("mongodb").MongoClient;

function main(host, port) {
  const client = new MongoClient("mongodb://localhost:27017");

  // Create a screen object.
  const screen = blessed.screen({
    title: "mongo-ranger",
    smartCSR: true,
    dockBorders: true
  });

  const style = {
    item: {
      hover: {
        bg: "blue"
      }
    },
    selected: {
      bg: "blue",
      bold: true
    }
  };

  const dbList = blessed.list({
    width: "17%",
    height: "100%",
    label: "Databases",
    tags: true,
    keys: true,
    vi: true,
    border: {
      type: "line"
    },
    style
  });

  const colList = blessed.list({
    left: "16%",
    width: "34%",
    height: "100%",
    label: "Collections",
    tags: true,
    keys: true,
    vi: true,
    border: {
      type: "line"
    },
    style
  });

  const itemList = blessed.list({
    left: "49%",
    width: "51%",
    height: "100%",
    label: "Documents",
    tags: true,
    keys: true,
    vi: true,
    border: {
      type: "line"
    },
    style
  });

  client.connect(async err => {
    assert.equal(null, err);
    const admin = client.db().admin();
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