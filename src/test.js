import {
    parseArgv,
    validateConfigDescriptors,
} from './index.js';

import { parseArgvTest } from './parse-argv.js';
import { validateConfigDescriptorsTest }
    from './types/validate-config-descriptors.js';

parseArgvTest(parseArgv);
validateConfigDescriptorsTest(validateConfigDescriptors);
