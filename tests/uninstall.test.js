require('chai').should();
var exec = require('child_process').exec;
var gitHooks = require('../lib/git-hooks');
var fsHelpers = require('../lib/fs-helpers');

var SANDBOX_PATH = '/tmp/tmp-sandbox/';
var GIT_ROOT = SANDBOX_PATH + '.git/';
var GIT_HOOKS = GIT_ROOT + 'hooks';
var GIT_HOOKS_OLD = GIT_ROOT + 'hooks.old';

describe('--uninstall', function () {
    beforeEach(function (done) {
        fsHelpers.makeDir(SANDBOX_PATH);
        exec('git init', {cwd: SANDBOX_PATH}, function (err) {
            if (err) {
                throw err;
            }
            done();
        });
    });

    afterEach(function () {
        fsHelpers.removeDir(SANDBOX_PATH);
    });

    describe('when git-hooks is not installed', function () {
        it('should show an error', function () {
            var fn = function () {
                gitHooks.uninstall(SANDBOX_PATH);
            };
            fn.should.throw(Error);
        });
    });

    describe('when it is run not inside a git repo', function () {
        beforeEach(function () {
            fsHelpers.removeDir(GIT_ROOT);
        });

        it('should throw an error', function () {
            var fn = function () {
                gitHooks.install(SANDBOX_PATH);
            };
            fn.should.throw(Error);
        });
    });

    describe('when backup is absent', function () {

        it('should not remove hooks directory', function () {
            var fn = function () {
                gitHooks.uninstall(SANDBOX_PATH);
            };
            fn.should.throw(Error);
            fsHelpers.exists(GIT_HOOKS).should.be.true;
        });
    });

    describe('when backup exists', function () {
        beforeEach(function () {
            fsHelpers.makeDir(GIT_HOOKS_OLD);
        });

        it('should move it to hooks directory', function () {
            gitHooks.uninstall(SANDBOX_PATH);
            fsHelpers.exists(GIT_HOOKS).should.be.true;
        });
    });
});
