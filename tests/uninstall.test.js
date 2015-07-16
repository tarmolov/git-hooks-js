require('chai').should();
var gitHooks = require('../lib/git-hooks');
var fsHelpers = require('../lib/fs-helpers');

var SANDBOX_PATH = __dirname + '/tmp-sandbox/';
var GIT_ROOT = SANDBOX_PATH + '.git/';
var GIT_HOOKS = GIT_ROOT + 'hooks';
var GIT_HOOKS_OLD = GIT_ROOT + 'hooks.old';

describe('--uninstall', function () {
    beforeEach(function () {
        fsHelpers.makeDir(GIT_ROOT);
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

    describe('when git-hooks is installed', function () {
        beforeEach(function () {
            fsHelpers.makeDir(GIT_HOOKS);
        });

        it('should remove hooks directory', function () {
            gitHooks.uninstall(SANDBOX_PATH);
            fsHelpers.exists(GIT_HOOKS).should.be.false;
        });
    });

    describe('when backup exists', function () {
        beforeEach(function () {
            fsHelpers.makeDir(GIT_HOOKS);
            fsHelpers.makeDir(GIT_HOOKS_OLD);
        });

        it('should move it to hooks directory', function () {
            gitHooks.uninstall(SANDBOX_PATH);
            fsHelpers.exists(GIT_HOOKS).should.be.true;
        });
    });
});
