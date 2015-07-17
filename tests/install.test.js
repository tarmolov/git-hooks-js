require('chai').should();
var gitHooks = require('../lib/git-hooks');
var fsHelpers = require('../lib/fs-helpers');

var SANDBOX_PATH = __dirname + '/tmp-sandbox/';
var GIT_ROOT = SANDBOX_PATH + '.git/';
var GIT_HOOKS = GIT_ROOT + 'hooks';
var GIT_HOOKS_OLD = GIT_ROOT + 'hooks.old';

describe('--install', function () {
    beforeEach(function () {
        fsHelpers.makeDir(GIT_ROOT);
    });

    afterEach(function () {
        fsHelpers.removeDir(SANDBOX_PATH);
    });

    it('should install hooks', function () {
        gitHooks.install(SANDBOX_PATH);
        fsHelpers.exists(GIT_HOOKS).should.be.true;
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

    describe('when some hooks already exist', function () {
        beforeEach(function () {
            fsHelpers.makeDir(GIT_HOOKS);
        });

        it('should backup hooks before installation', function () {
            gitHooks.install(SANDBOX_PATH);
            fsHelpers.exists(GIT_HOOKS_OLD).should.be.true;
        });
    });

    describe('when git-hooks is already installed', function () {
        beforeEach(function () {
            fsHelpers.makeDir(GIT_HOOKS_OLD);
        });

        it('should show error', function () {
            var fn = function () {
                gitHooks.install(SANDBOX_PATH);
            };
            fn.should.throw(Error);
        });
    });
});
