'use strict';

function returnNegativeOne() {
        return -1;
}

function returnTrue() {
        return true;
}

/**
 * This method performs a deep equality check and optionally looks for
 * placeholder values defined within the `template` object.
 *
 * @param {Object} template
 * @param {Object} object
 * @param {Object} [options]
 * @param {Array} [options.values]
 * @param {Function} [options.indexOfPlaceholder] function(placeholder) -1 if the the `placeholder`
 *        value (which is somewhere within `template`) is not a valid placeholder.
 *        Otherwise it returns the index within `options.values` that the value should be stored as.
 * @param {Function} [options.verifyPlaceholder] function(placeholder, value) false if the `value`
 *        (which is somewhere within `object`) is not valid for the given placeholder. An invalid
 *        value here means that the compareObject() will return false (aka `object` does not
 *        match `template`)
 * @return {boolean}
 */
function compareObject(template, object, options) {
        const placeholderValues  = options && options.values;
        const indexOfPlaceholder = options && options.indexOfPlaceholder || returnNegativeOne;
        const verifyPlaceholder  = options && options.verifyPlaceholder || returnTrue;

        const placeHolderIndex = indexOfPlaceholder(template);

        if (placeHolderIndex >= 0) {
                const placeholder = template;

                if (!verifyPlaceholder(placeholder, object)) {
                        return false;
                }

                if (placeholderValues) {
                        placeholderValues[placeHolderIndex] = object;
                }

                return true;
        }

        if (typeof template !== 'object' ||
            typeof object !== 'object' ||
            template === null ||
            object === null) {
                return template === object;
        }
        // both are a non null object at this point

        if (Array.isArray(template)) {
                if (!Array.isArray(object) || template.length !== object.length) {
                        return false;
                }


                for (let i = 0; i < template.length; ++i) {
                        if (!compareObject(template[i], object[i], options)) {
                                return false;
                        }
                }
        }

        // todo check if "prototype" matches here when configuring constructor is supported?

        const templateKeys = Object.keys(template);
        const objectKeys = Object.keys(object);

        if (templateKeys.length !== objectKeys.length) {
                return false;
        }

        templateKeys.sort();
        objectKeys.sort();

        // Quickly search for a mismatch in the keys
        for (let i = 0; i < templateKeys.length; ++i) {
                if (templateKeys[i] !== objectKeys[i]) {
                        return false;
                }
        }

        for (let i = 0; i < templateKeys.length; ++i) {
                const key = templateKeys[i];

                if (!compareObject(template[key], object[key], options)) {
                        return false;
                }
        }

        return true;
}

module.exports = compareObject;
