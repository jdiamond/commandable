#!/usr/bin/env node

require('./commandable')({
    run: function(opts) {
        inspect(opts);
    },
    commands: {
        foo: function(opts) {
            console.log('foo');
            inspect(opts);
        },
        bar: {
            run: function(opts) {
                console.log('bar');
                inspect(opts);
            },
            commands: {
                baz: function(opts) {
                    console.log('baz');
                    inspect(opts);
                },
                quux: function(opts) {
                    console.log('quux');
                    inspect(opts);
                }
            }
        }
    }
});

function inspect(obj) {
    console.log(require('util').inspect(obj, { depth: null }));
}
