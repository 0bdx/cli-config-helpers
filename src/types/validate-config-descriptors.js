import { aintaArray, aintaString, aintaObject } from '@0bdx/ainta';

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
export default function validateConfigDescriptors(
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
        kind: { is:['boolean','number','string'], types:['string'] },
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
        `'${val}' was already used by \`configDescriptors[${existingIndex}]\``

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


/* ---------------------------------- Tests --------------------------------- */

/**
 * ### `validateConfigDescriptors()` unit tests.
 * 
 * @param {validateConfigDescriptors} f
 *    The `validateConfigDescriptors()` function to test.
 * @returns {void}
 *    Does not return anything.
 * @throws
 *    Throws an `Error` if a test fails.
 */
export function validateConfigDescriptorsTest(f) {
    const e2l = e => (e.stack.split('\n')[2].match(/([^\/]+\.js:\d+):\d+\)?$/)||[])[1];
    const equal = (actual, expected) => { if (actual === expected) return;
        try { throw Error() } catch(err) { throw Error(`actual:\n${actual}\n` +
            `!== expected:\n${expected}\n...at ${e2l(err)}\n`) } };
    const throws = (actual, expected) => { try { actual() } catch (err) {
        if (err.message !== expected) { throw Error(`actual message:\n${err.message
            }\n!== expected message:\n${expected}\n...at ${e2l(err)}\n`)} return }
        throw Error(`expected message:\n${expected}\nbut nothing was thrown\n`) };

    // If set, the `begin` argument should be a string.
    // @ts-expect-error
    throws(()=>f([],0),
        "validateConfigDescriptors(): `begin` is type 'number' not 'string'");
    throws(()=>f([],null),
        "validateConfigDescriptors(): `begin` is null not type 'string'");

    // The `configDescriptors` argument should be an array.
    equal(f(),
        "validateConfigDescriptors(): `configDescriptors` is type 'undefined' not an array")
    equal(f('[]', 'foo()'),
        "foo(): `configDescriptors` is type 'string' not an array")
    equal(f({}, ''),
        "`configDescriptors` is type 'object' not an array")
    equal(f(null, ''),
        "`configDescriptors` is null not an array")

    // The `configDescriptors` argument should only contain regular objects.
    equal(f([null], '-'),
        "-: `configDescriptors[0]` is null, not a regular object");
    equal(f([Math,1,{}], ''),
        "`configDescriptors[1]` is type 'number', not the `options.types` 'object'");
    equal(f([/abc/,[]], void 0),
        "validateConfigDescriptors(): `configDescriptors[1]` is an array, not a regular object");

    // In `configDescriptors`, only `kind` and `nameReturned` are mandatory.
    /** @typedef {import('./default-config-descriptors').ConfigDescriptor} CD */
    // @ts-expect-error
    /** @type CD */ const desc0 = {};
    // @ts-expect-error
    /** @type CD */ const desc1 = { fallback:123 };
    /** @type CD */ const desc2 = { ...desc1, kind:'number' };
    /** @type CD */ const desc3 = { ...desc2, nameArgvLong:'foo' };
    /** @type CD */ const desc4 = { ...desc3, nameArgvShort:'f' };
    /** @type CD */ const desc5 = { ...desc4, nameEnv:'FOO' };
    /** @type CD */ const desc6 = { ...desc5, note:'Foo [bar] ~baz!' };
    /** @type CD */ const desc7 = { ...desc6, nameReturned:'_foo' };

    equal(f([desc0,desc1,desc2,desc3,desc4,desc5,desc6,desc7],''),
        "`configDescriptors[0].kind` is type 'undefined', not the `options.types` 'string'\n" +
        "`configDescriptors[1].kind` is type 'undefined', not the `options.types` 'string'\n" +
        "`configDescriptors[2].nameReturned` is type 'undefined', not the `options.types` 'string'\n" +
        "`configDescriptors[3].nameReturned` is type 'undefined', not the `options.types` 'string'\n" +
        "`configDescriptors[4].nameReturned` is type 'undefined', not the `options.types` 'string'\n" +
        "`configDescriptors[5].nameReturned` is type 'undefined', not the `options.types` 'string'\n" +
        "`configDescriptors[6].nameReturned` is type 'undefined', not the `options.types` 'string'");

    // The `configDescriptors` properties should conform to allowed values.
    equal(f([{...desc7, fallback:()=>{}}],''),
        "`configDescriptors[0].fallback` is type 'function', not one of the " +
        "`options.types` 'boolean:number:string:undefined'");
    equal(f([{...desc7, kind:'String'}],''),
        "`configDescriptors[0].kind` 'String' is not in 'boolean:number:string'");
    equal(f([{...desc7, nameArgvLong:'a'}],''),
        "`configDescriptors[0].nameArgvLong` 'a' is not min 2");
    equal(f([{...desc7, nameArgvLong:'abcdefghijklmnopqrstuvwxyz0123456'}],''),
        "`configDescriptors[0].nameArgvLong` 'abcdefghijklmnopqrstu...z0123456' is not max 32");
    equal(f([{...desc7, nameArgvLong:'-begins-dash'}],''),
        "`configDescriptors[0].nameArgvLong` '-begins-dash' fails /^[a-z][-0-9a-z]+$/");
    equal(f([{...desc7, nameArgvLong:'café'}],''),
        "`configDescriptors[0].nameArgvLong` 'caf%C3%A9' fails /^[a-z][-0-9a-z]+$/");
    equal(f([{...desc7, nameArgvShort:''}],''),
        "`configDescriptors[0].nameArgvShort` '' is not min 1");
    equal(f([{...desc7, nameArgvShort:'aa'}],''),
        "`configDescriptors[0].nameArgvShort` 'aa' is not max 1");
    equal(f([{...desc7, nameArgvShort:'-'}],''),
        "`configDescriptors[0].nameArgvShort` '-' fails /^[a-z?]$/i");
    equal(f([{...desc7, nameArgvShort:'ü'}],''),
        "`configDescriptors[0].nameArgvShort` '%C3%BC' fails /^[a-z?]$/i");
    equal(f([{...desc7, nameEnv:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456'}],''),
        "`configDescriptors[0].nameEnv` 'ABCDEFGHIJKLMNOPQRSTU...Z0123456' is not max 32");
    equal(f([{...desc7, nameEnv:'_BEGINS_UNDERSCORE'}],''),
        "`configDescriptors[0].nameEnv` '_BEGINS_UNDERSCORE' fails /^[A-Z][_0-9A-Z]*$/");
    equal(f([{...desc7, nameEnv:'ContainsLowercase'}],''),
        "`configDescriptors[0].nameEnv` 'ContainsLowercase' fails /^[A-Z][_0-9A-Z]*$/");
    equal(f([{...desc7, nameReturned:''}],'Empty string'),
        "Empty string: `configDescriptors[0].nameReturned` '' is not min 1");
    equal(f([{...desc7, nameReturned:'__1abcdefgh__ABCDEFGHIJK_0123456789'}],''),
        "`configDescriptors[0].nameReturned` '__1abcdefgh__ABCDEFGH...23456789' is not max 32");
    equal(f([desc7,{...desc7, nameReturned:'café'}]),
        "validateConfigDescriptors(): `configDescriptors[1].nameReturned` 'caf%C3%A9' fails /^[_a-z][_0-9a-z]*$/i");
    equal(f([{...desc7, nameReturned:'contains-dash'}],''),
        "`configDescriptors[0].nameReturned` 'contains-dash' fails /^[_a-z][_0-9a-z]*$/i");
    equal(f([{...desc7, note:null}],''),
        "`configDescriptors[0].note` is null, not one of the `options.types` 'string:undefined'");
    equal(f([{...desc7, note:''}],''),
        "`configDescriptors[0].note` '' is not min 1");
    equal(f([{...desc7, note:' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_~a'}],''),
        "`configDescriptors[0].note` ' !%22#$%25&'()*+,-./01234...YZ%5B%5D%5E_~a' is not max 64");
    equal(f([{...desc7, note:'\\'}],''),
        "`configDescriptors[0].note` '%5C' fails /^[ -\\[\\]-~]+$/");

    // If `nameArgvLong`, `nameArgvShort` and `nameEnv` are all undefined,
    // `fallback` cannot also be undefined.
    equal(f([{ kind:'boolean', nameReturned:'a' }],'Boolean'),
        "Boolean: `configDescriptors[0]` 'a' has no possible value, because " +
        "`fallback`, `nameArgvLong`, `nameArgvShort` and `nameEnv` are all undefined");
    equal(f([desc7,{ kind:'string', nameReturned:'foo' },desc7,{ kind:'string', nameReturned:'bar' }],''),
        "`configDescriptors[1]` 'foo' has no possible value, because " +
        "`fallback`, `nameArgvLong`, `nameArgvShort` and `nameEnv` are all undefined\n" +
        "`configDescriptors[3]` 'bar' has no possible value, because " +
        "`fallback`, `nameArgvLong`, `nameArgvShort` and `nameEnv` are all undefined");

    // `configDescriptors` should contain no name collisions.
    // Note that `nameArgvShort` and `nameEnv` could both be "F", for example.
    equal(f([desc7,desc7],''),
        "`configDescriptors[1].nameArgvLong` 'foo' was already used by `configDescriptors[0]`");
    equal(f([desc7, {...desc7, nameArgvLong:'foo-'}],''),
        "`configDescriptors[1].nameArgvShort` 'f' was already used by `configDescriptors[0]`");
    equal(f([desc7, {...desc7, nameArgvLong:'foo-', nameArgvShort:'F'}],'abc'),
        "abc: `configDescriptors[1].nameEnv` 'FOO' was already used by `configDescriptors[0]`");
    equal(f([desc7, {...desc7, nameArgvLong:'foo-', nameArgvShort:'F', nameEnv:'F'}],''),
        "`configDescriptors[1].nameReturned` '_foo' was already used by `configDescriptors[0]`");
    equal(f([desc7, {...desc7, nameArgvLong:'foo-', nameArgvShort:'F', nameEnv:'F', nameReturned:'F'}]),
        false);

    // Minimal usage.
    equal(f([]), false);
}
