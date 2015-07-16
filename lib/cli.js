var vow = require('vow');
var gitHooks = require('../lib/git-hooks');

module.exports = function (program) {
    var command = program.install && 'install' || program.uninstall && 'uninstall';

    if (!gitHooks[command]) {
        return program.outputHelp();
    }

    var result = gitHooks[command]();
    if (vow.isPromise(result)) {
        result.fail(function (error) {
            console.error(error.message);
        });
    }
};
