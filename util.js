/**
 * Used for handling errors in async functions called by event handlers.
 * Terminates the program if any error occurs.
 *
 * @param {Screen} screen blessed screen to terminate on error
 * @param {function} fn async function to run
 */
function crashOnError(screen, fn) {
  return () => {
    return fn().catch(e => {
      if (screen) screen.destroy();
      console.error(e);
      return process.exit(1);
    });
  };
}

const colCache = {};

/**
 * Save a column's data, so that it can be loaded at a later time.
 *
 * @param {Column} col
 */
function saveColumn(col) {
  colCache[col.level] = {
    items: col.getItems(),
    selected: col.selected
  };
}

/**
 * Load a previously stored column's data into the specified target.
 *
 * @param {Column} col targets column to load data into
 * @param {Number} level level of the column to load
 */
function loadColumn(col, level) {
  col.setItems(colCache[level].items);
  col.select(colCache[level].selected);
  col.setLevel(level);
}

module.exports = {
  crashOnError,
  saveColumn,
  loadColumn
};
