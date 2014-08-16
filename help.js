var path = require('path');
var columnify = require('columnify');
var _ = require('lodash');

module.exports = help;

function help(opts) {
    if (!opts || !opts.$cfg) { return; }

    var options = getOptions(opts.$cfg);
    var commands = getCommands(opts.$cfg);
    var usage = getUsage(opts.$cfg, options, commands);

    outputUsage(usage);
    outputOptions(options);
    outputCommands(commands);
}

function getUsage(cfg, options, commands) {
    var usage = '';

    if (cfg.$parent) {
        (function sup(cfg) {
            if (cfg) {
                usage = ' ' + cfg._[0] + usage;
                sup(cfg.$parent);
            }
        })(cfg.$parent);
    }

    if (options.length) {
        usage += ' [<options>]';
    }

    if (commands.length) {
        usage += cfg.run ? ' [<command>]' : ' <command>';
    }

    if (cfg.usage) {
        usage += ' ' + cfg.usage;
    }

    return usage.trim();
}

function outputUsage(usage) {
    console.log('Usage: %s %s', path.basename(process.argv[1]), usage);
}

function getOptions(cfg) {
    var options = cfg.options || {};

    var aliases = _(cfg.alias || {})
        .defaults(_.pick(options, _.isString))
        .defaults({ h: 'help' })
        .pairs()
        .groupBy(1)
        .mapValues(function(pairs) { return _.pluck(pairs, 0); })
        .value()
    ;

    return _(options)
        .defaults({ help: { help: 'show help output' } })
        .omit(_.isString)
        .pairs()
        .sortBy(function(pair) {
            return pair[0].toLowerCase();
        })
        .map(function(pair) {
            return {
                name: pair[0],
                names: joinNames(pair[0]),
                help: pair[1].help
            };
        })
        .value()
    ;

    function joinNames(name) {
        var names = (aliases[name] || []).concat([ name ]);

        var opts = _.groupBy(names, function(name) {
            return name.length === 1 ? 'short' : 'long';
        });

        var short = opts.short && opts.short.map(function(opt) { return '-' + opt; }) || [];
        var long = opts.long && opts.long.map(function(opt) { return '--' + opt; }) || [];

        return short.sort().concat(long.sort()).join(', ');
    }
}

function getCommands(cfg) {
    var commands = cfg.commands || {};

    var aliases = _(commands).pick(_.isString).value();

    return _(commands)
        .omit(_.isString)
        .pairs()
        .sortBy(function(pair) {
            return pair[0].toLowerCase();
        })
        .map(function(pair) {
            return {
                name: pair[0],
                help: pair[1].help
            };
        })
        .value()
    ;
}

function outputOptions(options) {
    if (options.length) {
        console.log();
        console.log('Options:');
        console.log();

        console.log(columnify(options, {
            showHeaders: false,
            columnSplitter: '   ',
            columns: [ 'empty', 'names', 'help' ],
            config: {
                names: {
                    align: 'left'
                }
            }
        }));
    }
}

function outputCommands(commands) {
    if (commands.length) {
        console.log();
        console.log('Commands:');
        console.log();

        console.log(columnify(commands, {
            // maxLineWidth: process.stdout.columns,
            showHeaders: false,
            columnSplitter: '   ',
            columns: [ 'empty', 'name', 'help' ],
            config: {
                name: {
                    align: 'left',
                    maxWidth: 16
                },
                help: {
                    maxWidth: 64 - 6
                }
            }
        }));
    }
}
