"use strict";
const methodLiteral = (methodLiteral) => {
    try {
        const PARENTHESES = "/\{([^}]+)\}/";
        const TOKEN_REGEX = RegExp(`${PARENTHESES}`, 'g');
        let methodParse = methodLiteral.trim();
        let token = methodParse.match(TOKEN_REGEX);
        return token;
    }
    catch (error) {
        console.log(error);
    }
};
const mystring = "AND{string.string: contains string(abc)}";
const PARENTHESES = "/\{([^}]+)\}/";
const TOKEN_REGEX = RegExp(`${PARENTHESES}`, 'g');
//# sourceMappingURL=parse-method-literal.js.map