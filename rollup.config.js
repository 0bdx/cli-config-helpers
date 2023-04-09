import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import * as bh from '@0bdx/build-helpers';

export default {
    ...bh.rollupConfigBasicLib(
        'cli-config-helpers.js',
        bh.generateBanner(
            new Date(),
            readFileSync('./package.json', 'utf-8'),
            bh.getFirstCommitYear(execSync),
            true,
        ),
    ),
    external: [
        '@0bdx/ainta',
    ],
    plugins: [ fixJSDoc() ],
}

// Fixes typings issues.
//
// @TODO add fixes, as they are needed.
//
function fixJSDoc() {
    return {
        name: 'fix-js-doc',
        transform(source, id) {
            if (id.slice(-3) !== '.js') return null; // only transform JavaScript
            return source;
        }
    }
}
