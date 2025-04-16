const methodLiteral = (methodLiteral:string) => {
	try {
		const PARENTHESES ="/\{([^}]+)\}/"
    const TOKEN_REGEX = RegExp(`${PARENTHESES}`,'g')

    let methodParse = methodLiteral.trim()
    let token = methodParse.match(TOKEN_REGEX) as RegExpExecArray
    return token
		
	} catch (error) {
		console.log(error)
	}
}

// console.log(methodLiteral("AND{string.string: contains string(abc)}"))
 const mystring = "AND{string.string: contains string(abc)}"
		const PARENTHESES ="/\{([^}]+)\}/"
    const TOKEN_REGEX = RegExp(`${PARENTHESES}`,'g')

console.log(mystring.match(TOKEN_REGEX) as RegExpExecArray)