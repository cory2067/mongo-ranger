const blessed = require("blessed");
const assert = require("assert");
const MongoClient = require("mongodb").MongoClient;

const client = new MongoClient("mongodb://localhost:27017");

// Create a screen object.
const screen = blessed.screen({
  smartCSR: true
});

const dbList = blessed.list({
  top: "center",
  left: "center",
  width: "50%",
  height: "50%",
  label: "Hello {bold}world{/bold}!",
  tags: true,
  keys: true,
  vi: true,
  border: {
    type: "line"
  },
  style: {
    item: {
      hover: {
        bg: "blue"
      }
    },
    selected: {
      bg: "blue",
      bold: true
    }
  }
});

client.connect(async err => {
  assert.equal(null, err);
  const admin = client.db().admin();
  const dbs = await admin.listDatabases();
  dbList.setItems(dbs.databases.map(db => db.name));
  screen.render();
});

screen.append(dbList);

dbList.key(["l", "left", "enter"], function(ch, key) {
  screen.render();
});

// Quit q or Control-C.
screen.key(["q", "C-c"], function(ch, key) {
  return process.exit(0);
});

dbList.focus();

screen.render();
