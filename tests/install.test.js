require('chai').should();
var vowFs = require('vow-fs');
var gitHooks = require('../lib/git-hooks');

var SANDBOX_PATH = __dirname + '/tmp-sandbox/';
var GIT_ROOT = SANDBOX_PATH + '.git/';
var GIT_HOOKS = GIT_ROOT + 'hooks';
var GIT_HOOKS_OLD = GIT_ROOT + 'hooks.old';

describe('--install', function () {
    beforeEach(function () {
        return vowFs.makeDir(GIT_ROOT);
    });

    afterEach(function () {
        return vowFs.removeDir(SANDBOX_PATH);
    });

    it('should install hooks', function () {
        return gitHooks.install(SANDBOX_PATH).then(function () {
            return vowFs.exists(GIT_HOOKS).then(function (isExists) {
                isExists.should.be.true;
            });
        });
    });

    describe('when some hooks already exist', function () {
        beforeEach(function () {
            return vowFs.makeDir(GIT_HOOKS);
        });

        it('should backup hooks before installation', function () {
            return gitHooks.install(SANDBOX_PATH).then(function () {
                return vowFs.exists(GIT_HOOKS_OLD).then(function (isExists) {
                    isExists.should.be.true;
                });
            });
        });
    });

    describe('when git-hooks is already installed', function () {
        beforeEach(function () {
            return vowFs.makeDir(GIT_HOOKS_OLD);
        });

        it('should show error', function (done) {
            gitHooks.install(SANDBOX_PATH).fail(function () {
                done();
            });
        });
    });
});
