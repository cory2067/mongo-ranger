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
      screen.destroy();
      console.error(e);
      return process.exit(1);
    });
  };
}

module.exports = {
  crashOnError
};
