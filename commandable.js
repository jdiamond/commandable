var minimist = require('minimist');
var Promise = require('bluebird');

module.exports = run;

function run(args, opts, callback) {
    if (!Array.isArray(args)) {
        callback = opts;
        opts = args;
        args = null;
    }

    return new Promise(function(resolve, reject) {
        args = args || process.argv.slice(2);
        opts = opts || {};

        opts.stopEarly = true;

        var cmd = minimist(args, opts);

        cmd.$ = opts.$;

        if (opts.commands && cmd._.length && cmd._[0] in opts.commands) {
            var sub = opts.commands[cmd._[0]];

            if (typeof sub === 'function') {
                var fn = sub;
                sub = {};
                sub[fn.length === 2 ? 'callback' : 'run'] = fn;
            }

            sub.$ = cmd;

            resolve(run(cmd._.slice(1), sub));
        } else if (opts.callback) {
            opts.callback(cmd, function(err, result) {
                if (err) reject(err);
                else     resolve(result);
            });
        } else if (opts.run) {
            resolve(opts.run(cmd));
        } else {
            resolve(cmd);
        }
    }).nodeify(callback);
}
