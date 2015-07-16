var fs = require('fs');
var path = require('path');

var helpers = {
    /**
     * Remove directory.
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
     * Make directory.
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
     * Check exists.
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
        }
};

module.exports = helpers;
