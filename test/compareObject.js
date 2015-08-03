'use strict';

const test = require('tape');
const compareObject = require('../lib/compareObject');

test('default options', function(t) {
        t.ok(compareObject({a: 'b'}, {a: 'b'}));
        t.end();
});

test('default options with placeholder', function(t) {
        const placeholder = {};
        t.ok(compareObject(
                {a: 'b', c: placeholder},
                {a: 'b', c: 'd'},
                {
                        indexOfPlaceholder : function(value) {
                                return value === placeholder ? 0 : -1;
                        }
                }
        ));
        t.end();
});
