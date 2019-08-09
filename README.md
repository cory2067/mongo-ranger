# mongo-ranger

[![npm version](https://badge.fury.io/js/mongo-ranger.svg)](https://badge.fury.io/js/mongo-ranger)

A MongoDB data browser for the console. Inspired by [ranger](https://github.com/ranger/ranger).

`mongo-ranger` has vim-like keybindings, which allows you to quickly traverse your database without a mouse.

![mongo-ranger](https://user-images.githubusercontent.com/8433005/61555608-c52fb880-aa2d-11e9-996e-9ab3ac552703.png)

## Features

- Multi-column display
- Syntax highlighting
- Preview of the selected database/collection/document
- Traverse arbitrarily deep nested documents
- Common document operations (update fields, insert/delete document)
- Querying collections
- Search/jump to documents or fields

## Installation

### With Node.js (v10 and above)

To install `mongo-ranger` globally, run:

```
$ npm install -g mongo-ranger
$ mongo-ranger MONGO_CONNECTION_STRING
```

Use npx to try out `mongo-ranger` without installing:

```
$ npx mongo-ranger MONGO_CONNECTION_STRING
```

Alternatively, clone and run the repository

```
$ git clone https://github.com/cory2067/mongo-ranger.git
$ npm install
$ node . MONGO_CONNECTION_STRING
```

### Binaries

If you don't have Node.js, you can download the latest binary here: https://github.com/cory2067/mongo-ranger/releases

Example install for Mac OS:

```
$ curl https://github.com/cory2067/mongo-ranger/releases/download/v1.1.0/mongo-ranger-macos -Lso mongo-ranger
$ chmod +x mongo-ranger
$ mv mongo-ranger /usr/local/bin
```

Then, restart terminal to ensure `mongo-ranger` is recognized.

## Usage

```
$ mongo-ranger --help

mongo-ranger

  A MongoDB data browser for the console.

Synopsis

  $ mongo-ranger [connection-string]
  $ mongo-ranger [--host host] [--port port]
  $ mongo-ranger --help

Controls

  - Browse data using the arrow keys or hjkl (vim-like controls)
  - Use / to search the selected column (does not query db)
  - Use : to type a MongoDB query for the selected collection
  - Move forward on an individual field to edit
  - Push i to insert a new document or field
  - Push d to delete a document or field
  - Push r to reload the current collection

Options

  --host string       server to connect to, SRV string can be used
  -p, --port number   port to conect to
  -h, --help          show this help page
  --debug             show debug logs
```

## Common Issues

`mongo-ranger` sometimes hangs forever if write concern is specified in the URI. For example,
```
mongodb+srv://admin:[password]@[cluster].mongodb.net/test?retryWrites=true&w=majority
```

This may hang, but should work if you remove `&w=majority`
