import {
    gatherConfig,
    parseArgv,
    validateConfigDescriptors,
} from './index.js';

import { gatherConfigTest } from './gather-config.js';
import { parseArgvTest } from './parse-argv.js';
import { validateConfigDescriptorsTest }
    from './types/validate-config-descriptors.js';

gatherConfigTest(gatherConfig);
parseArgvTest(parseArgv);
validateConfigDescriptorsTest(validateConfigDescriptors);
