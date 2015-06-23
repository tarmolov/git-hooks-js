var util = require('util');
var path = require('path');
var spawn = require('child_process').spawn;
var vow = require('vow');
var vowFs = require('vow-fs');
var config = require('../package.json').gitHooks;

module.exports = {
    /**
     * Installs git hooks.
     */
    install: function (currentPath) {
        return getClosestPath(config.dirs.root, currentPath).then(function (gitPath) {
            var hooksPath = path.resolve(gitPath, config.dirs.hooks);
            var hooksOldPath = path.resolve(gitPath, config.dirs.hooksOld);

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
                    return vowFs.makeDir(hooksPath);
                })
                .then(function () {
                    return vow.all(
                        config.hooks.map(function (hookName) {
                            var hookPath = path.resolve(hooksPath, hookName);
                            return vowFs.write(hookPath, config.template.join('\n'), {mode: '0777'});
                        })
                    );
                });
        });
    },

    /**
     * Uninstall git hooks.
     */
    uninstall: function (currentPath) {
        return getClosestPath(config.dirs.root, currentPath).then(function (gitPath) {
            var hooksPath = path.resolve(gitPath, config.dirs.hooks);
            var hooksOldPath = path.resolve(gitPath, config.dirs.hooksOld);

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
 * Returns the closest directory.
 * It starts looking from the current directory and does it up to the fs root.
 * It returns undefined in case where the specified directory isn't found.
 *
 * @param {String} dirname Directory name to look for.
 * @param {String} [currentPath] Current started path to search.
 * @returns {String|undefined}
 */
function getClosestPath(dirname, currentPath) {
    currentPath = currentPath || __dirname;

    // reaches ths fs root
    if (currentPath === '/') {
        return vow.reject(new Error(util.format('Directory %s is not found', dirname)));
    }

    var dirnamePath = path.join(currentPath, dirname);
    return vowFs.exists(dirnamePath).then(function (isExists) {
        return isExists ?
            dirnamePath :
            getClosestPath(dirname, path.resolve(currentPath, '..'));
    });
}
