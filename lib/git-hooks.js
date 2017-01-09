var path = require('path');
var util = require('util');
var spawn = require('child_process').spawn;
var fs = require('fs');
var fsHelpers = require('./fs-helpers');
var exec = require('child_process').exec;

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

/**
 * @param {String[]} hooks List of hook's paths with possible excludes(.gitignore files)
 * @param {function} callback Filtered hooks will be passed in the callback
 */
function excludeIgnoredPaths(hooks, callback) {
    exec('git check-ignore ' + hooks.join(' '), function (error, output) {
        // intentionally ignore errors
        output = typeof output !== 'string' ? '' : output; // basic sanity check
        var ignoredHookPaths = output.split(/\r?\n/); // split string into array of each ignored file

        ignoredHookPaths = ignoredHookPaths.filter(function (ignoredHookPath) {
            // remove empty strings from the results
            return ignoredHookPath.length > 0;
        });
        var normalizePath = function (hookPath) {
            // normalize paths
            if (process.platform === 'win32') {
                // remove start and ending quotation marks on Windows,
                // which don't generally agree well with path.resolve
                hookPath = hookPath.replace(/^"/, '');
                hookPath = hookPath.replace(/"$/, '');
            }
            return path.resolve(hookPath);
        };
        var normalizedIgnoredHookPaths = ignoredHookPaths.map(normalizePath);
        callback(hooks.map(normalizePath).filter(function (normalizedHookPath) {
            return normalizedIgnoredHookPaths.indexOf(normalizedHookPath) === -1;
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
        var hooksOldPath = path.resolve(gitPath, HOOKS_OLD_DIRNAME);

        if (fsHelpers.exists(hooksOldPath)) {
            throw new Error('git-hooks already installed');
        }

        if (fsHelpers.exists(hooksPath)) {
            fs.renameSync(hooksPath, hooksOldPath);
        }

        var hookTemplate = fs.readFileSync(__dirname + '/' + HOOKS_TEMPLATE_FILE_NAME);
        var pathToGitHooks = path.relative(hooksPath, __dirname);
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
            var hooks = list.map(function (hookName) {
                return path.resolve(hooksDirname, hookName);
            });
            excludeIgnoredPaths(hooks, function (filteredHooks) {
                runHooks(filteredHooks, args, callback);
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
    return process.platform === 'win32' || // don't check for executable bit on windows, it doesn't exist
        (stats.mode & 1) ||
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
    args = args || [];
    var command;
    if (process.platform !== 'win32') {
        command = hookName;
    } else {
        /* We're on Windows.
           Windows can only run .cmd and .bat scripts (besides executables)
           so attempting to launch a script directly won't work.
           Thankfully, git is installed and comes with sh, so we can use that.
           sh isn't on the path for a default git install, so we need to determine
           where it might be installed
        */
        var x64ProgramFiles = 'C:\\Program Files';
        var x86ProgramFiles = 'C:\\Program Files (x86)';
        var shRelativeToProgramFiles = '\\Git\\usr\\bin\\sh.exe';

        try {
            fs.statSync(x64ProgramFiles + shRelativeToProgramFiles);
            command = x64ProgramFiles + shRelativeToProgramFiles;
        } catch (e) {}
        try {
            fs.statSync(x86ProgramFiles + shRelativeToProgramFiles);
            command = x86ProgramFiles + shRelativeToProgramFiles;
        } catch (e) {}

        // command should now be set to whichever git path exists, if any

        args.unshift(hookName); // add the script as the first argument
    }

    return spawn(command, args, {stdio: 'inherit'});
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
