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

test('fromURL: url decoding', function(t) {
        const entry = new Entry('/foo/{1}', ['foo', 'bar']);
        t.deepEqual(entry.fromURL('/foo/bar%20baz'), ['foo', 'bar baz']);
        t.end();
});

test('toURL: url encoding', function(t) {
        const entry = new Entry('/foo/{1}', ['foo', 'bar']);
        t.equal(entry.toURL(['foo', 'bar baz']), '/foo/bar%20baz');
        t.end();
});

test('fromURL: redundant encoding should be normalized before matching', function(t) {
        const entry = new Entry('/foo', ['foo']);
        t.deepEqual(entry.fromURL('/f%6f%6F'), ['foo']);
        const entry2 = new Entry('/f%6f%6F', ['foo']);
        t.deepEqual(entry2.fromURL('/foo'), ['foo']);
        t.end();
});

class MyObject {
        constructor(abc, def) {
                this.myAbc = abc;
                this.myDef = def;
        }
}

const myObjectTemplate = {};
myObjectTemplate.create = function(values) {
        return new MyObject(values.abc, values.def);
};

myObjectTemplate.isValid = function(object) {
        return object instanceof MyObject;
};

myObjectTemplate.serializeValue = function(object) {
        return {
                abc : object.myAbc,
                def : object.myDef
        };
};

test('fromURL: create custom object', function(t) {
        const entry = new Entry('/foo/{1.abc}/{1.def}', ['foo', myObjectTemplate]);
        const result = entry.fromURL('/foo/qwerty/dvorak');
        t.deepEqual(result, ['foo', new MyObject('qwerty', 'dvorak')]);
        t.ok(result && result[1] instanceof MyObject);
        t.end();
});

test('fromURL: create custom object (deep)', function(t) {
        const entry = new Entry('/foo/{1.bar.abc}/{1.bar.def}', ['foo', {bar: myObjectTemplate}]);
        const result = entry.fromURL('/foo/qwerty/dvorak');
        t.deepEqual(result, ['foo', {bar: new MyObject('qwerty', 'dvorak')}]);
        t.ok(result && result[1] && result[1].bar instanceof MyObject);
        t.end();
});


test('fromURL: create custom object without setting any values for it', function(t) {
        const entry = new Entry('/foo', ['foo', myObjectTemplate]);
        const result = entry.fromURL('/foo');
        t.deepEqual(result, ['foo', new MyObject(undefined, undefined)]);
        t.ok(result && result[1] instanceof MyObject);
        t.end();
});

test('toURL: only match valid custom objects', function(t) {
        const entry = new Entry('/foo/{1.abc}/{1.def}', ['foo', myObjectTemplate]);
        t.equal(entry.toURL(['foo', {abc: 1, def: 2}]), null,
                'should fail the isValid() check of the custom object template');
        t.end();
});

test('toURL: serialize custom objects', function(t) {
        const entry = new Entry('/foo/{1.abc}/{1.def}', ['foo', myObjectTemplate]);
        t.equal(entry.toURL(['foo', new MyObject('qwerty', 'dvorak')]), '/foo/qwerty/dvorak');
        t.end();
});

test('toURL: serialize custom objects (deep)', function(t) {
        const entry = new Entry('/foo/{1.bar.abc}/{1.bar.def}', ['foo', {bar: myObjectTemplate}]);
        t.equal(entry.toURL(['foo', {bar: new MyObject('qwerty', 'dvorak')}]), '/foo/qwerty/dvorak');
        t.end();
});


// todo query string

