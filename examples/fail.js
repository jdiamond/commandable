#!/usr/bin/env node

'use strict';

require('..')({
    run: function(cmd) {
        throw new Error('always fails');
    }
});
