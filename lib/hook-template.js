#!/usr/bin/env node

try {
    var gitHooksStatus = require('%s/git-hooks').run(__filename, process.argv[2]);
    if (gitHooksStatus !== 0) {
        process.exit(-1);
    }
} catch (e) {
    console.error('Cannot find git-hooks. Did you install it?');
}
