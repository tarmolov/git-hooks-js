require('chai').should();
var fs = require('fs');
var gitHooks = require('../lib/git-hooks');
var fsHelpers = require('../lib/fs-helpers');

var SANDBOX_PATH = __dirname + '/tmp-sandbox/';
var GIT_ROOT = SANDBOX_PATH + '.git/';
var GIT_HOOKS = GIT_ROOT + 'hooks';
var PRECOMMIT_HOOK_PATH = GIT_HOOKS + '/pre-commit';
var PROJECT_PRECOMMIT_HOOK = SANDBOX_PATH + '.githooks/pre-commit/';
var POSTCOMMIT_HOOK_PATH = GIT_HOOKS + '/post-commit';
var PROJECT_POSTCOMMIT_HOOK = SANDBOX_PATH + '.githooks/post-commit/';

function createHook(path, content) {
    fs.writeFileSync(path, '#!/bin/bash\n' + content);
    fs.chmodSync(path, '0777');
}

function createSymlinkHook(target, path) {
    fs.symlinkSync(target, path);
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
        gitHooks.run(PRECOMMIT_HOOK_PATH, [], function (code) {
            code.should.equal(0);
            done();
        });
    });

    describe('when hooks are found', function () {
        beforeEach(function () {
            fsHelpers.makeDir(PROJECT_PRECOMMIT_HOOK);
            fsHelpers.makeDir(PROJECT_POSTCOMMIT_HOOK);
        });

        describe('and a hook is unexecutable', function () {
            var oldConsoleWarn = console.warn;
            var consoleLogOutput = '';
            var logFile = SANDBOX_PATH + 'hello.log';
            beforeEach(function () {
                var hookPath = PROJECT_PRECOMMIT_HOOK + 'hello';
                fs.writeFileSync(hookPath, '#!/bin/bash\n' + 'echo hello > ' + logFile);
                console.warn = function (str) {
                    consoleLogOutput += str;
                };
            });

            afterEach(function () {
                console.warn = oldConsoleWarn;
            });

            it('should skip it', function (done) {
                gitHooks.run(PRECOMMIT_HOOK_PATH, [], function (code) {
                    code.should.equal(0);
                    consoleLogOutput.should.match(/^\[GIT-HOOKS WARNING\]/);
                    fs.existsSync(logFile).should.be.false;
                    done();
                });
            });
        });

        describe('and directory in hooks directory is found', function () {
            beforeEach(function () {
                fsHelpers.makeDir(PROJECT_PRECOMMIT_HOOK + '/zzzz');
            });

            it('should skip it', function (done) {
                gitHooks.run(PRECOMMIT_HOOK_PATH, [], function (code) {
                    code.should.equal(0);
                    done();
                });
            });
        });

        describe('more than one', function () {
            var hooks = ['foo', 'bar', 'baz'];
            beforeEach(function () {
                hooks.forEach(function (name) {
                    var logFile = SANDBOX_PATH + name + '.log';
                    createHook(PROJECT_PRECOMMIT_HOOK + name, 'echo ' + name + '> ' + logFile);
                });
            });

            it('should run it one by one', function (done) {
                gitHooks.run(PRECOMMIT_HOOK_PATH, [], function (code) {
                    code.should.equal(0);
                    hooks.forEach(function (name) {
                        var logFile = SANDBOX_PATH + name + '.log';
                        fs.readFileSync(logFile).toString().should.equal(name + '\n');
                    });
                    done();
                });
            });
        });

        describe('and work without errors', function () {
            var logFile = SANDBOX_PATH + 'hello.log';
            beforeEach(function () {
                createHook(PROJECT_PRECOMMIT_HOOK + 'hello', 'echo "Hello, world! ${@:1}" > ' + logFile);
            });

            it('should pass all arguments to them', function (done) {
                gitHooks.run(PRECOMMIT_HOOK_PATH, ['I', 'am', 'working', 'properly!'], function () {
                    fs.readFileSync(logFile).toString().should.equal('Hello, world! I am working properly!\n');
                    done();
                });
            });

            it('should run a hook with success status', function (done) {
                gitHooks.run(PRECOMMIT_HOOK_PATH, [], function (code) {
                    code.should.equal(0);
                    fs.readFileSync(logFile).toString().should.equal('Hello, world! \n');
                    done();
                });
            });
        });

        describe('and work with symbolic links without errors', function () {
            var logFile = SANDBOX_PATH + 'hello.log';
            beforeEach(function () {
                createHook(PROJECT_PRECOMMIT_HOOK + 'hello', 'echo "Hello, world! ${@:1}" > ' + logFile);
                createSymlinkHook(PROJECT_PRECOMMIT_HOOK + 'hello', PROJECT_POSTCOMMIT_HOOK + 'hello');
            });

            it('should pass all arguments to them', function (done) {
                gitHooks.run(POSTCOMMIT_HOOK_PATH, ['I', 'am', 'working', 'properly!'], function () {
                    fs.readFileSync(logFile).toString().should.equal('Hello, world! I am working properly!\n');
                    done();
                });
            });

            it('should run a hook with success status', function (done) {
                gitHooks.run(POSTCOMMIT_HOOK_PATH, [], function (code) {
                    code.should.equal(0);
                    fs.readFileSync(logFile).toString().should.equal('Hello, world! \n');
                    done();
                });
            });
        });

        describe('and a symlinked hook is unexecutable', function () {
            var oldConsoleWarn = console.warn;
            var consoleLogOutput = '';
            var logFile = SANDBOX_PATH + 'hello.log';
            beforeEach(function () {
                var hookPath = PROJECT_PRECOMMIT_HOOK + 'hello';
                fs.writeFileSync(hookPath, '#!/bin/bash\n' + 'echo hello > ' + logFile);
                console.warn = function (str) {
                    consoleLogOutput += str;
                };
                createSymlinkHook(PROJECT_PRECOMMIT_HOOK + 'hello', PROJECT_POSTCOMMIT_HOOK + 'hello');
            });

            afterEach(function () {
                console.warn = oldConsoleWarn;
            });

            it('should skip it', function (done) {
                gitHooks.run(POSTCOMMIT_HOOK_PATH, [], function (code) {
                    code.should.equal(0);
                    consoleLogOutput.should.match(/^\[GIT-HOOKS WARNING\]/);
                    fs.existsSync(logFile).should.be.false;
                    done();
                });
            });
        });

        describe('and the hook finished with an error', function () {
            beforeEach(function () {
                createHook(PROJECT_POSTCOMMIT_HOOK + 'hello', 'exit -1');
            });

            it('should run a hook and return error', function (done) {
                gitHooks.run(POSTCOMMIT_HOOK_PATH, [], function (code) {
                    code.should.equal(255);
                    done();
                });
            });
        });
    });
});
