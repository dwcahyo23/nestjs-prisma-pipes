/**
 * Parse a string like "a: 1, b: 2" to { a: 1, b: 2 }
 * @param objectLiteralString - String to parse
 * @source https://github.com/mbest/js-object-literal-parse
 */
declare const parseObjectLiteral: (objectLiteralString: string) => [string, string | undefined][];
export default parseObjectLiteral;
