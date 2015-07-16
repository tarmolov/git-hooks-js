#!/usr/bin/env node

try {
    var code = require('%s/git-hooks').run(__filename, process.argv[2]);
    process.exit(code);
} catch (e) {
    console.error('Cannot find git-hooks. Did you install it?');
}
