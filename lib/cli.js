var gitHooks = require('../lib/git-hooks');

module.exports = function (program) {
    var command = program.install && 'install' || program.uninstall && 'uninstall';

    if (!gitHooks[command]) {
        return program.outputHelp();
    }

    gitHooks[command]().fail(function (error) {
        console.error(error.message);
    });
};
