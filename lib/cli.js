var gitHooks = require('../lib/git-hooks');
var consts = require('./helpers').consts;

module.exports = function (program) {
    var command = program.install && 'install' || program.uninstall && 'uninstall';

    if (!gitHooks[command]) {
        return program.outputHelp();
    }

    var commandStatus = gitHooks[command]();
    if (commandStatus !== consts.STATUS.SUCCESS) {
        console.error('Command ' + command + ' failed.');
    }
};
