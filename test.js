import {
    parseArgv,
    validateConfigDescriptors,
} from './cli-config-helpers.js';

import { parseArgvTest } from './src/parse-argv.js';
import { validateConfigDescriptorsTest }
    from './src/types/validate-config-descriptors.js';

parseArgvTest(parseArgv);
validateConfigDescriptorsTest(validateConfigDescriptors);
