const commandLineArgs = require("command-line-args");
const commandLineUsage = require('command-line-usage');
const mongoRanger = require("./mongo-ranger")

const optionDefinitions = [
  {
    name: "host",
    type: String,
    defaultOption: true
  },
  {
    name: "port",
    alias: "p",
    type: Number,
  },
  {
    name: "help",
    alias: "h",
    type: Boolean
  }
];

const usage = [
  {
    header: "mongo-ranger",
    content: "A MongoDB data browser for the console."
  },
  {
    header: "Synopsis",
    content: [
      "$ mongor [{underline connection-string}]",
      "$ mongor [{bold --host} {underline host}] [{bold --port} {underline port}]",
      "$ mongor {bold --help}",
    ]
  },
  {
    header: "Options",
    optionList: optionDefinitions
  }
]


let options;
try {
  options = commandLineArgs(optionDefinitions);
} catch (e) {
  // invalid options provided
  console.log(commandLineUsage(usage));
  return;
}

if (options.help) {
  console.log(commandLineUsage(usage));
  return;
}

const host = options.host || "mongodb://localhost:21017";
const port = options.port || "";

mongoRanger(host, port);