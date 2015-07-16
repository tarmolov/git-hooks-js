var fs = require('fs');
var path = require('path');

var fsHelpers = {
    /**
     * Remove all files in the given path recursively.
     *
     * @param {String} dirPath
     */
    removeDir: function (dirPath) {
        fs.readdirSync(dirPath).forEach(function (file) {
            var fullPath = path.join(dirPath, file);
            if (isFile(fullPath)) {
                fs.unlinkSync(fullPath);
            } else {
                fsHelpers.removeDir(fullPath);
            }
        });

        fs.rmdirSync(dirPath);
    },

    /**
     * Test whether or not the given path exists by checking with the file system.
     * Workaround for deprecated fs.existsSync().
     *
     * @param {String} path
     * @returns {Boolean}
     */
    exists: typeof fs.access === 'function' ?
        function (path) {
            try {
                fs.accessSync(path);
                return true;
            } catch (error) {
                return false;
            }
        } :
        function (path) {
            return fs.existsSync(path);
        }
};

module.exports = fsHelpers;

/**
 * @param {String} path
 * @returns {Boolean}
 */
function isFile(path) {
    var stats = fs.statSync(path);
    return stats.isFile();
}
