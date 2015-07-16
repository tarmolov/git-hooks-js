var path = require('path');
var util = require('util');
var spawnSync = require('child_process').spawnSync;
var fs = require('fs');
var helpers = require('./helpers');
var consts = helpers.consts;

var HOOKS_DIRNAME = 'hooks';
var HOOKS_OLD_DIRNAME = 'hooks.old';
var HOOKS_TEMPLATE_FILE_NAME = 'hook-template.js';
var HOOKS = [
    'applypatch-msg',
    'commit-msg',
    'post-applypatch',
    'post-checkout',
    'post-commit',
    'post-merge',
    'post-receive',
    'pre-applypatch',
    'pre-auto-gc',
    'pre-commit',
    'pre-push',
    'pre-rebase',
    'pre-receive',
    'prepare-commit-msg',
    'update'
];

module.exports = {
    /**
     * Installs git hooks.
     *
     * @param {String} [workingDirectory]
     */
    install: function (workingDirectory) {
        var gitPath = getClosestGitPath(workingDirectory);
        var status = consts.STATUS.ERROR;

        if (gitPath) {
            var hooksPath = path.resolve(gitPath, HOOKS_DIRNAME);
            var hooksOldPath = path.resolve(gitPath, HOOKS_OLD_DIRNAME);

            if (helpers.exists(hooksOldPath)) {
                console.error('git-hooks already installed');
                return consts.STATUS.ERROR;
            }

            if (helpers.exists(hooksPath)) {
                fs.renameSync(hooksPath, hooksOldPath);
            }

            var hookTemplate = fs.readFileSync(__dirname + '/' + HOOKS_TEMPLATE_FILE_NAME);
            helpers.makeDir(hooksPath);

            var pathToGitHooks = path.relative(hooksPath, __dirname);
            var hook = util.format(hookTemplate.toString(), pathToGitHooks);

            HOOKS.forEach(function (hookName) {
                var hookPath = path.resolve(hooksPath, hookName);
                fs.writeFileSync(hookPath, hook, {mode: '0777'});
            });

            status = consts.STATUS.SUCCESS;
        }

        return status;
    },

    /**
     * Uninstall git hooks.
     *
     * @param {String} [workingDirectory]
     */
    uninstall: function (workingDirectory) {
        var gitPath = getClosestGitPath(workingDirectory);
        var status = consts.STATUS.ERROR;

        if (gitPath) {
            var hooksPath = path.resolve(gitPath, HOOKS_DIRNAME);
            var hooksOldPath = path.resolve(gitPath, HOOKS_OLD_DIRNAME);

            if (!helpers.exists(hooksPath)) {
                console.error('git-hooks is not installed');
                return consts.STATUS.ERROR;
            }

            helpers.removeDir(hooksPath);

            if (helpers.exists(hooksOldPath)) {
                fs.renameSync(hooksOldPath, hooksPath);
            }

            status = consts.STATUS.SUCCESS;
        }

        return status;
    },

    /**
     * Runs a git hook.
     *
     * @param {String} filename Path to git hook.
     * @param {String} [arg] Git hook argument.
     */
    run: function (filename, arg) {
        var hookName = path.basename(filename);
        var hooksDirname = path.resolve(path.dirname(filename), '../../.githooks', hookName);
        var status = consts.STATUS.ERROR;

        if (helpers.exists(hooksDirname)) {
            var list = fs.readdirSync(hooksDirname);
            var hooks = list.map(function (hookName) {
                return path.resolve(hooksDirname, hookName);
            });

            status = runHooks(hooks, [arg]);
        }

        return status;
    }
};

/**
 * Runs hooks.
 *
 * @param {String[]} hooks List of hook names to execute.
 * @param {String[]} args
 * @param {Number} Status code.
 */
function runHooks(hooks, args) {
    var status;

    if (!hooks.length) {
        return consts.STATUS.SUCCESS;
    }

    var hook = spawnSync(hooks.shift(), args, {stdio: 'inherit'});
    if (hook.status === 0) {
        return runHooks(hooks, args);
    } else {
        status = consts.STATUS.ERROR;
    }
    return status;
}

/**
 * Returns the closest git directory.
 * It starts looking from the current directory and does it up to the fs root.
 * It returns undefined in case where the specified directory isn't found.
 *
 * @param {String} [currentPath] Current started path to search.
 * @returns {String|undefined}
 */
function getClosestGitPath(currentPath) {
    currentPath = currentPath || __dirname;
    // reaches ths fs root
    if (currentPath === '/') {
        // git-hooks must be run inside a git repository;
        return false;
    }
    var dirnamePath = path.join(currentPath, '.git');

    return helpers.exists(dirnamePath) ?
        dirnamePath :
        getClosestGitPath(path.resolve(currentPath, '..'));
}
