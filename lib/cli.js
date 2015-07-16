var gitHooks = require('../lib/git-hooks');

module.exports = function (program) {
    var command = program.install && 'install' || program.uninstall && 'uninstall';

    if (!gitHooks[command]) {
        return program.outputHelp();
    }

    try {
        gitHooks[command]();
    } catch (e) {
        console.error(e.message);
    }
};
