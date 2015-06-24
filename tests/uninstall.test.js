require('chai').should();
var vow = require('vow');
var vowFs = require('vow-fs');
var gitHooks = require('../lib/git-hooks');

var SANDBOX_PATH = __dirname + '/tmp-sandbox/';
var GIT_ROOT = SANDBOX_PATH + '.git/';
var GIT_HOOKS = GIT_ROOT + 'hooks';
var GIT_HOOKS_OLD = GIT_ROOT + 'hooks.old';

describe('--uninstall', function () {
    beforeEach(function () {
        return vowFs.makeDir(GIT_ROOT);
    });

    afterEach(function () {
        return vowFs.removeDir(SANDBOX_PATH);
    });

    describe('when git-hooks is not installed', function () {
        it('should show an error', function (done) {
            return gitHooks.uninstall(SANDBOX_PATH).fail(function () {
                done();
            });
        });
    });

    describe('when git-hooks is installed', function () {
        beforeEach(function () {
            return vowFs.makeDir(GIT_HOOKS);
        });

        it('should remove hooks directory', function () {
            return gitHooks.uninstall(SANDBOX_PATH).then(function () {
                return vowFs.exists(GIT_HOOKS).then(function (isExists) {
                    isExists.should.be.false;
                });
            });
        });
    });

    describe('when backup exists', function () {
        beforeEach(function () {
            return vow.all([
                vowFs.makeDir(GIT_HOOKS),
                vowFs.makeDir(GIT_HOOKS_OLD)
            ]);
        });

        it('should move it to hooks directory', function () {
            return gitHooks.uninstall(SANDBOX_PATH).then(function () {
                return vowFs.exists(GIT_HOOKS).then(function (isExists) {
                    isExists.should.be.true;
                });
            });
        });
    });
});
