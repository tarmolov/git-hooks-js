require('chai').should();
var fs = require('fs');
var gitHooks = require('../lib/git-hooks');
var fsHelpers = require('../lib/fs-helpers');
var isWin32 = process.platform === 'win32';

var SANDBOX_PATH = __dirname + '/tmp-sandbox/';
var GIT_ROOT = SANDBOX_PATH + '.git/';
var GIT_HOOKS = GIT_ROOT + 'hooks';
var PRECOMMIT_HOOK_PATH = GIT_HOOKS + '/pre-commit';
var PROJECT_PRECOMMIT_HOOK = SANDBOX_PATH + '.githooks/pre-commit/';

function createHook(path, content) {
    fs.writeFileSync(path, '#!/bin/bash\n' + content);
    fs.chmodSync(path, '0777');
}

describe('git-hook runner', function () {
    beforeEach(function () {
        fsHelpers.makeDir(GIT_ROOT);
        gitHooks.install(SANDBOX_PATH);
    });

    afterEach(function () {
        fsHelpers.removeDir(SANDBOX_PATH);
    });

    it('should works without hooks', function (done) {
        gitHooks.run(PRECOMMIT_HOOK_PATH, null, function (code) {
            code.should.equal(0);
            done();
        });
    });

    describe('when hooks are found', function () {
        beforeEach(function () {
            fsHelpers.makeDir(PROJECT_PRECOMMIT_HOOK);
        });

        describe('and a hook is unexecutable', function () {
            beforeEach(function () {
                var logFile = SANDBOX_PATH + 'hello.log';
                var hook = (isWin32 ? '' : '#!/bin/bash\n') + 'echo hello > ' + logFile;
                fs.writeFileSync(PROJECT_PRECOMMIT_HOOK + 'hello', hook);
            });

            it('should return an error', function () {
                var fn = function () {
                    gitHooks.run(PRECOMMIT_HOOK_PATH);
                };
                fn.should.throw(Error);
            });
        });

        describe('more than one', function () {
            var hooks = ['foo', 'bar', 'baz'];
            beforeEach(function () {
                hooks.forEach(function (name) {
                    var logFile = SANDBOX_PATH + name + '.log';
                    if (isWin32) {
                        logFile = logFile.replace(/\\/g, '\\\\');
                    }
                    createHook(PROJECT_PRECOMMIT_HOOK + name, 'echo ' + name + '> ' + logFile);
                });
            });

            it('should run it one by one', function (done) {
                gitHooks.run(PRECOMMIT_HOOK_PATH, null, function (code) {
                    code.should.equal(0);
                    hooks.forEach(function (name) {
                        var logFile = SANDBOX_PATH + name + '.log';
                        fs.readFileSync(logFile).toString().should.equal(name + '\n');
                    });
                    done();
                });
            });
        });

        describe('and works without errors', function () {
            var logFile = SANDBOX_PATH + 'hello.log';
            if (isWin32) {
                logFile = logFile.replace(/\\/g, '\\\\');
            }
            beforeEach(function () {
                createHook(PROJECT_PRECOMMIT_HOOK + 'hello', 'echo Hello, world! > ' + logFile);
            });

            it('should run a hook with success status', function (done) {
                gitHooks.run(PRECOMMIT_HOOK_PATH, null, function (code) {
                    code.should.equal(0);
                    fs.readFileSync(logFile).toString().should.equal('Hello, world!\n');
                    done();
                });
            });
        });

        describe('and the hook finished with an error', function () {
            beforeEach(function () {
                createHook(PROJECT_PRECOMMIT_HOOK + 'hello', 'exit -1');
            });

            it('should run a hook and return error', function (done) {
                gitHooks.run(PRECOMMIT_HOOK_PATH, null, function (code) {
                    code.should.equal(255);
                    done();
                });
            });
        });
    });
});
