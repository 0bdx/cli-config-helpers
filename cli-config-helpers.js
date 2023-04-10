/**
 * https://www.npmjs.com/package/cli-config-helpers
 * @version 0.0.1
 * @license Copyright (c) 2023 0bdx <0@0bdx.com> (0bdx.com)
 * SPDX-License-Identifier: MIT
 */
import narrowAintas, { aintaArray, aintaString, aintaObject, aintaDictionary } from '@0bdx/ainta';

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
function validateConfigDescriptors(
    configDescriptors,
    begin = 'validateConfigDescriptors()'
) {

    // Validate `begin`, and throw an exception if it fails.
    const aBegin = aintaString(begin, 'begin',
        { begin:'validateConfigDescriptors()'});
    if (aBegin) throw Error(aBegin);

    // Fail early, if `configDescriptors` is not an array of objects.
    const aCDs = aintaArray(configDescriptors, 'configDescriptors',
        { begin, types:['object'] });
    if (aCDs) return aCDs;

    // Define a valid `ConfigDescriptor`, using an Ainta `schema` object.
    /** @type {import('@0bdx/ainta').Schema} */
    const schema = {
        // If `fallback` is 'undefined', the value is mandatory.
        fallback: { types:['boolean','number','string','undefined'] },
        // fallback: { fit:'bool|num|str?' }, // @TODO add `fit` to Ainta

        // Determine which kind of value to expect, boolean, number, or string.
        kind: { enum:['boolean','number','string'], types:['string'] },
        // kind: { fit:'str', is:['boolean','number','string'] }, // @TODO add `fit` and `is` to Ainta

        // The value's long name in the 'arguments vector', `process.argv`.
        // - Must start with a lowercase ASCII letter
        // - Must continue with at least one dash, digit or lowercase ASCII letter
        // - Must be no longer than 32 characters
        nameArgvLong: { max:32, min:2, rx:/^[a-z][-0-9a-z]+$/, types:['string','undefined'] },

        // The value's short name in the 'arguments vector', `process.argv`.
        // - Must be a lower or uppercase ASCII letter, or the question mark `"?"`
        // - Must be exactly one character long
        nameArgvShort: { max:1, min:1, rx:/^[a-z?]$/i, types:['string','undefined'] },

        // The value's name in the environment:
        // - Must start with an uppercase ASCII letter
        // - May continue with an underscore, digit or uppercase ASCII letter
        // - Must be no longer than 32 characters
        nameEnv: { max:32, min:1, rx:/^[A-Z][_0-9A-Z]*$/, types:['string','undefined'] },

        // The property name in the returned dictionary object.
        // - Must start with an underscore or ASCII letter
        // - May continue with an underscore, digit or ASCII letter
        // - Must be no longer than 32 characters
        nameReturned: { max:32, min:1, rx:/^[_a-z][_0-9a-z]*$/i, types:['string'] },

        // A one-line summary of the expected value, up to 64 characters long.
        note: { max:64, min:1, rx:/^[ -\[\]-~]+$/, types:['string','undefined'] },
    };

    // Validate each item, and return an explanation if one fails.
    const aSchemaResults = configDescriptors
        .map((d, i) =>
            aintaObject(d, `configDescriptors[${i}]`, { begin, schema }))
        .filter(result => result)
    ;
    if (aSchemaResults.length) return aSchemaResults.join('\n');

    // If `nameArgvLong`, `nameArgvShort` and `nameEnv` are all undefined,
    // `fallback` cannot also be undefined.
    const aAllUndefinedResults = configDescriptors
        .map(({ fallback, nameArgvLong, nameArgvShort, nameEnv, nameReturned }, i) => {
            if (fallback === void 0
                && nameArgvLong === void 0
                && nameArgvShort === void 0
                && nameEnv === void 0
            ) return `${begin ? begin + ': ' : '' }\`configDescriptors[${i}]\` ` +
                `'${nameReturned}' has no possible value, because \`fallback\`, ` +
                '`nameArgvLong`, `nameArgvShort` and `nameEnv` are all undefined';
        })
        .filter(result => result)
    ;
    if (aAllUndefinedResults.length) return aAllUndefinedResults.join('\n');

    // Builds a name-collision error message.
    const collisionMessage = (currentIndex, existingIndex, key, val) =>
        `${begin ? begin + ': ' : '' }\`configDescriptors[${currentIndex}].${key}\` ` +
        `'${val}' was already used by \`configDescriptors[${existingIndex}]\``;

    // Check that `configDescriptors` does not contain any name collisions.
    const nameArgvLongs = {}, nameArgvShorts = {}, nameEnvs = {}, nameReturneds = {};
    const aCollisionResults = configDescriptors
        .map(({ nameArgvLong, nameArgvShort, nameEnv, nameReturned }, i) => {
            if (nameArgvLong) {
                if (nameArgvLong in nameArgvLongs) return collisionMessage(i,
                    nameArgvLongs[nameArgvLong], 'nameArgvLong', nameArgvLong);
                nameArgvLongs[nameArgvLong] = i;
            }
            if (nameArgvShort) {
                if (nameArgvShort in nameArgvShorts) return collisionMessage(i,
                    nameArgvShorts[nameArgvShort], 'nameArgvShort', nameArgvShort);
                nameArgvShorts[nameArgvShort] = i;
            }
            if (nameEnv) {
                if (nameEnv in nameEnvs) return collisionMessage(i,
                    nameEnvs[nameEnv], 'nameEnv', nameEnv);
                nameEnvs[nameEnv] = i;
            }
            if (nameReturned in nameReturneds) return collisionMessage(i,
                nameReturneds[nameReturned], 'nameReturned', nameReturned);
            nameReturneds[nameReturned] = i;
        })
        .filter(result => result)
    ;
    if (aCollisionResults.length) return aCollisionResults.join('\n');

    // Return `false` to signify there were no issues.
    return false;
}

