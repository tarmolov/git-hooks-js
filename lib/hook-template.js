#!/usr/bin/env node

try {
    /**
     * require('git-hooks') isn't used to support case when node_modules is put in subdirectory.
     * .git
     * .githooks
     * www
     *     node_modules
     */
    require('%s/git-hooks').run(__filename, process.argv.slice(2), function (code, error) {
        if (error) {
            console.error('[GIT-HOOKS ERROR] ' + error.message);
        }
        process.exit(code);
    });
} catch (e) {
    console.error('[GIT-HOOKS ERROR] ' + e.message);

    if (e.code === 'MODULE_NOT_FOUND') {
        console.error('[GIT-HOOKS ERROR] Please reinstall git-hooks to fix this error');
    }
}
