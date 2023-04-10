import narrowAintas, { aintaArray, aintaDictionary, aintaObject } from '@0bdx/ainta';
import parseArgv from './parse-argv.js';
import validateConfigDescriptors from './types/validate-config-descriptors.js';

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
 * @param {import('./types/default-config-descriptors').ConfigDescriptor[]} configDescriptors
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
export default function gatherConfig(configDescriptors, env, argv, options={}) {
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
    const useFallbacks = Array(configDescriptors.length).fill(true);

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
    })

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
    return[
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
        return[
            null,
            `${begin}: ${identifier} '${strOrTrue}' cannot be parsed to a number`,
        ];    
    }
    return[isNegative ? -result : result, ''];
}


/* ---------------------------------- Tests --------------------------------- */

/**
 * ### `gatherConfig()` unit tests.
 * 
 * @param {gatherConfig} f
 *    The `gatherConfig()` function to test.
 * @returns {void}
 *    Does not return anything.
 * @throws
 *    Throws an `Error` if a test fails.
 */
export function gatherConfigTest(f) {
    const e2l = e => (e.stack.split('\n')[2].match(/([^\/]+\.js:\d+):\d+\)?$/)||[])[1];
    const equal = (actual, expected) => { if (actual === expected) return;
        try { throw Error() } catch(err) { throw Error(`actual:\n${actual}\n` +
            `!== expected:\n${expected}\n...at ${e2l(err)}\n`) } };
    const throws = (actual, expected) => { try { actual() } catch (err) {
        if (err.message !== expected) { throw Error(`actual message:\n${err.message
            }\n!== expected message:\n${expected}\n...at ${e2l(err)}\n`)} return }
        throw Error(`expected message:\n${expected}\nbut nothing was thrown\n`) };
    const toStr = value => JSON.stringify(value, null, '  ');

    // The `configDescriptors` argument should be valid.
    // There's no need to fully test `configDescriptors` validation here -
    // assume that `validateConfigDescriptors()` is already well tested.
    // @ts-expect-error
    throws(()=>f(null),
        "gatherConfig(): `configDescriptors` is null not an array");
    throws(()=>f([{ kind:'number', nameReturned:'<-bad-name->' }],{},[]),
        "gatherConfig(): `configDescriptors[0].nameReturned` '%3C-bad-name-%3E' fails /^[_a-z][_0-9a-z]*$/i");

    // The arguments should all be the correct types.
    // @ts-expect-error
    throws(()=>f([],'nope',{},[]),
        "gatherConfig(): `env` is type 'string' not 'object'\n" +
        "gatherConfig(): `argv` is type 'object' not an array\n" +
        "gatherConfig(): `options` is an array not a regular object");
    // @ts-expect-error
    throws(()=>f([],{},['',3,'-'],{ allowUnexpectedArgv:'nope', begin:[], preferEnv:123 }),
        "gatherConfig(): `argv[1]` is type 'number', not the `options.types` 'string'\n" +
        "gatherConfig(): `options.allowUnexpectedArgv` is type 'string', " +
        "not one of the `options.types` 'boolean:undefined'");

    // `options.begin` can override the default `begin`.
    // @ts-expect-error
    throws(()=>f([0],{},[],{ begin:'Override!' }),
        "Override!: `configDescriptors[0]` is type 'number', not the `options.types` 'object'");
    // @ts-expect-error
    throws(()=>f([],{a:1},[],{ begin:'Foo', preferEnv:123 }),
        "Foo: `env.a` is type 'number', not the `options.types` 'string'\n" +
        "Foo: `options.preferEnv` is type 'number', not one of the `options.types` 'boolean:undefined'");

    // `env` should be a dictionary, where every value is a string.
    // @ts-expect-error
    throws(()=>f([],{ FOO:1 },[]),
        "gatherConfig(): `env.FOO` is type 'number', not the `options.types` 'string'");

    // `argv` should be an array, where every value is a string.
    throws(()=>f([],{},['ok',null]),
        "gatherConfig(): `argv[1]` is null, not the `options.types` 'string'");

    /** @typedef {import('./types/default-config-descriptors').ConfigDescriptor} CD */
    /** @type CD */ const descFoo = {
        fallback:123,
        kind:'number',
        nameArgvLong:'foo',
        nameArgvShort:'f',
        nameEnv:'FOO',
        note:'Foo [bar] ~baz!',
        nameReturned:'_foo',
    };

    // By default, `argv` must only contain recognised keys.
    throws(()=>f([descFoo,{ kind:'boolean', nameArgvShort:'?', nameReturned:'bool' }],{},['--no-such-key']),
        "gatherConfig(): '--no-such-key' in `argv` is not defined in `configDescriptors`, " +
        "and `options.allowUnexpectedArgv` is `false`");
    throws(()=>f([descFoo,{ kind:'boolean', nameArgvShort:'?', nameReturned:'bool' }],{},['-x','Not allowed.']),
        "gatherConfig(): '-x' in `argv` is not defined in `configDescriptors`, " +
        "and `options.allowUnexpectedArgv` is `false`");
    equal(toStr(f([descFoo,{ kind:'boolean', nameArgvShort:'?', nameReturned:'bool' }],{},['--allowed','-x','ok!','-?'],
        { allowUnexpectedArgv:true })),
        toStr({ WARNINGS:'', bool:true, _foo: 123 }));

    // Minimal usage.
    equal(toStr(f([], {}, [])),
        toStr({ WARNINGS:'' }));

    // Only fallbacks. Note that `fallback` does not have to match `kind`.
    /** @type CD[] */ const onlyFallbacksDesc = [
        { fallback:99, kind:'boolean', nameReturned:'FOO' },
        { fallback:true, kind:'string', nameReturned:'BAR' },
        { fallback:'true', kind:'number', nameReturned:'BAZ' },
    ];
    equal(toStr(f(onlyFallbacksDesc, { FOO:'true', BAR:'not-used', BAZ:'123' }, [])),
        toStr({ WARNINGS:'', FOO:99, BAR:true, BAZ:'true' }));

    // Boolean values.
    // This also exercises all allowed `note` characters
    /** @type CD[] */ const boolDesc = [
        { fallback:99, kind:'boolean', nameArgvLong:'fo-o',
            nameArgvShort:'f', nameEnv:'FOO', nameReturned:'foo',
            note:' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`' },
        { kind:'boolean',
            nameArgvShort:'b', nameEnv:'BAR', nameReturned:'bar' },
        { fallback:'not-found', kind:'boolean', nameArgvLong:'ba-z',
            nameEnv:'BAZ', nameReturned:'baz',
            note:'abcdefghijklmnopqrstuvwxyz{|}~' },
    ];

    // Boolean values from `env`.
    throws(()=>f(boolDesc, { FOO:'-1.23', NotUsed:'true' }, []),
        "gatherConfig(): `configDescriptors[1]` 'bar' is mandatory, but it has no " +
        "`fallback` - `argv` and `env` do not contain this value");
    throws(()=>f(boolDesc, { FOO:'-1.23', BAR:'Some String', NotUsed:'true' }, []),
        "gatherConfig(): `configDescriptors[1]` 'bar' is mandatory, but it has no " +
        "`fallback` - `argv` does not contain it, and it is invalid in `env`");
    equal(toStr(f(boolDesc, { FOO:'-1.23', BAR:'false', NotUsed:'true' }, [])),
        toStr({ WARNINGS:"gatherConfig(): `env.FOO` '-1.23' should be boolean 'false' or 'true'\n",
            bar:false, foo:99, baz:'not-found' }));
    equal(toStr(f(boolDesc, { FOO:'true', BAR:'false', NotUsed:'true' }, [], { preferEnv:true })),
        toStr({ WARNINGS:'', foo:true, bar:false, baz:'not-found' }));

    // Boolean values from `argv`.
    throws(()=>f(boolDesc, {}, ['--fo-o','-1.23','-b','Some String','--not-used','true' ],
        { preferEnv:true, allowUnexpectedArgv:true }),
        "gatherConfig(): `configDescriptors[1]` 'bar' is mandatory, but it has no " +
        "`fallback` - it is invalid in `argv`, and `env` does not contain it");
    throws(()=>f(boolDesc, { BAR:'not bool' }, ['--fo-o','-1.23','-b','Some String','--not-used','true' ],
        { preferEnv:true, allowUnexpectedArgv:true }),
        "gatherConfig(): `configDescriptors[1]` 'bar' is mandatory, but it has no " +
        "`fallback` - it is invalid in `argv`, and also invalid in `env`");
    equal(toStr(f(boolDesc, { BAR:'true' }, ['--fo-o','-1.23','-b','Some String','--not-used' ],
        { preferEnv:true, allowUnexpectedArgv:true })),
        toStr({ WARNINGS: "gatherConfig(): '--fo-o' in `argv` '-1.23' should be boolean 'false' or 'true'\n",
            bar:true, foo:99, baz:'not-found' }));
    equal(toStr(f(boolDesc, {}, ['--fo-o','-b','false','--not-used' ], { allowUnexpectedArgv:true })),
        toStr({ WARNINGS:'', foo:true, bar:false, baz:'not-found' }));

    // Prefer boolean values from `argv` over `env` (and long over short).
    equal(toStr(f(boolDesc, { FOO:'false' }, ['--fo-o','-f','false','-b'])),
        toStr({ WARNINGS:'', foo:true, bar:true, baz:'not-found' }));

    // Prefer boolean values from `env` over `argv`.
    equal(toStr(f(boolDesc, { FOO:'false' }, ['--fo-o','-f','false','-b'], { preferEnv:true })),
        toStr({ WARNINGS:'', foo:false, bar:true, baz:'not-found' }));

    // Number values.
    /** @type CD[] */ const numDesc = [
        { fallback:false, kind:'number',
            nameArgvShort:'f',nameEnv:'FOO', nameReturned:'foo' },
        { fallback:77, kind:'number', nameArgvLong:'ba-r',
            nameArgvShort:'b', nameEnv:'BAR', nameReturned:'bar'},
        { fallback:'May be found', kind:'number',
            nameArgvShort:'?', nameEnv:'BAZ', nameReturned:'baz'},
    ];

    // Number values from `env`.
    equal(toStr(f(numDesc, { FOO:'false', BAR:'nope', NotUsed:'true' }, [], { preferEnv:true })),
        toStr({ WARNINGS:
                "gatherConfig(): `env.FOO` 'false' cannot be parsed to a number\n" +
                "gatherConfig(): `env.BAR` 'nope' cannot be parsed to a number\n",
            foo:false, bar:77, baz:'May be found' }));
    equal(toStr(f(numDesc, { FOO:'-1.23', BAR:'0b101', BAZ:'-0o10', NotUsed:'true' }, [])),
        toStr({ WARNINGS:'', foo:-1.23, bar:5, baz:-8 }));

    // Number values from `argv`.
    equal(toStr(f(numDesc, {}, ['-f','false','--ba-r','nope','--not-used','true'], { allowUnexpectedArgv:true })),
        toStr({ WARNINGS:
                "gatherConfig(): '-f' in `argv` 'false' cannot be parsed to a number\n" +
                "gatherConfig(): '--ba-r' in `argv` 'nope' cannot be parsed to a number\n",
            foo:false, bar:77, baz:'May be found' }));
    equal(toStr(f(numDesc, {}, ['-f','-1.23','--ba-r','0o5','-?','-0x8','--not-used','true'],
        { allowUnexpectedArgv:true, preferEnv:true })),
        toStr({ WARNINGS:'', foo:-1.23, bar:5, baz:-8 }));

    // Prefer number values from `argv` over `env`.
    equal(toStr(f(numDesc, { BAR:'-0xff' }, ['--ba-r','-.03e-4'])),
        toStr({ WARNINGS:'', bar:-0.000003, foo:false, baz:'May be found' }));

    // Prefer number values from `env` over `argv`.
    equal(toStr(f(numDesc, { BAR:'-0xff' }, ['--ba-r','-.03e-4','-b','42'], { preferEnv:true })),
        toStr({ WARNINGS:'', bar:-255, foo:false, baz:'May be found' }));

    // String values.
    /** @type CD[] */ const strDesc = [
        { fallback:false, kind:'string', nameArgvLong:'fo-o',
            nameEnv:'FOO', nameReturned:'foo' },
        { fallback:77, kind:'string', nameArgvLong:'bar---1',
            nameArgvShort:'B', nameEnv:'BAR', nameReturned:'bar'},
        { fallback:'NOT_FOUND', kind:'string',
            nameEnv:'BAZ', nameReturned:'baz'},
    ];

    // String values from `env`.
    equal(toStr(f(strDesc, { FOO:'', BAR:'99.9', NotUsed:'true' }, [])),
        toStr({ WARNINGS:'', foo:'', bar:'99.9', baz:'NOT_FOUND' }));

    // String values from `argv`.
    equal(toStr(f(strDesc, {}, ['-B','overridden','--fo-o','','--bar---1','99.9','-B','overridden-too','--not-used'],
        { allowUnexpectedArgv:true })),
        toStr({ WARNINGS:'', foo:'', bar:'99.9', baz:'NOT_FOUND' }));

    // Prefer string values from `argv` over `env`.
    equal(toStr(f(strDesc, { FOO:'from env', BAZ:'55' }, ['--fo-o','from argv'])),
        toStr({ WARNINGS:'', foo:'from argv', baz:'55', bar:77 }));

    // Prefer string values from `env` over `argv`.
    equal(toStr(f(strDesc, { FOO:'from env' }, ['--fo-o','from argv'], { preferEnv:true })),
        toStr({ WARNINGS:'', foo:'from env', bar:77, baz:'NOT_FOUND' }));

}
