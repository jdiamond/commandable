'use strict';

var run = require('./run');

module.exports = main;

function main(argv, cfg, callback) {
    if (!Array.isArray(argv)) {
        callback = cfg;
        cfg = argv;
        argv = null;
    }

    argv = argv || process.argv.slice(2);
    cfg = cfg || {};

    return run(argv, cfg).nodeify(callback);
}
