import { aintaObject } from '@0bdx/ainta';
import { validateConfigDescriptors } from './types/index.js';

/**
 * ### Text content for `generateHelp()`.
 *
 * Each string is actually optional, so an empty object `{}` is perfectly valid.
 *
 * @typedef {object} GenerateHelpContent
 * @property {string} [headline]
 *    An optional title, for the top of the help-page, eg `"some_command help"`.
 * @property {string[]} [preamble]
 *    An optional section before `"Usage"`, where each string is a line.
 * @property {string[]} [text]
 *    An optional section after `"Usage"`, where each string is a line.
 */

/**
 * ### Generates the help-page for a command line app.
 *
 * @param {import('./types/default-config-descriptors').ConfigDescriptor[]} configDescriptors
 *    An array of objects which specify the expected values.
 * @param {GenerateHelpContent} [content={}]
 *    The optional configuration object.
 * @returns {string[]}
 *    An array of strings, where each string is a line.
 * @throws
 *    Throws an `Error` if either of the arguments are invalid.
 */
export default function generateHelp(configDescriptors, content={}) {
    const begin = 'generateHelp()';

    // If `configDescriptors` ainta valid array of `Descriptor` objects, throw
    // an exception explaining went wrong.
    const aDescriptors = validateConfigDescriptors(configDescriptors, begin);
    if (aDescriptors) throw Error(aDescriptors);

    // If `content` ainta valid `GenerateHelpContent`, throw an exception.
    const rx = /^[ -\[\]-~]*$/; // printable ASCII, except the backslash "\"
    const aContent = aintaObject(content, 'content', { begin, schema: {
        headline: { max:80, min:1, rx, types:['string','undefined'] },
        preamble: { max:80,        rx, types:[['string'],'undefined'] },
        text:     { max:80,        rx, types:[['string'],'undefined'] },
    }});
    if (aContent) throw Error(aContent);

    // Dereference the `content` argument, and initialise the output array.
    const { headline, preamble, text } = content;
    const out = [];

    // If `content.headline` was specified, add it, along with a line of "="s.
    // Note the empty string "", which adds an extra newline after the "="s.
    if (headline) out.push(headline, '='.repeat(headline.length), '');

    // If `content.preamble` was specified, add it.
    if (preamble) out.push(...preamble, '');

    // Generate the `usage` section. If all `configDescriptors` are `fallback`-only,
    // there will be nothing to display, and `usageSection` will be empty.
    const usage = generateUsageSection(configDescriptors);

    // If there is no `Usage`, `preamble` or `text` section, add the default
    // "No usage information available." line. Otherwise, add the "Usage"
    // subheading, followed by the `usage` section itself.
    if (usage.length === 0) {
        if (!preamble && !text) out.push('No usage information available.', '');
    } else {
        out.push('Usage', '-----', ...usage, '');
    }

    // If `content.text` was specified, add it.
    if (text) out.push(...text, '');

    return out;
}


/* ----------------------------- Private Methods ---------------------------- */

/**
 * ### Generates the `"Usage"` section for `generateHelp()`.
 *
 * @param {import('./types/default-config-descriptors').ConfigDescriptor[]} configDescriptors
 *    An array of objects which specify the expected values.
 * @returns {string[]}
 *    Returns the `"Usage"` section, where each string is a line.
 */
function generateUsageSection(configDescriptors) {
    return configDescriptors
        .flatMap(({
            fallback,     // optional string | number | boolean;
            kind,         //          "string" | "number" | "boolean";
            nameArgvLong, // optional string;
            nameArgvShort,// optional string;
            nameEnv,      // optional string;
            note,         // optional string;
        }) => {

            // If the descriptor is `fallback`-only, then it is effectively
            // private, so shouldn't be listed in the "usage" section.
            if (!nameArgvLong && !nameArgvShort && !nameEnv) return null;

            // Initialise the output array.
            const out = [''];

            // Generate the signature. Generally the `env` is the same as the
            // `argv`. There are two exceptions, commented below:
            const sigs = kind === 'number'
                ? [`<${kind}>`]
                : kind === 'string'
                    ? [`"<${kind}>"`]
                    : fallback === false
                        ? ['','true'] // don't show "true" after an `argv`
                        : fallback === true
                            ? ['false']
                            : ['<true|false>']; // mandatory, or fallback is another type

            // There must be at least one `argv` and/or `env` line to add.
            if (nameArgvShort) out.push(` -${nameArgvShort} ${sigs[0]}`);
            if (nameArgvLong) out.push(`--${nameArgvLong} ${sigs[0]}`);
            if (nameEnv) out.push(`  ${nameEnv}=${sigs[1]||sigs[0]}`);

            // Add a line if the value is optional, showing the `fallback`.
            const isOpt = typeof fallback !== 'undefined';
            if (isOpt) out.push(`    Defaults to ${JSON.stringify(fallback)}`);

            // Add a final line if the value is mandatory, or there is a `note`.
            if (!isOpt || note) out.push(
                '    ' + // indent
                (isOpt ? '' : 'MANDATORY  ') +
                (note || '') // show `note`, if provided
            );

            return out;
        })
        .filter(line => line !== null) // remove `fallback`-only configDescriptors
    ;
};

