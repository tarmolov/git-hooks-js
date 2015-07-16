var gitHooks = require('../lib/git-hooks');
var options = {
    help: 'Output usage information',
    version: 'Output the version number',
    install: 'Replace existing hooks in this repository with a call git-hooks. Move old hooks directory to hooks.old',
    uninstall: 'Remove existing hooks in this repository and rename hooks.old back to hooks'
};

module.exports = function (command) {
    command = command && command.replace(/-/g, '');

    switch (command) {
        case 'version':
            console.log(require('../package.json').version);
            break;
        case 'install':
        case 'uninstall':
            try {
                gitHooks[command]();
            } catch (e) {
                console.error(e.message);
            }
            break;
        default:
            outputHelp();
    }
};

/**
 * Outputs the help to console.
 */
function outputHelp() {
    console.log(
        '\nUsage: git-hooks [options]\n\n' +
        'A tool to manage project Git hooks\n\n' +
        'Options:\n\n' +
        Object.keys(options)
            .map(function (key) {
                return '  --' + key + '\t' + options[key] + '\n';
            })
            .join('')
    );
}
