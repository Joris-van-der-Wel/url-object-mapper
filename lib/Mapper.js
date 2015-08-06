'use strict';

const Entry = require('./Entry');
const normalizeUrl = require('./normalizeUrl');

class Mapper {
        constructor() {
                this.entries = [];
        }

        add(urlTemplate, objectTemplate, options) {
                return this.addEntry(new Entry(urlTemplate, objectTemplate, options));
        }

        addEntry(entry) {
                // (A `Mapper` is also a valid entry)
                if (typeof entry.fromURL !== 'function' || typeof entry.toURL !== 'function') {
                        throw Error('An entry must implement fromURL(url) -> object and toURL(object) -> url');
                }

                this.entries.push(entry);

                return this;
        }

        fromURL(url, options) {
                const normalize = !options || options.normalize !== false;

                if (normalize) {
                        url = normalizeUrl(url);
                }

                // todo optimize using a Map
                for (const entry of this.entries) {
                        // (no need to normalize again)
                        const result = entry.fromURL(url, {normalize: false});

                        if (result !== null) {
                                return result;
                        }
                }

                return null;
        }

        toURL(object) {
                // todo optimize using a Map
                for (const entry of this.entries) {
                        const result = entry.toURL(object);

                        if (result !== null) {
                                return result;
                        }
                }

                return null;
        }
}

module.exports = Mapper;
Mapper.Entry = Entry;
