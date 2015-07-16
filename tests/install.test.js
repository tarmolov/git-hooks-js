require('chai').should();
var mkdirp = require('mkdirp');
var fsHelpers = require('../lib/fs-helpers');
var gitHooks = require('../lib/git-hooks');

var SANDBOX_PATH = __dirname + '/tmp-sandbox/';
var GIT_ROOT = SANDBOX_PATH + '.git/';
var GIT_HOOKS = GIT_ROOT + 'hooks';
var GIT_HOOKS_OLD = GIT_ROOT + 'hooks.old';

describe('--install', function () {
    beforeEach(function () {
        mkdirp.sync(GIT_ROOT);
    });

    afterEach(function () {
        fsHelpers.removeDir(SANDBOX_PATH);
    });

    it('should install hooks', function () {
        gitHooks.install(SANDBOX_PATH);
        fsHelpers.exists(GIT_HOOKS).should.be.true;
    });

    describe('when some hooks already exist', function () {
        beforeEach(function () {
            mkdirp.sync(GIT_ROOT);
        });

        it('should backup hooks before installation', function () {
            gitHooks.install(SANDBOX_PATH);
            fsHelpers.exists(GIT_HOOKS_OLD).should.be.true;
        });
    });

    describe('when git-hooks is already installed', function () {
        beforeEach(function () {
            mkdirp.sync(GIT_HOOKS_OLD);
        });

        it('should show error', function () {
            (function () {
                gitHooks.install(SANDBOX_PATH);
            }).should.throw(Error);
        });
    });
});
