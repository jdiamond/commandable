var path = require('path');
var columnify = require('columnify');
var _ = require('lodash');

module.exports = help;

function help(cmd) {
    var options = getOptions(cmd);
    var commands = getCommands(cmd);
    var usage = getUsage(cmd, options, commands);

    outputUsage(usage);
    outputOptions(options);
    outputCommands(commands);
}

function getUsage(cmd, options, commands) {
    var usage = '';

    if (cmd.sup) {
        (function sup(cmd) {
            if (cmd) {
                usage = ' ' + cmd._[0] + usage;
                sup(cmd.sup);
            }
        })(cmd.sup);
    }

    if (options.length) {
        usage += ' [options]';
    }

    if (cmd.arguments && cmd.arguments.length) {
        usage += ' ' + _(cmd.arguments).map(function(arg) {
            return arg.required
                ? '<' + arg.name + '>'
                : '[' + arg.name + ']'
            ;
        }).value().join(' ');
    }

    if (commands.length) {
        usage += cmd.run ? ' [command]' : ' <command>';
    }

    if (cmd.usage) {
        usage += ' ' + cmd.usage;
    }

    return usage.trim();
}

function getOptions(cmd) {
    var options = cmd.options || {};

    var aliases = _(cmd.alias || {})
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

function getCommands(cmd) {
    var commands = cmd.commands || {};

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

function outputUsage(usage) {
    console.log('Usage: %s %s', path.basename(process.argv[1]), usage);
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
