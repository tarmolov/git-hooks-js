var fs = require('fs');
var path = require('path');

var helpers = {
    /**
     * Removes directory recursively.
     *
     * @param {String} dirPath
     */
    removeDir: function (dirPath) {
        fs.readdirSync(dirPath).forEach(function (file) {
            var fullPath = path.join(dirPath, file);
            var isFile = fs.statSync(fullPath).isFile();
            if (isFile) {
                fs.unlinkSync(fullPath);
            } else {
                helpers.removeDir(fullPath);
            }
        });

        fs.rmdirSync(dirPath);
    },

    /**
     * Makes directory recursively.
     *
     * @param {String} dirPath
     */
    makeDir: function (dirPath) {
        var dirName = path.dirname(dirPath);

        if (helpers.exists(dirName)) {
            fs.mkdirSync(dirPath);
        } else {
            fs.mkdirSync(dirName);
            helpers.makeDir(dirPath);
        }
    },

    /**
     * Checks existence.
     *
     * @param {String} path
     */
    exists: typeof fs.access === 'function' ?
        function (path) {
            try {
                fs.accessSync(path);
                return true;
            } catch (err) {
                return false;
            }
        } :
        function (path) {
            return fs.existsSync(path);
        },

    /**
     * @param {String} path
     * @returns {Boolean}
     */
    isExecutable: function (path) {
        var stats = fs.lstatSync(path);
        return (stats.mode & 1) ||
            (stats.mode & 8) && process.getgid && stats.gid === process.getgid() ||
            (stats.mode & 64) && process.getuid && stats.uid === process.getuid();
    }
};

module.exports = helpers;
