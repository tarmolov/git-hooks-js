var path = require('path');
var util = require('util');
var spawn = require('child_process').spawn;
var fs = require('fs');
var fsHelpers = require('./fs-helpers');

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
     * @throws {Error}
     */
    install: function (workingDirectory) {
        var gitPath = getClosestGitPath(workingDirectory);

        if (!gitPath) {
            throw new Error('git-hooks must be run inside a git repository');
        }

        var hooksPath = path.resolve(gitPath, HOOKS_DIRNAME);
        var hooksOldPath = path.resolve(gitPath, HOOKS_OLD_DIRNAME);

        if (fsHelpers.exists(hooksOldPath)) {
            throw new Error('git-hooks already installed');
        }

        if (fsHelpers.exists(hooksPath)) {
            fs.renameSync(hooksPath, hooksOldPath);
        }

        var hookTemplate = fs.readFileSync(__dirname + '/' + HOOKS_TEMPLATE_FILE_NAME);
        var pathToGitHooks = __dirname;
        // Fix non-POSIX (Windows) separators
        pathToGitHooks = pathToGitHooks.replace(new RegExp(path.sep.replace(/\\/g, '\\$&'), 'g'), '/');
        var hook = util.format(hookTemplate.toString(), pathToGitHooks);

        fsHelpers.makeDir(hooksPath);
        HOOKS.forEach(function (hookName) {
            var hookPath = path.resolve(hooksPath, hookName);
            try {
                fs.writeFileSync(hookPath, hook, {mode: '0777'});
            } catch (e) {
                // node 0.8 fallback
                fs.writeFileSync(hookPath, hook, 'utf8');
                fs.chmodSync(hookPath, '0777');
            }
        });
    },

    /**
     * Uninstalls git hooks.
     *
     * @param {String} [workingDirectory]
     * @throws {Error}
     */
    uninstall: function (workingDirectory) {
        var gitPath = getClosestGitPath(workingDirectory);

        if (!gitPath) {
            throw new Error('git-hooks must be run inside a git repository');
        }

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
     * @param {String}   filename Path to git hook.
     * @param {String[]} [args]   Git hook arguments.
     * @param {Function} callback
     */
    run: function (filename, args, callback) {
        var hookName = path.basename(filename);
        var hooksDirname = path.resolve(path.dirname(filename), '../../.githooks', hookName);

        if (fsHelpers.exists(hooksDirname)) {
            var list = fs.readdirSync(hooksDirname);
            var hooks = list
                .map(function (hookName) {
                    return path.resolve(hooksDirname, hookName);
                })
                .filter(function (hookPath) {
                    var isFile = fs.lstatSync(hookPath).isFile();
                    var isExecutable = fs.lstatSync(hookPath).isFile() && fsHelpers.isExecutable(hookPath);

                    if (isFile && !isExecutable) {
                        console.warn('[GIT-HOOKS WARNING] Non-executable file ' + hookPath + ' is skipped');
                    }

                    return isFile && isExecutable;
                });

            runHooks(hooks, args, callback);
        } else {
            callback(0);
        }
    }
};

/**
 * Runs hooks.
 *
 * @param {String[]} hooks List of hook names to execute.
 * @param {String[]} args
 * @param {Function} callback
 */
function runHooks(hooks, args, callback) {
    if (!hooks.length) {
        callback(0);
        return;
    }

    try {
        var hook = spawnHook(hooks.shift(), args);
        hook.on('close', function (code) {
            if (code === 0) {
                runHooks(hooks, args, callback);
            } else {
                callback(code);
            }
        });
    } catch (e) {
        callback(1, e);
    }
}

/**
 * Spawns hook as a separate process.
 *
 * @param {String} hookName
 * @param {String[]} args
 * @returns {ChildProcess}
 */
function spawnHook(hookName, args) {
    args = args || [];
    return spawn(hookName, args, {stdio: 'inherit'});
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
    currentPath = currentPath || process.cwd();

    var dirnamePath = path.join(currentPath, '.git');

    if (fsHelpers.exists(dirnamePath)) {
        return dirnamePath;
    }

    var nextPath = path.resolve(currentPath, '..');

    if (nextPath === currentPath) {
        return;
    }

    return getClosestGitPath(nextPath);
}
