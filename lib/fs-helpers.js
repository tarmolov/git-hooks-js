var fs = require('fs');
var path = require('path');

var helpers = {
    /**
     * Removes directory recursively.
     *
     * @param {String} dirPath
     */
    removeDir: function (dirPath) {
        if (fs.existsSync(dirPath)) {
            fs.readdirSync(dirPath).forEach(function (file) {
                var fullPath = path.join(dirPath, file);
                if (fs.lstatSync(fullPath).isDirectory()) {
                    helpers.removeDir(fullPath);
                } else {
                    fs.unlinkSync(fullPath);
                }
            });

            fs.rmdirSync(dirPath);
        }
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
     * Makes directory recursively.
     *
     * @param {String} dirPath
     */
    isAbsolutePathUnix: function (dirPath) {
        return /^\//.test(dirPath);
    },

    /**
     * Checks existence.
     *
     * @param {String} filepath
     */
    exists: typeof fs.access === 'function' ?
        function (filepath) {
            try {
                fs.accessSync(filepath);
                return true;
            } catch (err) {
                return false;
            }
        } :
        function (filepath) {
            return fs.existsSync(filepath);
        },

    /**
     * @param {String} filepath
     * @returns {Boolean}
     */
    getFileStat: function (filepath) {
        var stats = fs.lstatSync(filepath);

        if (stats.isSymbolicLink()){
            var linkPath = fs.readlinkSync(filepath);
            linkPath = ((path.isAbsolute || helpers.isAbsolutePathUnix)(linkPath) ?
                linkPath :
                path.resolve(path.dirname(filepath), linkPath)
            );
            return this.getFileStat(linkPath);
        }
        return stats;
    },

    /**
     * @param {String} filepath
     * @returns {Boolean}
     */
    isFileOrValidSymlink: function (filepath) {
        try {
            var stats = this.getFileStat(filepath);
            return stats.isFile();
        } catch (e) {
            return false;
        }
    },

    /**
     * @param {String} filepath
     * @returns {Boolean}
     */
    isExecutable: function (filepath) {
        var stats = this.getFileStat(filepath);
        return (stats.mode & 1) ||
            (stats.mode & 8) && process.getgid && stats.gid === process.getgid() ||
            (stats.mode & 64) && process.getuid && stats.uid === process.getuid();
    }
};

module.exports = helpers;

