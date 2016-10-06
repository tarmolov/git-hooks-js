#!/usr/bin/env node

var Socket = require('net').Socket;
var input = '';

if (process.stdin.isTTY) {
    runHooks();
} else {
    if (process.stdin instanceof Socket) {
        process.stdin.setTimeout(300);
        process.stdin.on('timeout', runHooks);
    }

    process.stdin.setEncoding('utf8');
    process.stdin.on('readable', function () {
        var chunk;
        while ((chunk = this.read()) !== null) {
            input += chunk;
        }
    });
    process.stdin.on('end', runHooks);
}

function runHooks() {
    try {
        /**
         * require('git-hooks') isn't used to support case when node_modules is put in subdirectory.
         * .git
         * .githooks
         * www
         *     node_modules
         */
        require('%s/git-hooks').run(__filename, process.argv.slice(2), input, function (code, error) {
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
}