/**
 * ### A configuration object for `gatherConfig()`.
 *
 * Each option is actually optional, so an empty object `{}` is perfectly valid.
 * 
 * @TODO rethink `preferEnv`, when gathering from a config file is added
 *
 * @typedef {object} GatherConfigOptions
 * @property {boolean} [allowUnexpectedArgv=false]
 *    Optional flag. If `true`, unexpected values in `argv` do not throw an error.
 * @property {string} [begin='gatherConfig()']
 *    An optional way to override the `begin` string sent to `Ainta` functions.
 * @property {boolean} [preferEnv=false]
 *    Optional flag. If `true`, values in `env` override values in `argv`.
 */

/**
 * ### Gathers values from a configuration file, `process.env` or `process.argv`.
 *
 * @TODO gather from a config file - that will mean six possible sources
 *
 * There are five possible sources of an expected variable's value:
 * 1. `argv` - long command line arguments, eg `my_command --my-var 123`
 * 2. `argv` - short command line arguments, eg `my_command -m 123`
 * 3. `argv` - runs of short command line arguments, eg `my_command -abc 123`
 * 4. `env` - the node process's environment, eg `MY_VAR=123 my_command`
 * 5. `configDescriptors.fallback` - a default provided in a `Descriptor` object
 *
 * Generally, command line arguments are preferred over environment variables,
 * but that behavior can be overridden:
 * - By default, the order of preference is 1, 2, 3, 4, 5
 * - If `options.preferEnv` is set to `true`, the order is 4, 1, 2, 3, 5
 *
 * If a `ConfigDescriptor` object doesn’t provide a fallback, then that variable
 * is mandatory, and `gatherConfig()` will throw an Error if that variable does
 * not exist in `env` or `argv`.
 *
 * Note that unexpected values in `env` are ignored. By default, unexpected
 * values in `argv` throw an error, but you can switch that behavior off using
 * the `allowUnexpectedArgv` option.
 *
 * The values in `env` and `argv` will all be strings, but `gatherConfig()` will
 * convert the strings "true" and "false" to booleans, and convert strings like
 * "-12.34e-5", "0b10101" and "-Infinity" to numbers.
 * 
 * @param {ConfigDescriptor[]} configDescriptors
 *    An array of objects which describe the expected configuration values.
 * @param {Object.<string, string>} env
 *    A ‘dictionary object’, usually the environment variables, `process.env`.
 * @param {string[]} argv
 *    An ‘arguments vector’, usually the command line arguments, `process.argv`.
 * @param {GatherConfigOptions} [options={}]
 *    The optional configuration object.
 * @returns {Object.<string, boolean|number|string>}
 *    A ‘dictionary object’ where the values are booleans, numbers or strings.
 *    This object always contains a special `WARNINGS` string, which is empty
 *    if there were no issues.
 * @throws
 *    Throws an `Error` if:
 *    - Any of the arguments are invalid
 *    - A mandatory variable is not specified in `env` or `argv`
 *    - `options.allowUnexpectedArgv` is false and `argv` has unexpected values
 */
