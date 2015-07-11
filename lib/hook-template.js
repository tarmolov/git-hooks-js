#!/usr/bin/env node

try {
    require('%s/git-hooks').run(__filename, process.argv[2]).fail(function (code) {
        process.exit(code || -1);
    });
} catch (e) {
    console.error('Cannot find git-hooks. Did you install it?');
}
