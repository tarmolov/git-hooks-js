#!/usr/bin/env node

try {
    require('git-hooks').run(__filename, process.argv[2], function (code) {
        process.exit(code);
    });
} catch (e) {
    console.error('[GIT-HOOKS ERROR] ' + e.message);
}
