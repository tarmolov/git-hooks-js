require('chai').should();
var vowFs = require('vow-fs');
var gitHooks = require('../lib/git-hooks');

var config = require('../package.json').gitHooks;
var SANDBOX_PATH = __dirname + '/tmp-sandbox/';
var GIT_ROOT = SANDBOX_PATH + '.git/';

describe('--install', function () {
    beforeEach(function () {
        return vowFs.makeDir(GIT_ROOT);
    });

    afterEach(function () {
        return vowFs.removeDir(SANDBOX_PATH);
    });

    it('should install hooks', function () {
        return gitHooks.install(SANDBOX_PATH).then(function () {
            return vowFs.exists(GIT_ROOT + config.dirs.hooks).then(function (isExists) {
                isExists.should.be.true;
            });
        });
    });

    describe('when some hooks already exist', function () {
        beforeEach(function () {
            return vowFs.makeDir(GIT_ROOT + config.dirs.hooks);
        });

        it('should backup hooks before installation', function () {
            return gitHooks.install(SANDBOX_PATH).then(function () {
                return vowFs.exists(GIT_ROOT + config.dirs.hooksOld).then(function (isExists) {
                    isExists.should.be.true;
                });
            });
        });
    });

    describe('when git-hooks is already installed', function () {
        beforeEach(function () {
            return vowFs.makeDir(GIT_ROOT + config.dirs.hooksOld);
        });

        it('should show error', function (done) {
            gitHooks.install(SANDBOX_PATH).fail(function () {
                done();
            });
        });
    });
});
