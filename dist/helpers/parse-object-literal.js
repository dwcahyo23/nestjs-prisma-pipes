"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Parse a string like "a: 1, b: 2" to { a: 1, b: 2 }
 * @param objectLiteralString - String to parse
 * @source https://github.com/mbest/js-object-literal-parse
 */
var parseObjectLiteral = function (objectLiteralString) {
    try {
        var STRING_DOUBLE = '"(?:[^"\\\\]|\\\\.)*"';
        var STRING_SINGLE = "'(?:[^'\\\\]|\\\\.)*'";
        var STRING_REGEXP = '/(?:[^/\\\\]|\\\\.)*/w*';
        var SPECIAL_CHARACTERS = ',"\'{}()/:[\\]';
        var EVERYTHING_ELSE = "[^\\s:,/][^".concat(SPECIAL_CHARACTERS, "]*[^\\s").concat(SPECIAL_CHARACTERS, "]");
        var ONE_NOT_SPACE = '[^\\s]';
        var TOKEN_REGEX_1 = RegExp("".concat(STRING_DOUBLE, "|").concat(STRING_SINGLE, "|").concat(STRING_REGEXP, "|").concat(EVERYTHING_ELSE, "|").concat(ONE_NOT_SPACE), 'g');
        var DIVISION_LOOK_BEHIND = /[\])"'A-Za-z0-9_$]+$/;
        var KEYWORD_REGEX_LOOK_BEHIND = {
            in: 1,
            return: 1,
            typeof: 1,
        };
        var stringToParse = objectLiteralString.trim();
        if (stringToParse.charCodeAt(0) === 123)
            stringToParse = stringToParse.slice(1, -1);
        var result = [];
        var tokens = stringToParse.match(TOKEN_REGEX_1);
        if (!tokens)
            return result;
        var key = void 0;
        var values = [];
        var depth = 0;
        tokens.push(',');
        for (var i = 0, token = void 0; (token = tokens[i]); ++i) {
            var characterCode = token.charCodeAt(0);
            if (characterCode === 44) {
                if (depth <= 0) {
                    if (!key && values.length === 1) {
                        key = values.pop();
                    }
                    if (key)
                        result.push([key, values.length ? values.join('') : undefined]);
                    key = undefined;
                    values = [];
                    depth = 0;
                    continue;
                }
            }
            else if (characterCode === 58) {
                if (!depth && !key && values.length === 1) {
                    key = values.pop();
                    continue;
                }
            }
            else if (characterCode === 47 && i && token.length > 1) {
                var match = tokens[i - 1].match(DIVISION_LOOK_BEHIND);
                if (match && !KEYWORD_REGEX_LOOK_BEHIND[match[0]]) {
                    stringToParse = stringToParse.substr(stringToParse.indexOf(token) + 1);
                    var result_1 = stringToParse.match(TOKEN_REGEX_1);
                    if (result_1)
                        tokens = result_1;
                    tokens.push(',');
                    i = -1;
                    token = '/';
                }
            }
            else if (characterCode === 40 || characterCode === 123 || characterCode === 91) {
                ++depth;
            }
            else if (characterCode === 41 || characterCode === 125 || characterCode === 93) {
                --depth;
            }
            else if (!key && !values.length && (characterCode === 34 || characterCode === 39)) {
                token = token.slice(1, -1);
            }
            values.push(token);
        }
        return result;
    }
    catch (error) {
        console.error('Error parsing object literal string', objectLiteralString, error);
        return [];
    }
};
exports.default = parseObjectLiteral;