/* ---------------------------------- Tests --------------------------------- */

/**
 * ### `generateHelp()` unit tests.
 * 
 * @param {generateHelp} f
 *    The `generateHelp()` function to test.
 * @returns {void}
 *    Does not return anything.
 * @throws
 *    Throws an `Error` if a test fails.
 */
export function generateHelpTest(f) {
    const l2p = a => a.join('\n'); // lines to paragraph
    const e2l = e => (e.stack.split('\n')[2].match(/([^\/]+\.js:\d+):\d+\)?$/)||[])[1];
    const equal = (actual, expected) => { if (actual === expected) return;
        try { throw Error() } catch(err) { throw Error(`actual:\n${actual}\n` +
            `!== expected:\n${expected}\n...at ${e2l(err)}\n`) } };
    const throws = (actual, expected) => { try { actual() } catch (err) {
        if (err.message !== expected) { throw Error(`actual message:\n${err.message
            }\n!== expected message:\n${expected}\n...at ${e2l(err)}\n`)} return }
        throw Error(`expected message:\n${expected}\nbut nothing was thrown\n`) };


    /* ------------------------------ Arguments ----------------------------- */

    // The `configDescriptors` argument should be valid. There's no need to fully test
    // `configDescriptors` validation here - assume `validateConfigDescriptors()` works.
    throws(()=>f(null),
        "generateHelp(): `configDescriptors` is null not an array");
    throws(()=>f([{ kind:'number', nameReturned:'<-bad-name->' }]),
        "generateHelp(): `configDescriptors[0].nameReturned` '%3C-bad-name-%3E' fails /^[_a-z][_0-9a-z]*$/i");

    // The `content` argument should be valid.
    throws(()=>f([],null),
        "generateHelp(): `content` is null not a regular object");
    // @ts-expect-error
    throws(()=>f([],{ UNEXPECTED:'Oops!' }),
        "generateHelp(): `content.UNEXPECTED` is unexpected");

    // `content.headline` should be valid.
    // @ts-expect-error
    throws(()=>f([],{ headline:Symbol('Should be a regular string') }),
        "generateHelp(): `content.headline` is type 'symbol', not one of the `options.types` 'string:undefined'");
    throws(()=>f([],{ headline:'' }),
        "generateHelp(): `content.headline` '' is not min 1");
    throws(()=>f([],{ headline:'0123456789'.repeat(8)+'z' }),
        "generateHelp(): `content.headline` '012345678901234567890...3456789z' is not max 80");
    throws(()=>f([],{ headline:'ABC\\-_' }),
        "generateHelp(): `content.headline` 'ABC%5C-_' fails /^[ -\\[\\]-~]*$/");

    // `content.preamble` should be valid.
    // @ts-expect-error
    throws(()=>f([],{ preamble:['ok','also ok',()=>'wot?','This is fine'] }),
        "generateHelp(): `content.preamble[2]` is type 'function', not the `options.types` '[string]:undefined'");
    throws(()=>f([],{ preamble:['ok','empty lines are ok.','','but not over 80 chars','0123456789'.repeat(8) + 'z'] }),
        "generateHelp(): `content.preamble[4]` '012345678901234567890...3456789z' is not max 80");
    throws(()=>f([],{ preamble:['\\'] }),
        "generateHelp(): `content.preamble[0]` '%5C' fails /^[ -\\[\\]-~]*$/");

    // `content.text` should be valid.
    throws(()=>f([],{ text:['str',null] }),
        "generateHelp(): `content.text[1]` is null, not the `options.types` '[string]:undefined'");
    throws(()=>f([],{ text:['0123456789'.repeat(8) + 'x'] }),
        "generateHelp(): `content.text[0]` '012345678901234567890...3456789x' is not max 80");
    throws(()=>f([],{ text:['Ok.','','Café.'] }),
        "generateHelp(): `content.text[2]` 'Caf%C3%A9.' fails /^[ -\\[\\]-~]*$/");


    /* ------------------------- Without Descriptors ------------------------ */

    // Minimal usage.
    equal(l2p(f([])),
        'No usage information available.\n');

    // Just the `headline`. Note that the "No usage information available." message
    // appears, because no `preamble` or `text` was supplied. 
    equal(l2p(f([],{ headline:'A' })),
        'A\n=\n\nNo usage information available.\n');
    equal(l2p(f([],{ headline:'Short headline here' })),
        'Short headline here\n===================\n\nNo usage information available.\n');

    // Just the `preamble`.
    equal(l2p(f([],{ preamble:['A'] })),
        'A\n');
    equal(l2p(f([],{ preamble:['Short preamble here.','Two lines before the gap...','','...one after.'] })),
        'Short preamble here.\nTwo lines before the gap...\n\n...one after.\n');

    // Just the `text`.
    equal(l2p(f([],{ text:['A'] })),
        'A\n');
    equal(l2p(f([],{ text:['Short text here.',' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`'] })),
        'Short text here.\n !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`\n');

    // Just the `headline`, `preamble` and `text`.
    equal(l2p(f([],{ headline:'Headline', preamble:['Preamble.'], text:['Text.'] })), [
        'Headline',
        '========',
        '',
        'Preamble.',
        '',
        'Text.',
        '',
    ].join('\n'));


    /* -------------------------- With Descriptors -------------------------- */

    // Has `configDescriptors`, but they are all `fallback`-only.
    equal(l2p(f([
        { fallback:1, kind:'number', nameReturned:'one', note:'The number `1`.' },
        { fallback:true, kind:'boolean', nameReturned:'yes', note:'Positivity!' },
    ])), 'No usage information available.\n');

    // A minimal "Usage" section should be generated as expected.
    equal(l2p(f([
        { kind:'number', nameArgvShort:'n', nameReturned:'num', note:'A number.' },
    ])), [
        'Usage',
        '-----',
        '',
        ' -n <number>',
        '    MANDATORY  A number.',
        '',
    ].join('\n'));

    // A fairly typical "Usage" section should be generated as expected.
    equal(l2p(f([
        { fallback:1234567890, kind:'string', nameEnv:'STRING', nameReturned:'str', note:'A string.' },
        { fallback:'This \\s "fine".', kind:'number', nameArgvLong:'num', nameReturned:'num', note:'!' },
        { fallback:1, kind:'number', nameReturned:'one', note:'The number `1`.' }, // `fallback`-only, so ignored
        { kind:'boolean', nameArgvShort:'b', nameReturned:'bool', note:'1234567890'.repeat(7).slice(0,64) },
        { fallback:false, kind:'boolean', nameReturned:'all', note:'All three names are used by this value.',
            nameArgvShort:'a', nameArgvLong:'all-names--represented-1',
            nameEnv:'ALL_NAMES__REPRESENTED_1' },
    ],{ headline:'Fairly Typical Usage', preamble:['Preamble...','','...here.'], text:['Text...','','...here.'] })), [
        'Fairly Typical Usage',
        '====================',
        '',
        'Preamble...',
        '',
        '...here.',
        '',
        'Usage',
        '-----',
        '',
        '  STRING="<string>"',
        '    Defaults to 1234567890',
        '    A string.',
        '',
        '--num <number>',
        '    Defaults to "This \\\\s \\"fine\\"."', // @TODO figure out something better
        '    !',
        '',
        ' -b <true|false>',
        '    MANDATORY  1234567890123456789012345678901234567890123456789012345678901234',
        '',
        ' -a ',
        '--all-names--represented-1 ',
        '  ALL_NAMES__REPRESENTED_1=true',
        '    Defaults to false',
        '    All three names are used by this value.',        
        '',
        'Text...',
        '',
        '...here.',
        '',
    ].join('\n'));

}
