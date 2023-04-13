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
export default function parseArgv(argv) {
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
    const e2l = e => (e.stack.split('\n')[2].match(/([^\/]+\.js:\d+):\d+\)?$/)||[])[1];
    const equal = (actual, expected) => { if (actual === expected) return;
        try { throw Error() } catch(err) { throw Error(`actual:\n${actual}\n` +
            `!== expected:\n${expected}\n...at ${e2l(err)}\n`) } };
    const throws = (actual, expected) => { try { actual() } catch (err) {
        if (err.message !== expected) { throw Error(`actual message:\n${err.message
            }\n!== expected message:\n${expected}\n...at ${e2l(err)}\n`)} return }
        throw Error(`expected message:\n${expected}\nbut nothing was thrown\n`) };
    const toStr = value => JSON.stringify(value, null, '  ');

    // The `argv` argument should be an array of strings.
    throws(()=>f(null),
        "parseArgv(): `argv` is null not an array");
    // @ts-expect-error
    throws(()=>f(['',1,[],'ok',null]),
        "parseArgv(): `argv[1]` is type 'number', not the `options.types` 'string'");
    // @ts-expect-error
    throws(()=>f(['','1',[],'ok',null]),
        "parseArgv(): `argv[2]` is an array, not the `options.types` 'string'");
    throws(()=>f(['','1','[]','ok',null]),
        "parseArgv(): `argv[4]` is null, not the `options.types` 'string'");

    // Minimal usage.
    equal(toStr(f([])),
        toStr({ config:{}, ignored:[] }));

    // Long names.
    equal(toStr(f(['-foo','bar'])), // you probably meant '--foo'
        toStr({ config:{ f:true, o:'bar' }, ignored:[] }));
    equal(toStr(f(['--foo','bar'])),
        toStr({ config:{ foo:'bar' }, ignored:[] }));
    equal(toStr(f(['--foo','bar','--foo','override'])),
        toStr({ config:{ foo:'override' }, ignored:[] }));
    equal(toStr(f(['/ignored','--also/ignored','ditto','--half','0.5'])),
        toStr({ config:{ half:'0.5' }, ignored:['/ignored','--also/ignored','ditto'] }));
    equal(toStr(f(['--yes','true','--no','false','--yes-again'])),
        toStr({ config:{ yes:'true', no:'false', 'yes-again': true }, ignored:[] }));
    equal(toStr(f(['x','x','--ok','--café','lost','& gone','--num','1','2'])),
        toStr({ config:{ ok:'--café', num:'1' }, ignored:['x','x','lost','& gone','2'] }));

    // Short names.
    equal(toStr(f(['--f','bar'])), // not like this!
        toStr({ config:{}, ignored:['--f','bar'] }));
    equal(toStr(f(['-a','1','--f','bar'])),
        toStr({ config:{ a:'1' }, ignored:['--f','bar'] }));
    equal(toStr(f(['-f','bar'])),
        toStr({ config:{ f:'bar' }, ignored:[] }));
    equal(toStr(f(['-f','bar','-f','override'])),
        toStr({ config:{ f:'override' }, ignored:[] }));
    equal(toStr(f(['--Ignored','/also/ignored','-h','0.5','-y','true'])),
        toStr({ config:{ h:'0.5', y:'true' }, ignored:['--Ignored','/also/ignored'] }));
    equal(toStr(f(['x','x','x','-b','-B','-o','','-?'])),
        toStr({ config:{ b:true,B:true,o:'','?':true }, ignored:['x','x','x'] }));

    // Run of short names.
    equal(toStr(f(['--abc','FOO','BAR'])), // not a run of short names
        toStr({ config:{ abc:'FOO' }, ignored:['BAR'] }));
    equal(toStr(f(['--abc?','FOO','BAR'])), // '?' prevents it being a long name
        toStr({ config:{}, ignored:['--abc?','FOO','BAR'] }));
    equal(toStr(f(['-Abc?','true','BAR'])),
        toStr({ config:{ A:true, b:true, c:true, '?':'true' }, ignored:['BAR'] }));
    // From the JSDoc @example, above.
    equal(toStr(f(['/path/to/node','/tmp/run.js','-A?i','input/file.txt'])),
        toStr({
            config: { A:true, '?':true, i:'input/file.txt' },
            ignored: [ '/path/to/node', '/tmp/run.js' ],
        }));

    // Mix of long and short names.
    equal(toStr(f(['--truthy','-f','foo','bar','--no-way','false','123'])),
        toStr({ config:{ truthy:true, f:'foo', 'no-way':'false' }, ignored:['bar','123'] }));
    // From the JSDoc @example, above.
    equal(toStr(f(['--foo','-?','Q A','-','-B','--z--9','--','lost'])),
    toStr({
        config: { foo:true, '?':'Q A', B:true, 'z--9':'--' },
        ignored: [ '-', 'lost' ],
    }));

}
