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
        var pathToGitHooks = path.join(path.relative(hooksPath, __dirname), 'git-hooks');

        if (process.platform === 'win32') {
            pathToGitHooks = pathToGitHooks.replace(/\\/g, '\\\\');
        }

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
     * @param {String} filename Path to git hook.
     * @param {String} [arg] Git hook argument.
     * @param {Function} callback
     */
    run: function (filename, arg, callback) {
        var hookName = path.basename(filename);
        var hooksDirname = path.resolve(path.dirname(filename), '../../.githooks', hookName);

        if (fsHelpers.exists(hooksDirname)) {
            var list = fs.readdirSync(hooksDirname);
            var hooks = list.map(function (hookName) {
                return path.resolve(hooksDirname, hookName);
            });

            runHooks(hooks, [arg], callback);
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

    var hook = spawnHook(hooks.shift(), args);
    hook.on('close', function (code) {
        if (code === 0) {
            runHooks(hooks, args, callback);
        } else {
            callback(code);
        }
    });
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
    var isWin32 = process.platform === 'win32';
    var command = hookName;
    var opts = args;
    var hook;

    if (!(stats && stats.isFile())) {
        throw new Error('Hook %s is not a file.', hookName);
    }

    if (!isWin32 && !isExecutable(stats)) {
        throw new Error('Cannot execute hook: %s. Please check file permissions.', hookName);
    }

    if (isWin32) {
        hook = fs.readFileSync(hookName).toString();
        if (!require('shebang-regex').test(hook)) {
            throw new Error('Cannot find shebang in hook: %s.', hookName);
        }
        command = require('shebang-command')(require('shebang-regex').exec(hook)[0]);
        opts = [hookName].concat(opts);
    }

    return spawn(command, opts, {stdio: 'inherit'});
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
    // reaches the fs root
    if (currentPath === '/') {
        return;
    }
    var dirnamePath = path.join(currentPath, '.git');

    return fsHelpers.exists(dirnamePath) ?
        dirnamePath :
        getClosestGitPath(path.resolve(currentPath, '..'));
}
