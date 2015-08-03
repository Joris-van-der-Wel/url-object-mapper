'use strict';

const escapeRegExp = require('lodash.escaperegexp');
const clone = require('clone');
const objectPath = require('object-path');
const compareObject = require('./compareObject');
const normalizeUrl = require('./normalizeUrl');

const PARSE_STATE = Object.freeze({
        PLAIN       : 0,
        PLACEHOLDER : 1
});

const VERIFY = Object.freeze({
        NO_SLASH : 1
});

const matcherPlaceholderDefault = '([^\/\?]+?)'; // match non greedy up to a /

class Placeholder {
        constructor() {
                this.objectPath = null;
                this.urlMatcherGroupIndex = -1;
                this.verifyMode = 0;
                this.index = 0;
        }

        verifyValue(value) {
                if (typeof value !== 'string' && typeof value !== 'number') {
                        // placeholders can only match strings or numbers
                        return false;
                }

                switch (this.verifyMode) {
                        case VERIFY.NO_SLASH:
                                if (typeof value === 'string' && value.indexOf('/') >= 0) {
                                        return false;
                                }
                }

                return true;
        }
}

function indexOfPlaceholder(value) {
        return value instanceof Placeholder ? value.index : -1;
}

function verifyPlaceholder(placeholder, value) {
        return placeholder.verifyValue(value);
}

class Entry {
        constructor(urlTemplate, objectTemplate, options) {
                this.urlTemplate = null;
                this.objectTemplate = null;
                this.urlMatcher = null;
                this.urlComponents = null;
                this.placeholders = null;
                this._compile(urlTemplate, objectTemplate, options);
        }

        _compile(urlTemplate, objectTemplate, options) {
                const normalize = !options || options.normalize !== false;
                urlTemplate = String(urlTemplate);
                objectTemplate = clone(Object(objectTemplate));

                if (normalize) {
                        urlTemplate = normalizeUrl(urlTemplate);
                }

                let urlMatcher = '';
                let urlMatcherLastGroup = 0;
                let placeholderContentBuffer = null;
                let state = PARSE_STATE.PLAIN;
                let urlComponents = [];
                let placeholders = [];

                for (let i = 0; i < urlTemplate.length; ++i) {
                        const c = urlTemplate[i];

                        if (state === PARSE_STATE.PLAIN) {
                                if (c === '{') {
                                        state = PARSE_STATE.PLACEHOLDER;
                                        placeholderContentBuffer = '';
                                }
                                else {
                                        urlMatcher += escapeRegExp(c);

                                        if (typeof urlComponents[urlComponents.length - 1] === 'string') {
                                                urlComponents[urlComponents.length - 1] += c;
                                        }
                                        else {
                                                urlComponents.push(c);
                                        }
                                }
                        }
                        /* istanbul ignore else */
                        else if (state === PARSE_STATE.PLACEHOLDER) {
                                if (c === '}') {
                                        urlMatcher += matcherPlaceholderDefault;
                                        ++urlMatcherLastGroup;

                                        const placeholder = new Placeholder();
                                        placeholder.objectPath = placeholderContentBuffer;
                                        placeholder.urlMatcherGroupIndex = urlMatcherLastGroup;
                                        placeholder.verifyMode = VERIFY.NO_SLASH;
                                        placeholder.index = placeholders.length;

                                        objectPath.set(objectTemplate, placeholder.objectPath, placeholder);
                                        placeholders.push(placeholder);
                                        urlComponents.push(placeholder);

                                        state = PARSE_STATE.PLAIN;
                                        placeholderContentBuffer = null;
                                }
                                else {
                                        placeholderContentBuffer += c;
                                }
                        }
                        else {
                                throw Error('Assertion error');
                        }
                }

                this.urlMatcher = new RegExp('^' + urlMatcher + '$');
                this.urlTemplate = urlTemplate;
                this.objectTemplate = objectTemplate;
                this.urlComponents = urlComponents;
                this.placeholders = placeholders;
        }

        fromURL(url, options) {
                const normalize = !options || options.normalize !== false;

                if (normalize) {
                        url = normalizeUrl(url);
                }

                const match = this.urlMatcher.exec(url);

                if (!match) {
                        return null;
                }

                const object = clone(this.objectTemplate);

                for (const placeholder of this.placeholders) {
                        let value = match[placeholder.urlMatcherGroupIndex];
                        value = decodeURIComponent(value);
                        objectPath.set(object, placeholder.objectPath, value);
                }

                return object;
        }

        toURL(object) {
                const placeholderValues = new Array(this.placeholders.length);
                const match = compareObject(this.objectTemplate, object, {
                        values             : placeholderValues,
                        indexOfPlaceholder : indexOfPlaceholder,
                        verifyPlaceholder  : verifyPlaceholder
                });

                if (!match) {
                        return null;
                }

                let url = '';

                for (let i = 0; i < this.urlComponents.length; ++i) {
                        const component = this.urlComponents[i];

                        if (component instanceof Placeholder) {
                                let value = placeholderValues[component.index];
                                value = encodeURIComponent(value);
                                url += value;
                        }
                        else {
                                url += component;
                        }
                }

                return url;
        }
}

module.exports = Entry;
