'use strict';

const Entry = require('./Entry');

class Mapper {
        constructor() {
                this.entries = [];
        }

        add(urlTemplate, objectTemplate) {
                return this.addEntry(new Entry(urlTemplate, objectTemplate));
        }

        addEntry(entry) {
                // (A `Mapper` is also a valid entry)
                if (typeof entry.fromURL !== 'function' || typeof entry.toURL !== 'function') {
                        throw Error('An entry must implement fromURL(url) -> object and toURL(object) -> url');
                }

                this.entries.push(entry);

                return this;
        }

        fromURL(url) {
                // todo optimize using a Map
                for (let i = 0; i < this.entries.length; ++i) {
                        const entry = this.entries[i];
                        const result = entry.fromURL(url);

                        if (result !== null) {
                                return result;
                        }
                }

                return null;
        }

        toURL(object) {
                // todo optimize using a Map
                for (let i = 0; i < this.entries.length; ++i) {
                        const entry = this.entries[i];
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
