/**
 * ### Converts an `argv` to a dictionary of key/value pairs.

 * @param {string[]} argv
 *    An ‘arguments vector’, usually the command line arguments, `process.argv`.
 * @returns {Object.<string, string>}
 *    A ‘dictionary object’ of key/value pairs, where all values are strings.
 * @throws
 *    Throws an `Error` if any of the arguments are invalid.
 */
export default function parseArgv(argv) {
    return {};
}


/* ---------------------------------- Tests --------------------------------- */

/**
 * ### `parseArgv()` unit tests.
 * 
 * @param {parseArgv} f
 *    The `parseArgv()` function to test.
 * @returns {void}
 *    Does not return anything.
 * @throws
 *    Throws an `Error` if a test fails.
 */
export function parseArgvTest(f) {
    const e2l = e => e.stack.split('\n')[2].match(/([^\/]+\.js:\d+):\d+\)?$/)[1];
    const equal = (actual, expected) => { if (actual === expected) return;
        try { throw Error() } catch(err) { throw Error(`actual:\n${actual}\n` +
            `!== expected:\n${expected}\n...at ${e2l(err)}\n`) } };
    const throws = (actual, expected) => { try { actual() } catch (err) {
        if (err.message !== expected) { throw Error(`actual message:\n${err.message
            }\n!== expected message:\n${expected}\n...at ${e2l(err)}\n`)} return }
        throw Error(`expected message:\n${expected}\nbut nothing was thrown\n`) };
    const toStr = (value) => JSON.stringify(value, null, '  ');

    // @TODO tests.
    throws(()=>{throw Error('@TODO error')},
        "@TODO error");

    // @TODO tests.
    equal(toStr(f(['1'])),
        toStr({}));
}
