require('chai').should();
var gitHooks = require('../lib/git-hooks');
var helpers = require('../lib/helpers');
var consts = helpers.consts;

var SANDBOX_PATH = __dirname + '/tmp-sandbox/';
var GIT_ROOT = SANDBOX_PATH + '.git/';
var GIT_HOOKS = GIT_ROOT + 'hooks';
var GIT_HOOKS_OLD = GIT_ROOT + 'hooks.old';

describe('--install', function () {
    beforeEach(function () {
        helpers.makeDir(GIT_ROOT);
    });

    afterEach(function () {
        helpers.removeDir(SANDBOX_PATH);
    });

    it('should install hooks', function () {
        gitHooks.install(SANDBOX_PATH).should.be.eq(consts.STATUS.SUCCESS);
        helpers.exists(GIT_HOOKS).should.be.true;
    });

    describe('when some hooks already exist', function () {
        beforeEach(function () {
            helpers.makeDir(GIT_HOOKS);
        });

        it('should backup hooks before installation', function () {
            gitHooks.install(SANDBOX_PATH).should.be.eq(consts.STATUS.SUCCESS);
            helpers.exists(GIT_HOOKS_OLD).should.be.true;
        });
    });

    describe('when git-hooks is already installed', function () {
        beforeEach(function () {
            helpers.makeDir(GIT_HOOKS_OLD);
        });

        it('should show error', function () {
            gitHooks.install(SANDBOX_PATH).should.be.eq(consts.STATUS.ERROR);
        });
    });
});
