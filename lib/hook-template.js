#!/usr/bin/env node
var path = require('path');

try {
    var gitHooksPath = '%s' + path.sep + 'git-hooks';
    require(gitHooksPath).run(__filename, process.argv[2], function (code) {
        process.exit(code);
    });
} catch (e) {
    console.error('[GIT-HOOKS ERROR] ' + e.message);
}
