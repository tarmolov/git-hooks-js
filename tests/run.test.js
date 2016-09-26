require('chai').should();
var fs = require('fs');
var exec = require('child_process').exec;
var gitHooks = require('../lib/git-hooks');
var fsHelpers = require('../lib/fs-helpers');

var SANDBOX_PATH = __dirname + '/tmp-sandbox/';
var GIT_ROOT = SANDBOX_PATH + '.git/';
var GIT_HOOKS = GIT_ROOT + 'hooks';
var PRECOMMIT_HOOK_PATH = GIT_HOOKS + '/pre-commit';
var PROJECT_PRECOMMIT_HOOK = SANDBOX_PATH + '.githooks/pre-commit/';
var GIT_IGNORE = SANDBOX_PATH + '.gitignore';

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
        gitHooks.run(PRECOMMIT_HOOK_PATH, [], '', function (code) {
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
                fs.writeFileSync(PROJECT_PRECOMMIT_HOOK + 'hello', '#!/bin/bash\n' + 'echo hello > ' + logFile);
            });

            it('should return an error', function (done) {
                gitHooks.run(PRECOMMIT_HOOK_PATH, [], '', function (code, error) {
                    code.should.equal(1);
                    error.should.be.ok;
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
                gitHooks.run(PRECOMMIT_HOOK_PATH, [], '', function (code) {
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
                createHook(
                    PROJECT_PRECOMMIT_HOOK + 'hello',
                    'input=`cat`; echo -e "Hello, world!\n${@:1}\n$input" > ' + logFile
                );
            });

            it('should pass all arguments to them', function (done) {
                gitHooks.run(PRECOMMIT_HOOK_PATH, ['I', 'am', 'working', 'properly!'], '', function () {
                    fs.readFileSync(logFile).toString().trim().should.equal('Hello, world!\nI am working properly!');
                    done();
                });
            });

            describe('if standard input is passed in', function () {
                it('should read it properly', function (done) {
                    exec('echo "I am working properly!" | ' + PRECOMMIT_HOOK_PATH, function () {
                        fs.readFileSync(logFile).toString().trim()
                            .should.equal('Hello, world!\n\nI am working properly!');
                        done();
                    });
                });

                it('should pass it to them', function (done) {
                    gitHooks.run(PRECOMMIT_HOOK_PATH, [], 'I am working properly!', function () {
                        fs.readFileSync(logFile).toString().trim()
                            .should.equal('Hello, world!\n\nI am working properly!');
                        done();
                    });
                });

            });

            it('should run a hook with success status', function (done) {
                gitHooks.run(PRECOMMIT_HOOK_PATH, [], '', function (code) {
                    code.should.equal(0);
                    fs.readFileSync(logFile).toString().trim().should.equal('Hello, world!');
                    done();
                });
            });
        });

        describe('and the hook finished with an error', function () {
            beforeEach(function () {
                createHook(PROJECT_PRECOMMIT_HOOK + 'hello', 'exit -1');
            });

            it('should run a hook and return error', function (done) {
                gitHooks.run(PRECOMMIT_HOOK_PATH, [], '', function (code) {
                    code.should.equal(255);
                    done();
                });
            });
        });

        describe('do not run git-ignored scripts from hooks directory', function () {
            var ignoreFilename = 'ignore-me';
            var ignoreContent = ignoreFilename + '\n*.swp';

            beforeEach(function () {
                fs.writeFileSync(GIT_IGNORE, ignoreContent);
                fs.writeFileSync(PROJECT_PRECOMMIT_HOOK + ignoreFilename, 'exit -1');
                fs.writeFileSync(PROJECT_PRECOMMIT_HOOK + 'test.swp', 'exit -1');
            });

            it('should ignore file with wrong permissions in hooks directory', function (done) {
                gitHooks.run(PRECOMMIT_HOOK_PATH, [], '', function (code) {
                    code.should.equal(0);
                    done();
                });
            });
        });
    });
});
