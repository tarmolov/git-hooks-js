#!/usr/bin/env node

try {
    /**
     * require('git-hooks') isn't used to support case when node_modules is put in subdirectory.
     * .git
     * .githooks
     * www
     *     node_modules
     */
    require('%s/git-hooks').run(__filename, process.argv[2], function (code) {
        process.exit(code);
    });
} catch (e) {
    console.error('[GIT-HOOKS ERROR] ' + e.message);
}