function gatherConfig(configDescriptors, env, argv, options={}) {
    const begin = typeof options.begin === 'string' ? options.begin : 'gatherConfig()';

    // If `configDescriptors` ainta valid array of `ConfigDescriptor` objects,
    // throw an exception explaining went wrong.
    const aCDs = validateConfigDescriptors(configDescriptors, begin);
    if (aCDs) throw Error(aCDs);

    // Define a valid `GatherConfigOptions`, using an Ainta `schema` object.
    /** @type {import('@0bdx/ainta').Schema} */
    const schema = {
        allowUnexpectedArgv: { types:['boolean','undefined'] },
        begin: { types:['string','undefined'] },
        preferEnv: { types:['boolean','undefined'] },
    };

    // Use `narrowAintas()` to create three specialist validators, which all
    // add their explanations to the `aResults` array.
    const [ aResults, aEnv, aArgv, aOptions ] = narrowAintas({ begin, schema },
        aintaDictionary, aintaArray, aintaObject );

    // Validate the `env`, `argv` and `options` arguments, and throw an
    // exception if one or more fail.
    aEnv(env, 'env', { types:['string'] });
    aArgv(argv, 'argv', { types:['string'] });
    aOptions(options, 'options');
    if (aResults.length) throw Error(aResults.join('\n'));

    // Prepare an array which will determine whether fallbacks will be needed.
    // @TODO use `.fill(true)` if we upgrade tsconfig.js's compilerOptions.lib
    const useFallbacks = [...Array(configDescriptors.length)].map(() => true);

    /** @type Object.<string, boolean|number|string> */
    const out = { WARNINGS:'' };

    // If environment variables are preferred over command line variables, try
    // to get as many as possible from `env`.
    if (options.preferEnv) {
        configDescriptors.forEach(({ kind, nameEnv, nameReturned }, i) => {
            if (nameEnv in env) recordInOutput(out, nameReturned, useFallbacks,
                i, kind, begin, '`env.' + nameEnv + '`', env[nameEnv]);
        });

        // If environment variables are preferred over command line variables,
        // and all of the expected values have been found in `env`, then
        // `gatherConfig()` can finish now, and avoid parsing `argv`.
        if (useFallbacks.every(doUse => !doUse)) return out;
    }

    // Convert an `argv` like `[ "--flag", "-bN", "2", "--str", "!", "x" ]` to:
    // `{ config: { flag:true, b:true, N:"2", str:"!" }, ignored: [ "x" ] }`.
    // @TODO do something with `ignored`
    const { config:argvConfig } = parseArgv(argv);

    // By default, `argv` is not allowed to contain unexpected key/val pairs.
    if (!options.allowUnexpectedArgv) {
        const [ nameArgvLongs, nameArgvShorts ] = configDescriptors.reduce(
            ([ longs, shorts ], { nameArgvLong, nameArgvShort }) => [
                nameArgvLong ? { ...longs, [nameArgvLong]:true } : longs,
                nameArgvShort ? { ...shorts, [nameArgvShort]:true } : shorts,
            ], [{}, {}], // initial accumulator
        );
        Object.keys(argvConfig).forEach(key => {
            if (!(key in nameArgvLongs) && !(key in nameArgvShorts)) {
                const identifier = (key.length === 1 ? '-' : '--') + key;
                throw Error(`${begin}: '${identifier}' in \`argv\` is not defined in ` +
                    '`configDescriptors`, and `options.allowUnexpectedArgv` is `false`');
            }
        });
    }

    // Try to get as many variables as possible from the command line arguments.
    configDescriptors.forEach(({ kind, nameArgvLong, nameArgvShort, nameReturned }, i) => {
        if (useFallbacks[i] === false) return; // already found in `env`.
        const key = nameArgvLong in argvConfig
            ? nameArgvLong
            : nameArgvShort in argvConfig
                ? nameArgvShort
                : '';
        const identifier = nameArgvLong in argvConfig
            ? `'--${nameArgvLong}' in \`argv\``
            : nameArgvShort in argvConfig
                ? `'-${nameArgvShort}' in \`argv\``
                : '';
        if (key) recordInOutput(out, nameReturned, useFallbacks,
            i, kind, begin, identifier, argvConfig[key]);
    });

    // If command line variables are preferred over environment variables,
    // and all of the expected values have been found in `argv`, then
    // `gatherConfig()` can finish now, and avoid parsing `env`.
    if (!options.preferEnv && useFallbacks.every(doUse => !doUse)) return out;

    // Otherwise, if command line variables are preferred over environment
    // variables and there are still values to be gathered, try to get as many
    // as possible from `env`.
    if (!options.preferEnv) {
        configDescriptors.forEach(({ kind, nameEnv, nameReturned }, i) => {
            if (useFallbacks[i] === false) return; // already found in `env`.
            if (nameEnv in env) recordInOutput(out, nameReturned, useFallbacks,
                i, kind, begin, '`env.' + nameEnv + '`', env[nameEnv]);
        });
    }

    // If any values still haven't been found, use the `fallback` if available.
    useFallbacks.forEach((useFallback, i) => {
        if (useFallback) {
            const desc = configDescriptors[i];
            const { nameEnv, nameArgvLong, nameArgvShort, nameReturned } = desc;
            if (!('fallback' in desc)) {
                const pfx = `${begin}: \`configDescriptors[${i}]\` '${nameReturned}' ` +
                    'is mandatory, but it has no `fallback` - ';
                const hasArgv = (nameArgvLong in argvConfig) || (nameArgvShort in argvConfig);
                const hasEnv = nameEnv in env;
                if (!hasEnv && !hasArgv) throw Error(pfx +
                    '`argv` and `env` do not contain this value');
                if (hasEnv && !hasArgv) throw Error(pfx +
                    '`argv` does not contain it, and it is invalid in `env`');
                if (!hasEnv && hasArgv) throw Error(pfx +
                    'it is invalid in `argv`, and `env` does not contain it');
                throw Error(pfx +
                    'it is invalid in `argv`, and also invalid in `env`');
            }
            out[nameReturned] = desc.fallback;
        }
    });

    return out;
}


