const commandLineArgs = require("command-line-args");
const commandLineUsage = require("command-line-usage");
const mongoRanger = require("./mongo-ranger");

const optionDefinitions = [
  {
    name: "host",
    type: String,
    defaultOption: true,
    description: "server to connect to, SRV string can be used"
  },
  {
    name: "port",
    alias: "p",
    type: Number,
    description: "port to conect to"
  },
  {
    name: "help",
    alias: "h",
    type: Boolean,
    description: "show this help page"
  },
  {
    name: "debug",
    type: Boolean,
    description: "show debug logs"
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
      "$ mongo-ranger [{underline connection-string}]",
      "$ mongo-ranger [{bold --host} {underline host}] [{bold --port} {underline port}]",
      "$ mongo-ranger {bold --help}"
    ]
  },
  {
    header: "Controls",
    content: [
      "- Browse data using the arrow keys or hjkl (vim-like controls)",
      "- Use / to search the selected column (does not query db)",
      "- Use : to type a MongoDB query for the selected collection",
      "- Move forward on an individual field to edit"
    ]
  },
  {
    header: "Options",
    optionList: optionDefinitions
  }
];

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

options.host = options.host || "mongodb://localhost";
options.port = options.port || "";

mongoRanger(options).catch(e => {
  console.error(e);
  return process.exit(1);
});
