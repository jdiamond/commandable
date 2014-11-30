#!/usr/bin/env node

'use strict';

require('../commandable')({
    run: function(cmd) {
        throw new Error('always fails');
    }
});
