'use strict';

const escapeRegExp = require('lodash.escaperegexp');
const clone = require('clone');
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
                this.belongsToCustomObject = null;
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

class CustomObject {
        constructor(obj) {
                this.create = obj.create;
                this.isValid = obj.isValid;
                this.serializeValue = obj.serializeValue;
                this.objectPath = null;
                this.placeholders = [];
                this.index = null;
        }

        addPlaceholder(placeholder) {
                this.placeholders.push(placeholder);
        }
}

function initializeCustomObjects(template, customObjects, keyStack) {
        const keys = template ? Object.keys(template) : [];

        ++keyStack.length;

        for (const key of keys) {
                const value = template[key];
                keyStack[keyStack.length-1] = key;

                if (value &&
                    typeof value.create === 'function' &&
                    typeof value.isValid === 'function' &&
                    typeof value.serializeValue === 'function') {

                        const customObject = new CustomObject(value);
                        customObject.objectPath = keyStack.slice();
                        customObject.index = customObjects.length;
                        customObjects.push(customObject);
                        template[key] = customObject;
                }

                if (typeof value === 'object') {
                        initializeCustomObjects(value, customObjects, keyStack);
                }
        }

        --keyStack.length;
}

function verifyCompareObjectValue(templateValue, value) {
        if (templateValue instanceof CustomObject) {
                return !!templateValue.isValid(value);
        }

        return null; // perform normal checks
}

function indexOfPlaceholder(value) {
        return value instanceof Placeholder ? value.index : -1;
}

function verifyPlaceholder(placeholder, value) {
        return placeholder.verifyValue(value);
}

function setObjectTemplatePlaceholder(template, objectPath, objectPathIndex, placeholder) {
        if (template instanceof CustomObject) {
                template.addPlaceholder(placeholder);
                placeholder.belongsToCustomObject = template;

                return;
        }

        const key = objectPath[objectPathIndex];

        if (objectPathIndex < objectPath.length - 1) {
                return setObjectTemplatePlaceholder(template[key], objectPath, objectPathIndex + 1, placeholder);
        }

        template[key] = placeholder;
}

function setValue(object, objectPath, objectPathIndex, value) {
        const key = objectPath[objectPathIndex];

        if (objectPathIndex < objectPath.length - 1) {
                return setValue(object[key], objectPath, objectPathIndex + 1, value);
        }

        object[key] = value;
}

function getValue(object, objectPath, objectPathIndex) {
        const key = objectPath[objectPathIndex];

        if (objectPathIndex < objectPath.length - 1) {
                return getValue(object[key], objectPath, objectPathIndex + 1);
        }

        return object[key];
}

class Entry {
        constructor(urlTemplate, objectTemplate, options) {
                this.urlTemplate = null;
                this.objectTemplate = null;
                this.urlMatcher = null;
                this.urlComponents = null;
                this.placeholders = null;
                this.customObjects = null;
                this._compile(urlTemplate, objectTemplate, options);
        }

        _compile(urlTemplate, objectTemplate, options) {
                const normalize = !options || options.normalize !== false;
                urlTemplate = String(urlTemplate);
                objectTemplate = clone(Object(objectTemplate), /* circular? */ false);

                let urlMatcher = '';
                let urlMatcherLastGroup = 0;
                let placeholderContentBuffer = null;
                let state = PARSE_STATE.PLAIN;
                const urlComponents = [];
                const placeholders = [];
                const customObjects = [];

                if (normalize) {
                        urlTemplate = normalizeUrl(urlTemplate);
                }

                initializeCustomObjects(objectTemplate, customObjects, []);

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
                                        placeholder.objectPath = placeholderContentBuffer.split('.');
                                        placeholder.urlMatcherGroupIndex = urlMatcherLastGroup;
                                        placeholder.verifyMode = VERIFY.NO_SLASH;
                                        placeholder.index = placeholders.length;

                                        setObjectTemplatePlaceholder(
                                                objectTemplate,
                                                placeholder.objectPath,
                                                0,
                                                placeholder
                                        );

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
                this.customObjects = customObjects;
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
                        if (placeholder.belongsToCustomObject) {
                                continue;
                        }

                        let value = match[placeholder.urlMatcherGroupIndex];
                        value = decodeURIComponent(value);
                        setValue(object, placeholder.objectPath, 0, value);
                }

                for (const customObject of this.customObjects) {
                        const values = {};

                        for (const placeholder of customObject.placeholders) {
                                let value = match[placeholder.urlMatcherGroupIndex];
                                value = decodeURIComponent(value);

                                setValue(
                                        values,
                                        placeholder.objectPath,
                                        // skip the portion of the object path that belongs to the custom object
                                        customObject.objectPath.length,
                                        value
                                );
                        }

                        const customObjectValue = customObject.create(values);

                        setValue(object, customObject.objectPath, 0, customObjectValue);
                }


                return object;
        }

        toURL(object) {
                const placeholderValues = new Array(this.placeholders.length);
                const match = compareObject(this.objectTemplate, object, {
                        verifyValue        : verifyCompareObjectValue,
                        values             : placeholderValues,
                        indexOfPlaceholder : indexOfPlaceholder,
                        verifyPlaceholder  : verifyPlaceholder
                });

                if (!match) {
                        return null;
                }

                let url = '';

                const customObjectValues = new Array(this.customObjects.length);

                for (let i = 0; i < this.customObjects.length; ++i) {
                        const customObjectTemplate = this.customObjects[i];
                        const customObject = getValue(object, customObjectTemplate.objectPath, 0);
                        customObjectValues[i] = customObjectTemplate.serializeValue(customObject);
                }

                for (let i = 0; i < this.urlComponents.length; ++i) {
                        const component = this.urlComponents[i];

                        if (component instanceof Placeholder) {
                                const placeholder = component;
                                let value;

                                if (placeholder.belongsToCustomObject) {
                                        const customObject = placeholder.belongsToCustomObject;
                                        const values = customObjectValues[customObject.index];
                                        value = getValue(
                                                values,
                                                placeholder.objectPath,
                                                customObject.objectPath.length
                                        );
                                }
                                else {
                                        value = placeholderValues[component.index];
                                }

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
