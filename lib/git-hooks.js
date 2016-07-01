var path = require('path');
var util = require('util');
var spawn = require('child_process').spawn;
var fs = require('fs');
var fsHelpers = require('./fs-helpers');
var exec = require('child_process').exec;

var HOOKS_DIRNAME = 'hooks';
var HOOKS_DIRNAME_OLD = 'hooks.old';
var HOOKS_TEMPLATE_FILE_NAME = 'hook-template.sh';
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

/**
 * @param {String[]} hooks List of hook's paths with possible excludes(.gitignore files)
 * @param {function} callback Filtered hooks will be passed in the callback
 */
function excludeIgnoredPaths(hooks, callback) {
    exec('git check-ignore ' + hooks.join(' '), function (error, output) {
        // intentionally ignore errors
        callback(hooks.filter(function (hookName) {
            return output.indexOf(hookName) === -1;
        }));
    });
}

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
        var hooksPathOld = path.resolve(gitPath, HOOKS_DIRNAME_OLD);
        var hooksPathExists = fsHelpers.exists(hooksPath);
        var hooksPathOldExists = fsHelpers.exists(hooksPathOld);

        // TODO This is not particularly accurate.
        // What if something else uses the same `.old` suffix?
        if (hooksPathExists && hooksPathOldExists) {
            throw new Error('git-hooks already installed');
        }

        if (hooksPathExists) {
            if (hooksPathOldExists) {
                fsHelpers.removeDir(hooksPathOld);
            }
            fs.renameSync(hooksPath, hooksPathOld);
        }

        var hookTemplate = fs.readFileSync(__dirname + '/' + HOOKS_TEMPLATE_FILE_NAME);
        // use an absolute path
        var pathToGitHooks = path.resolve(__dirname);
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
        var hooksPathOld = path.resolve(gitPath, HOOKS_DIRNAME_OLD);

        if (!fsHelpers.exists(hooksPath)) {
            throw new Error('git-hooks is not installed');
        }

        fsHelpers.removeDir(hooksPath);

        if (fsHelpers.exists(hooksPathOld)) {
            fs.renameSync(hooksPathOld, hooksPath);
        }
    },

    /**
     * Runs a git hook.
     *
     * @param {String} filename Path to git hook.
     * @param {String} [arg] Git hook argument.
     * @param {Function} callback, defaults to exit with return code.
     */
    run: function (filename, arg, callback) {
        if (typeof callback !== 'function') {
            callback = function (code) { process.exit(code); };
        }
        var hookName = path.basename(filename);
        var hooksDirname = path.resolve(path.dirname(filename), '../../.githooks', hookName);

        if (fsHelpers.exists(hooksDirname)) {
            var list = fs.readdirSync(hooksDirname);
            var hooks = list.map(function (hookName) {
                return path.resolve(hooksDirname, hookName);
            });
            excludeIgnoredPaths(hooks, function (filteredHooks) {
                runHooks(filteredHooks, [arg], callback);
            });
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
 * @param {fs.Stats} stats
 * @returns {Boolean}
 */
function isExecutable(stats) {
    return (stats.mode & 1) ||
        (stats.mode & 8) && process.getgid && stats.gid === process.getgid() ||
        (stats.mode & 64) && process.getuid && stats.uid === process.getuid();
}

/**
 * Spawns hook as a separate process.
 *
 * @param {String} hookName
 * @param {String[]} args
 * @returns {ChildProcess}
 */
function spawnHook(hookName, args) {
    var stats = fs.statSync(hookName);
    var isHookExecutable = stats && stats.isFile() && isExecutable(stats);
    if (!isHookExecutable) {
        throw new Error('Cannot execute hook: ' + hookName + '. Please check file permissions.');
    }
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
    currentPath = currentPath || __dirname;

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
