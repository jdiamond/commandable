#!/usr/bin/env node

require('../commandable')({
    run: function(cmd) {
        inspect(cmd);
    },
    commands: {
        foo: function(cmd) {
            console.log('foo');
            inspect(cmd);
        },
        bar: {
            run: function(cmd) {
                console.log('bar');
                inspect(cmd);
            },
            commands: {
                baz: function(cmd) {
                    console.log('baz');
                    inspect(cmd);
                },
                quux: function(cmd) {
                    console.log('quux');
                    inspect(cmd);
                }
            }
        }
    }
});

function inspect(obj) {
    console.log(require('util').inspect(obj, { depth: null }));
}
