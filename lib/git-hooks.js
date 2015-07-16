'use strict';

var path = require('path');
var fs = require('fs');
var util = require('util');
var spawn = require('child_process').spawn;
var vow = require('vow');
var fsHelpers = require('./fs-helpers');

var HOOKS_DIRNAME = 'hooks';
var HOOKS_OLD_DIRNAME = 'hooks.old';
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
        var hooksPath = path.resolve(gitPath, HOOKS_DIRNAME);
        var hooksOldPath = path.resolve(gitPath, HOOKS_OLD_DIRNAME);

        if (fsHelpers.exists(hooksOldPath)) {
            throw new Error('git-hooks already installed');
        }

        if (fsHelpers.exists(hooksPath)) {
            fs.renameSync(hooksPath, hooksOldPath);
        }

        var hookTemplate = fs.readFileSync(path.join(__dirname, 'hook-template.js'));
        var pathToGitHooks = path.relative(hooksPath, __dirname);
        var hook = util.format(hookTemplate.toString(), pathToGitHooks);

        fs.mkdirSync(hooksPath);
        HOOKS.forEach(function (hookName) {
            var hookPath = path.resolve(hooksPath, hookName);
            return fs.writeFileSync(hookPath, hook, {mode: '0777'});
        });
    },

    /**
     * Uninstall git hooks.
     *
     * @param {String} [workingDirectory]
     */
    uninstall: function (workingDirectory) {
        var gitPath = getClosestGitPath(workingDirectory);
        var hooksPath = path.resolve(gitPath, HOOKS_DIRNAME);
        var hooksOldPath = path.resolve(gitPath, HOOKS_OLD_DIRNAME);

        if (!fsHelpers.exists(hooksPath)) {
            throw new Error('git-hooks is not installed');
        }

        fsHelpers.removeDir(hooksPath);

        if (fsHelpers.exists(hooksOldPath)) {
            fs.renameSync(hooksOldPath, hooksPath);
        }
    },

    /**
     * Runs a git hook.
     *
     * @param {String} filename Path to git hook.
     * @param {String} [arg] Git hook argument.
     * @returns {vow.Promise}
     */
    run: function (filename, arg) {
        var hookName = path.basename(filename);
        var hooksDirname = path.resolve(path.dirname(filename), '../../.githooks', hookName);

        if (!fsHelpers.exists(hooksDirname)) {
            return;
        }

        var hooks = fs.readdirSync(hooksDirname).map(function (hookName) {
            return path.resolve(hooksDirname, hookName);
        });

        return runHooks(hooks, [arg]);
    }
};

/**
 * Runs hooks.
 *
 * @param {String[]} hooks List of hook names to execute.
 * @param {String[]} args
 * @param {vow.Deferred} [defer]
 */
function runHooks(hooks, args, defer) {
    defer = defer || vow.defer();
    if (!hooks.length) {
        return defer.resolve(0);
    }

    var hook = spawn(hooks.shift(), args, {stdio: 'inherit'});
    hook.on('close', function (code) {
        if (code === 0) {
            runHooks(hooks, args, defer);
        } else {
            defer.reject(code);
        }
    });
    return defer.promise();
}

/**
 * Returns the closest git directory.
 * It starts looking from the current directory and does it up to the fs root.
 *
 * @param {String} [currentPath] Current started path to search.
 * @returns {String}
 */
function getClosestGitPath(currentPath) {
    currentPath = currentPath || __dirname;

    // reaches the fs root
    if (currentPath === '/') {
        throw new Error('git-hooks must be run inside a git repository');
    }

    var dirnamePath = path.join(currentPath, '.git');
    return fsHelpers.exists(dirnamePath) ?
        dirnamePath :
        getClosestGitPath(path.resolve(currentPath, '..'));
}
