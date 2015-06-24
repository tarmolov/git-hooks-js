var path = require('path');
var spawn = require('child_process').spawn;
var vow = require('vow');
var vowFs = require('vow-fs');

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
        return getClosestGitPath(workingDirectory).then(function (gitPath) {
            var hooksPath = path.resolve(gitPath, HOOKS_DIRNAME);
            var hooksOldPath = path.resolve(gitPath, HOOKS_OLD_DIRNAME);

            return vow.all([
                vowFs.exists(hooksPath),
                vowFs.exists(hooksOldPath)
            ])
                .spread(function (isHooksExist, isHooksOldExist) {
                    if (isHooksOldExist) {
                        throw new Error('git-hooks already installed');
                    }

                    if (isHooksExist) {
                        return vowFs.move(hooksPath, hooksOldPath);
                    }
                })
                .then(function () {
                    return vow.all([
                        vowFs.read(__dirname + '/hook-template.js'),
                        vowFs.makeDir(hooksPath)
                    ]);
                })
                .spread(function (hookTemplate) {
                    return vow.all(
                        HOOKS.map(function (hookName) {
                            var hookPath = path.resolve(hooksPath, hookName);
                            return vowFs.write(hookPath, hookTemplate, {mode: '0777'});
                        })
                    );
                });
        });
    },

    /**
     * Uninstall git hooks.
     *
     * @param {String} [workingDirectory]
     */
    uninstall: function (workingDirectory) {
        return getClosestGitPath(workingDirectory).then(function (gitPath) {
            var hooksPath = path.resolve(gitPath, HOOKS_DIRNAME);
            var hooksOldPath = path.resolve(gitPath, HOOKS_OLD_DIRNAME);

            return vow.all([
                vowFs.exists(hooksPath),
                vowFs.exists(hooksOldPath)
            ])
                .spread(function (isHooksExist, isHooksOldExist) {
                    if (!isHooksExist) {
                        throw new Error('git-hooks is not installed');
                    }

                    return vowFs.removeDir(hooksPath).then(function () {
                        if (isHooksOldExist) {
                            return vowFs.move(hooksOldPath, hooksPath);
                        }
                    });
                });
        });
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

        return vowFs.exists(hooksDirname).then(function (isExists) {
            if (isExists) {
                return vowFs.listDir(hooksDirname).then(function (list) {
                    var hooks = list.map(function (hookName) {
                        return path.resolve(hooksDirname, hookName);
                    });
                    return runHooks(hooks, [arg]);
                });
            }
        });
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
 * It returns undefined in case where the specified directory isn't found.
 *
 * @param {String} [currentPath] Current started path to search.
 * @returns {String|undefined}
 */
function getClosestGitPath(currentPath) {
    currentPath = currentPath || __dirname;

    // reaches ths fs root
    if (currentPath === '/') {
        return vow.reject(new Error('git-hooks must be run inside a git repository'));
    }

    var dirnamePath = path.join(currentPath, '.git');
    return vowFs.exists(dirnamePath).then(function (isExists) {
        return isExists ?
            dirnamePath :
            getClosestGitPath(path.resolve(currentPath, '..'));
    });
}
