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
    isFileOrValidSymlink: function (filepath) {
        var stats = fs.lstatSync(filepath);
        if(stats.isSymbolicLink()){
          var linkPath=fs.readlinkSync(filepath);
          linkPath = (path.isAbsolute(linkPath) ? linkPath : path.resolve( path.dirname(filepath),linkPath));
          stats = fs.lstatSync(linkPath);
        }
        return stats.isFile();
    },
    
    /**
     * @param {String} filepath
     * @returns {Boolean}
     */
    isExecutable: function (filepath) {
        var stats = fs.lstatSync(filepath);
        if(stats.isSymbolicLink()){
          var linkPath=fs.readlinkSync(filepath);
          linkPath = (path.isAbsolute(linkPath) ? linkPath : path.resolve( path.dirname(filepath),linkPath));
          stats = fs.lstatSync(linkPath);
        }
        return (stats.mode & 1) ||
            (stats.mode & 8) && process.getgid && stats.gid === process.getgid() ||
            (stats.mode & 64) && process.getuid && stats.uid === process.getuid();
    }
};

module.exports = helpers;

