'use strict';

const test = require('tape');
const Mapper = require('..');

test('fromURL: simple match', function(t) {
        const mapper = new Mapper();
        mapper.add('/foo', ['abc']);
        mapper.add('/bar', ['def']);
        mapper.add('/foo', ['ghj']);

        t.deepEqual(mapper.fromURL('/foo'), ['abc']);
        t.deepEqual(mapper.fromURL('/bar'), ['def']);
        t.end();
});

test('fromURL: simple mismatch', function(t) {
        const mapper = new Mapper();
        mapper.add('/foo', ['abc']);
        mapper.add('/bar', ['def']);
        mapper.add('/foo', ['ghj']);

        t.deepEqual(mapper.fromURL('/foo/'), null);
        t.deepEqual(mapper.fromURL('/baz'), null);
        t.end();
});

test('fromURL: set placeholders', function(t) {
        const mapper = new Mapper();
        mapper.add('/foo/{1}', ['foo', null]);
        mapper.add('/bar/{1}-{2}', ['bar', null, null]);

        console.log(mapper.entries[1].urlMatcher);

        t.deepEqual(mapper.fromURL('/foo/abc'), ['foo', 'abc']);
        t.deepEqual(mapper.fromURL('/bar/abc-def'), ['bar', 'abc', 'def']);
        t.end();
});

test('toURL: simple match', function(t) {
        const mapper = new Mapper();
        mapper.add('/foo', ['abc']);
        mapper.add('/bar', ['def']);
        mapper.add('/foo', ['ghj']);

        t.deepEqual(mapper.toURL(['abc']), '/foo');
        t.deepEqual(mapper.toURL(['def']), '/bar');
        t.deepEqual(mapper.toURL(['ghj']), '/foo');
        t.end();
});

test('toURL: simple mismatch', function(t) {
        const mapper = new Mapper();
        mapper.add('/foo', ['abc']);
        mapper.add('/bar', ['def']);
        mapper.add('/foo', ['ghj']);

        t.deepEqual(mapper.toURL(['klm']), null);
        t.end();
});

test('toURL: set placeholders', function(t) {
        const mapper = new Mapper();
        mapper.add('/foo/{1}', ['foo', null]);
        mapper.add('/bar/{1}-{2}', ['bar', null, null]);

        t.equal(mapper.toURL(['foo', 'abc']), '/foo/abc');
        t.equal(mapper.toURL(['bar', 'abc', 'def']), '/bar/abc-def');
        t.end();
});

test('addEntry: invalid entry', function(t) {
        const mapper = new Mapper();

        t.throws(function() {
                mapper.addEntry({});
        });

        t.throws(function() {
                mapper.addEntry({toURL: 'foo', fromURL: 'foo'});
        });

        t.end();
});

test('fromURL: redundant encoding should be normalized before matching', function(t) {
        const mapper = new Mapper();
        mapper.add('/foo', ['foo']);
        mapper.add('/b%61r', ['bar']);

        t.deepEqual(mapper.fromURL('/f%6f%6F'), ['foo']);
        t.deepEqual(mapper.fromURL('/bar'), ['bar']);
        t.end();
});

test('fromURL: no normalization should be performed if an option disables this feature', function(t) {
        const mapper = new Mapper();
        mapper.add('/foo', ['foo']);
        mapper.add('/b%61r', ['bar']);
        mapper.add('/b%61z', ['baz'], {normalize: false});
        // the url is also normalized during add(), the fromURL() option has no effect on this

        t.deepEqual(mapper.fromURL('/f%6f%6F', {normalize: false}), null);
        t.deepEqual(mapper.fromURL('/bar', {normalize: false}), ['bar']);
        t.deepEqual(mapper.fromURL('/b%61r', {normalize: false}), null);
        t.deepEqual(mapper.fromURL('/baz', {normalize: false}), null);
        t.deepEqual(mapper.fromURL('/b%61z', {normalize: false}), ['baz']);
        t.end();
});
