require('chai').should();
var gitHooks = require('../lib/git-hooks');
var helpers = require('../lib/helpers');
var consts = helpers.consts;

var SANDBOX_PATH = __dirname + '/tmp-sandbox/';
var GIT_ROOT = SANDBOX_PATH + '.git/';
var GIT_HOOKS = GIT_ROOT + 'hooks';
var GIT_HOOKS_OLD = GIT_ROOT + 'hooks.old';

describe('--uninstall', function () {
    beforeEach(function () {
        helpers.makeDir(GIT_ROOT);
    });

    afterEach(function () {
        helpers.removeDir(SANDBOX_PATH);
    });

    describe('when git-hooks is not installed', function () {
        it('should show an error', function () {
            gitHooks.uninstall(SANDBOX_PATH).should.be.eq(consts.STATUS.ERROR);
        });
    });

    describe('when git-hooks is installed', function () {
        beforeEach(function () {
            helpers.makeDir(GIT_HOOKS);
        });

        it('should remove hooks directory', function () {
            gitHooks.uninstall(SANDBOX_PATH);
            helpers.exists(GIT_HOOKS).should.be.false;
        });
    });

    describe('when backup exists', function () {
        beforeEach(function () {
            helpers.makeDir(GIT_HOOKS);
            helpers.makeDir(GIT_HOOKS_OLD);
        });

        it('should move it to hooks directory', function () {
            gitHooks.uninstall(SANDBOX_PATH);
            helpers.exists(GIT_HOOKS).should.be.true;
        });
    });
});
