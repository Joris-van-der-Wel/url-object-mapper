'use strict';

const test = require('tape');
const normalizeUrl = require('../lib/normalizeUrl');

test('normalize redundant encoding', function(t) {
        t.equal(normalizeUrl('foo'), 'foo');
        t.equal(normalizeUrl('foo%20%7E%22%23%3C%3E%3F%60%7B%7D'),
                             'foo%20%7E%22%23%3C%3E%3F%60%7B%7D');
        t.equal(normalizeUrl('%61%7a%41%5A%35foo'), 'azAZ5foo');
        t.equal(normalizeUrl('%61%20%7a'), 'a%20z');
        t.end();
});
