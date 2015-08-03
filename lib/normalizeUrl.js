'use strict';

function redundantEncodingReplacer(match, p1) {
        const c = parseInt(p1, 16);
        const str = String.fromCodePoint(c);

        // from npm whatwg-url
        if (c <= 0x20 || c >= 0x7E || str === '"' || str === '#' ||
            str === '<' || str === '>' || str === '?' || str === '`' ||
            str === '{' || str === '}') {
                // these are not redundant, do not modify them
                return match;
        }

        // At this point it is a redundant
        return str;
}

module.exports = function normalizeUrl(url) {
        if (!url || url.indexOf('%') < 0) {
                return url;
        }

        return url.replace(/%([0-9a-f][0-9a-f])/gi, redundantEncodingReplacer);
};

