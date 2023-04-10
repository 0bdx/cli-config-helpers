import {
    gatherConfig,
    generateHelp,
    parseArgv,
    validateConfigDescriptors,
} from './cli-config-helpers.js';

import { gatherConfigTest } from './src/gather-config.js';
import { generateHelpTest } from './src/generate-help.js';
import { parseArgvTest } from './src/parse-argv.js';
import { validateConfigDescriptorsTest }
    from './src/types/validate-config-descriptors.js';

gatherConfigTest(gatherConfig);
generateHelpTest(generateHelp);
parseArgvTest(parseArgv);
validateConfigDescriptorsTest(validateConfigDescriptors);
