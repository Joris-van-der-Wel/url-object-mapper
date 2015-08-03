'use strict';

const test = require('tape');
const Entry = require('../lib/Entry');

test('fromURL: simple mismatch', function(t) {
        const entry = new Entry('/foo', {foo: 'bar'});
        t.equal(entry.fromURL('/bar'), null);
        t.equal(entry.fromURL('/foo/bar'), null);
        t.equal(entry.fromURL('/foo/'), null);
        t.equal(entry.fromURL(''), null);
        t.end();
});

test('fromURL: simple match', function(t) {
        const entry = new Entry('/foo', {foo: 'bar'});
        t.deepEqual(entry.fromURL('/foo'), {foo: 'bar'});
        t.end();
});

test('fromURL: set placeholders', function(t) {
        const entry = new Entry('/foo/{1}-{3.baz}', ['page', null, 'foo', {bar: 'bar bar'}]);
        t.deepEqual(entry.fromURL('/foo/abc-def'), ['page', 'abc', 'foo', {bar: 'bar bar', baz: 'def'}]);
        t.end();
});

test('fromURL: mismatch with placeholders', function(t) {
        const entry = new Entry('/foo{1}', ['foo', null]);
        t.equal(entry.fromURL('/foo'), null);
        t.equal(entry.fromURL('/foo/'), null);
        t.equal(entry.fromURL('/foo/bar'), null);
        t.equal(entry.fromURL(''), null);
        t.end();
});

test('toURL: simple match', function(t) {
        const entry = new Entry('/foo', {foo: 'bar'});
        t.deepEqual(entry.toURL({foo: 'bar'}), '/foo');
        t.end();
});

test('toURL: simple mismatch', function(t) {
        const entry = new Entry('/foo', {foo: 'bar'});
        t.equal(entry.toURL({}), null);
        t.equal(entry.toURL('bar'), null);
        t.equal(entry.toURL(5), null);
        t.equal(entry.toURL({bar: 'bar'}), null);
        t.equal(entry.toURL({foo: 'nomatch'}), null);
        t.equal(entry.toURL({foo: 5}), null);
        t.equal(entry.toURL({foo: true}), null);
        t.equal(entry.toURL({foo: ''}), null);
        t.equal(entry.toURL({foo: null}), null);
        t.equal(entry.toURL({foo: undefined}), null);
        t.equal(entry.toURL({foo: {}}), null);
        t.equal(entry.toURL({foo: 'bar', bar: 'too many keys'}), null);
        t.end();
});

test('toURL: array mismatch', function(t) {
        const entry = new Entry('/foo', ['a', 'b', 5]);
        t.equal(entry.toURL([]), null);
        t.equal(entry.toURL(['a']), null);
        t.equal(entry.toURL(['a', 'b']), null);
        t.equal(entry.toURL(['a', 'b', 6]), null);
        t.equal(entry.toURL({0: 'a', 1: 'b', 2: 5}), null);
        t.equal(entry.toURL({0: 'a', 1: 'b', 2: 5, length: 3}), null);
        t.end();
});

test('toURL: set placeholders', function(t) {
        const entry = new Entry('/foo/{1}-{3.baz}', ['page', null, 'foo', {bar: 'bar bar'}]);
        t.deepEqual(entry.toURL(['page', 'abc', 'foo', {bar: 'bar bar', baz: 'def'}]), '/foo/abc-def');
        t.equal(entry.toURL(['no match']), null);
        t.end();
});

test('toURL: invalid placeholder value', function(t) {
        const entry = new Entry('/foo/{1}', ['foo', 'bar']);
        t.equal(entry.toURL(['foo', {}]), null);
        t.equal(entry.toURL(['foo', null]), null);
        t.equal(entry.toURL(['foo', false]), null);
        t.equal(entry.toURL(['foo', true]), null);
        t.equal(entry.toURL(['foo', undefined]), null);
        t.equal(entry.toURL(['foo', []]), null);
        t.equal(entry.toURL(['foo', 'bar/baz']), null); // may not contain a slash
        t.end();
});

// todo query string

