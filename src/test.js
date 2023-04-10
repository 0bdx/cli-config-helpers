import {
    gatherConfig,
    generateHelp,
    parseArgv,
    validateConfigDescriptors,
} from './index.js';

import { gatherConfigTest } from './gather-config.js';
import { generateHelpTest } from './generate-help.js';
import { parseArgvTest } from './parse-argv.js';
import { validateConfigDescriptorsTest }
    from './types/validate-config-descriptors.js';

gatherConfigTest(gatherConfig);
generateHelpTest(generateHelp);
parseArgvTest(parseArgv);
validateConfigDescriptorsTest(validateConfigDescriptors);
