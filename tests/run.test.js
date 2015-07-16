// require('chai').should();
// var vow = require('vow');
// // var vowFs = require('vow-fs');
// var gitHooks = require('../lib/git-hooks');

// var SANDBOX_PATH = __dirname + '/tmp-sandbox/';
// var GIT_ROOT = SANDBOX_PATH + '.git/';
// var GIT_HOOKS = GIT_ROOT + 'hooks';
// var PRECOMMIT_HOOK_PATH = GIT_HOOKS + '/pre-commit';
// var PROJECT_PRECOMMIT_HOOK = SANDBOX_PATH + '.githooks/pre-commit/';

// function createHook(path, content) {
//     return vowFs.write(path, '#!/bin/bash\n' + content).then(function () {
//         return vowFs.chmod(path, '0777');
//     });
// }

// describe('git-hook runner', function () {
//     beforeEach(function () {
//         return vowFs.makeDir(GIT_ROOT).then(function () {
//             return gitHooks.install(SANDBOX_PATH);
//         });
//     });

//     afterEach(function () {
//         return vowFs.removeDir(SANDBOX_PATH);
//     });

//     it('should works without hooks', function () {
//         return gitHooks.run(PRECOMMIT_HOOK_PATH);
//     });

//     describe('when a hooks are found', function () {
//         beforeEach(function () {
//             return vowFs.makeDir(PROJECT_PRECOMMIT_HOOK);
//         });

//         describe('more than one', function () {
//             var hooks = ['foo', 'bar', 'baz'];
//             beforeEach(function () {
//                 return vow.all(hooks.map(function (name) {
//                     var logFile = SANDBOX_PATH + name + '.log';
//                     return createHook(PROJECT_PRECOMMIT_HOOK + name, 'echo ' + name + '> ' + logFile);
//                 }));
//             });

//             it('should run it one by one', function () {
//                 return gitHooks.run(PRECOMMIT_HOOK_PATH).then(function () {
//                     return vow.all(hooks.map(function (name) {
//                         var logFile = SANDBOX_PATH + name + '.log';
//                         return vowFs.read(logFile).then(function (data) {
//                             data.toString().should.equal(name + '\n');
//                         });
//                     }));
//                 });
//             });
//         });

//         describe('and works without errors', function () {
//             var logFile = SANDBOX_PATH + 'hello.log';
//             beforeEach(function () {
//                 return createHook(PROJECT_PRECOMMIT_HOOK + 'hello', 'echo Hello, world! > ' + logFile);
//             });

//             it('should run a hook and resolve a promise', function () {
//                 return gitHooks.run(PRECOMMIT_HOOK_PATH).then(function () {
//                     return vowFs.read(logFile).then(function (data) {
//                         data.toString().should.equal('Hello, world!\n');
//                     });
//                 });
//             });
//         });

//         describe('and the hook finished with an error', function () {
//             beforeEach(function () {
//                 return createHook(PROJECT_PRECOMMIT_HOOK + 'hello', 'exit -1');
//             });

//             it('should run a hook and reject promise with an error', function (done) {
//                 gitHooks.run(PRECOMMIT_HOOK_PATH).fail(function (status) {
//                     status.should.equal(255);
//                     done();
//                 });
//             });
//         });
//     });
// });