/* ----------------------------- Private Methods ---------------------------- */

function recordInOutput(out, nameReturned, useFallbacks, i, kind, begin, identifier, strOrTrue) {
    const result = stringToType(kind, begin, identifier, strOrTrue);
    if (result[1] === '') {
        out[nameReturned] = result[0];
        useFallbacks[i] = false;
    } else {
        out.WARNINGS += result[1] + '\n';
    }
}

function stringToType(kind, begin, identifier, strOrTrue) {
    switch (kind) {
        case 'boolean':
            return stringOrTrueToBoolean(begin, identifier, strOrTrue);
        case 'number':
            return stringToNumber(begin, identifier, strOrTrue);
        default: // must be 'string'
            return [ strOrTrue, ''];
    }
}

function stringOrTrueToBoolean(begin, identifier, strOrTrue) {
    if (strOrTrue === 'false') return [false, ''];
    if (strOrTrue === true || strOrTrue === 'true') return [true, ''];
    return [
        null,
        `${begin}: ${identifier} '${strOrTrue}' should be boolean 'false' or 'true'`,
    ];
}

function stringToNumber(begin, identifier, strOrTrue) {
    const isNegative = strOrTrue[0] === '-';
    const abs = isNegative ? strOrTrue.slice(1) : strOrTrue;
    const base = { '0b':2, '0x':16, '0o':8 }[abs.slice(0,2)] || 10;
    const result = base === 10
        ? parseFloat(abs)
        : parseInt(abs.slice(2), base);
    if (isNaN(result)) {
        return [
            null,
            `${begin}: ${identifier} '${strOrTrue}' cannot be parsed to a number`,
        ];    
    }
    return [isNegative ? -result : result, ''];
}

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
const defaultConfigDescriptors = [];

export { defaultConfigDescriptors, gatherConfig, parseArgv, validateConfigDescriptors };
