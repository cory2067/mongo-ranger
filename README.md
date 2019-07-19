# mongo-ranger
A MongoDB data browser for the console. Inspired by [ranger](https://github.com/ranger/ranger).

mongo-ranger has vim-like keybindings, which allows you to quickly traverse your database without a mouse.

![mongo-ranger](https://user-images.githubusercontent.com/8433005/61555608-c52fb880-aa2d-11e9-996e-9ab3ac552703.png)

## Features
- Multi-column display
- Preview of the selected database/collection/document
- Traverse arbitrarily deep nested documents
- Common document operations (update fields, insert/delete document)
- Querying collections
- Search/jump to documents or fields

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

Options

  --host string       server to connect to, SRV string can be used
  -p, --port number   port to conect to
  -h, --help          show this help page
  --debug             show debug logs
```
