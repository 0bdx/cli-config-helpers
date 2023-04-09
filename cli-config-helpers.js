/**
 * https://www.npmjs.com/package/cli-config-helpers
 * @version 0.0.1
 * @license Copyright (c) 2023 0bdx <0@0bdx.com> (0bdx.com)
 * SPDX-License-Identifier: MIT
 */
import { aintaArray } from '@0bdx/ainta';

/**
 * ### Converts an `argv` to a dictionary of key/value pairs.
 * 
 * Long keys:
 * - Begin with two dashes `"--"`
 * - Have a lowercase letter a-z after the two dashes
 * - Continue with one or more lowercase letters, dashes or digits 0-9
 * 
 * Short keys:
 * - Begin with one dash
 * - Have one uppercase or lowercase letter, A-Z or a-z, after the dash
 * - Or, have one question-mark after the dash
 * 
 * A value is anything which is not a long or short key.
 * 
 * If a key is not followed by a value, it is assigned boolean `true`.
 * 
 * Runs of short keys are possible, which is handy when there are a lot of flags
 * which are set to `false` by default. The last short key picks up the value:
 * - `node run.js -A?i my/input/file.txt`
 * 
 * `parseArgv()` will ignore all values before the first key. In Node.js:
 * - `process.argv[0]` is the path to the node executable
 * - `process.argv[1]` is the path to the script
 * 
 * These values are returned in the `ignored` array, along with any other `argv`
 * items which did not become a key or a value.
 * 
 * @example
 *
 * parseArgv([ "/path/to/node", "/tmp/run.js", "-A?i", "input/file.txt" ]);
 * // Returns:
 * {
 *     config: { A:true, "?":true, i:"input/file.txt" },
 *     ignored: [ "/path/to/node", "/tmp/run.js" ],
 * }
 *
 * parseArgv([ "--foo", "-?", "Q A", "-", "-B", "--z--9", "--", "lost" ]);
 * // Returns:
 * {
 *     config: { foo:true, "?":"Q A", B:true, "z--9":"--" },
 *     ignored: [ "-", "lost" ],
 * }
 * 
 * @param {string[]} argv
 *    An 'arguments vector', usually the command line arguments, `process.argv`.
 * @returns {{ config:Object.<string, string|true>, ignored:string[] }}
 *    Returns an object containing two properties:
 *    - `config`, a 'dictionary object', where every value is a string or `true`
 *    - `ignored`, an array of strings, the items which would otherwise be lost
 * @throws
 *    Throws an `Error` if the `argv` argument is invalid.
 */
function parseArgv(argv) {
    const begin = 'parseArgv()';

    // The values in `argv` must all be strings. Throw an `Error` if not.
    const aArgv = aintaArray(argv, 'argv', { begin, types:['string'] });
    if (aArgv) throw Error(aArgv);

    // Initialise the output dictionary, and the array of 'lost' values.
    /** @type {Object.<string, string|true>} */
    const config = {};
    const ignored = [];

    // `parseArgv()` will ignore items in `argv` until it encounters the first
    // key. Typically, the first two items of `argv` are ignored.
    // Once `isSkippingStart` is set to `false`, it stays `false`.
    let isSkippingStart = true;

    // Will be set to the current key when one is found, and then set back to
    // an empty string when a value is found.
    let currentKey = '';

    // Step through each item in the `argv` argument.
    // In 2023, `for` loops run 3x faster than array methods on the V8 engine.
    for (let i=0, len=argv.length; i<len; i++) {
        const item = argv[i];

        // Avoid an expensive RegExp test for items which don't begin "-".
        if (item[0] === '-') {
            // If the item does turn out to be a valid long or short key, or a
            // run of short keys, record it as boolean `true` in `out`.
            let match = item.match(
                /^--([a-z][-a-z0-9]+)$|^-([?A-Za-z])$|^-([?A-Za-z]+)$/);
            if (match) {
                const keys = match[1] // if a long key...
                    ? [ match[1] ] // ...wrap in an array
                    : match[2] // if a short key...
                        ? [ match[2] ] // ...wrap in an array
                        : match[3].split(''); // split a run of short keys
                keys.forEach(key => {
                    currentKey = key;
                    config[currentKey] = true;
                });
                isSkippingStart = false;
                continue;
            }
        }

        // Otherwise, and if a value is expected, update the current key/value
        // pair's value. Usually (but not always) that value was `true`.
        if (isSkippingStart || !currentKey) {
            ignored.push(item);
        } else {
            config[currentKey] = item;
            currentKey = ''; // expect a key, after this
        }
    }

    return { config, ignored };
}

export { parseArgv };
