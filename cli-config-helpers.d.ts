/**
 * ### Describes a value expected in a config file, `process.env` or `argv`.
 */
export type ConfigDescriptor = {
    /**
     * An optional default value to use if the configuration file, `process.env`
     * and `process.argv` do not contain this variable. If `fallback` is
     * `undefined`, the value is mandatory.
     */
    fallback?: boolean | number | string;
    /**
     *    Determines the allowed type of value, `boolean`, `number`, or `string`.
     */
    kind: 'boolean' | 'number' | 'string';
    /**
     * The value's long name in the 'arguments vector', `process.argv`.
     * - Must start with a lowercase ASCII letter
     * - Must continue with at least one dash, digit or lowercase ASCII letter
     * - Must be no longer than 32 characters
     * - If `undefined`, there is no long name
     */
    nameArgvLong?: string;
    /**
     * The value's short name in the 'arguments vector', `process.argv`.
     * - Must be a lower or uppercase ASCII letter, or the question mark `"?"`
     * - Must be exactly one character long
     * - If `undefined`, there is no short name
     */
    nameArgvShort?: string;
    /**
     * The value's name in the shell environment, `process.env`.
     * - Must start with an uppercase ASCII letter
     * - May continue with an underscore, digit or uppercase ASCII letter
     * - Must be no longer than 32 characters
     * - If `undefined`, value cannot come from the shell environment
     */
    nameEnv?: string;
    /**
     *    The property name in the dictionary object that `gatherConfig()` returns.
     *    - Must start with an underscore or ASCII letter
     *    - May continue with an underscore, digit or ASCII letter
     *    - Must be no longer than 32 characters
     */
    nameReturned: string;
    /**
     * A one-line summary of the expected value, up to 64 characters long, which
     * will be displayed by `generateHelp()` if not `undefined`.
     * - May contain any printable ASCII character, except the backslash `"\"`
     * - Must be between 1 and 64 characters long
     */
    note?: string;
};
/**
 * ### Describes a value expected in a config file, `process.env` or `argv`.
 *
 * @typedef {object} ConfigDescriptor
 * @property {boolean|number|string} [fallback]
 *    An optional default value to use if the configuration file, `process.env`
 *    and `process.argv` do not contain this variable. If `fallback` is
 *    `undefined`, the value is mandatory.
 * @property {'boolean'|'number'|'string'} kind
 *    Determines the allowed type of value, `boolean`, `number`, or `string`.
 * @property {string} [nameArgvLong]
 *    The value's long name in the 'arguments vector', `process.argv`.
 *    - Must start with a lowercase ASCII letter
 *    - Must continue with at least one dash, digit or lowercase ASCII letter
 *    - Must be no longer than 32 characters
 *    - If `undefined`, there is no long name
 * @property {string} [nameArgvShort]
 *    The value's short name in the 'arguments vector', `process.argv`.
 *    - Must be a lower or uppercase ASCII letter, or the question mark `"?"`
 *    - Must be exactly one character long
 *    - If `undefined`, there is no short name
 * @property {string} [nameEnv]
 *    The value's name in the shell environment, `process.env`.
 *    - Must start with an uppercase ASCII letter
 *    - May continue with an underscore, digit or uppercase ASCII letter
 *    - Must be no longer than 32 characters
 *    - If `undefined`, value cannot come from the shell environment
 * @property {string} nameReturned
 *    The property name in the dictionary object that `gatherConfig()` returns.
 *    - Must start with an underscore or ASCII letter
 *    - May continue with an underscore, digit or ASCII letter
 *    - Must be no longer than 32 characters
 * @property {string} [note]
 *    A one-line summary of the expected value, up to 64 characters long, which
 *    will be displayed by `generateHelp()` if not `undefined`.
 *    - May contain any printable ASCII character, except the backslash `"\"`
 *    - Must be between 1 and 64 characters long
 */
/**
 * ### An empty array of `ConfigDescriptor` objects.
 *
 * If no values are expected, there are no configuration descriptors. A function
 * which takes a `configDescriptors` argument could use this as the default.
 *
 * But using an empty `[]` like this is really a way to export the type, while
 * avoiding the "File '...' is not a module. ts(2306)" error.
 *
 * @type ConfigDescriptor[]
 */
export const defaultConfigDescriptors: ConfigDescriptor[];
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
export function parseArgv(argv: string[]): {
    config: {
        [x: string]: string | true;
    };
    ignored: string[];
};
/**
 * ### Validates an array of `ConfigDescriptor` objects.
 *
 * @param {any} configDescriptors
 *    If valid, an array of correctly formed `ConfigDescriptor` objects.
 * @param {string} [begin='validateConfigDescriptors()']
 *    An optional way to override the `begin` string sent to `Ainta` functions.
 * @returns {false|string}
 *    Returns boolean `false` if `configDescriptors` is valid, or otherwise a
 *    short explanation of the problem.
 * @throws
 *    Throws an `Error` if the `begin` argument is invalid.
 */
export function validateConfigDescriptors(configDescriptors: any, begin?: string): false | string;
