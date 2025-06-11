"use strict";
var methodLiteral = function (methodLiteral) {
    try {
        var PARENTHESES_1 = "/\{([^}]+)\}/";
        var TOKEN_REGEX_1 = RegExp("".concat(PARENTHESES_1), 'g');
        var methodParse = methodLiteral.trim();
        var token = methodParse.match(TOKEN_REGEX_1);
        return token;
    }
    catch (error) {
        console.log(error);
    }
};
// console.log(methodLiteral("AND{string.string: contains string(abc)}"))
var mystring = "AND{string.string: contains string(abc)}";
var PARENTHESES = "/\{([^}]+)\}/";
var TOKEN_REGEX = RegExp("".concat(PARENTHESES), 'g');
console.log(mystring.match(TOKEN_REGEX));
