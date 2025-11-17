# WherePipe - Internal Documentation

## 🏗️ Architecture Overview

The WherePipe is built with a modular, extensible architecture that transforms query strings into Prisma-compatible where objects.

---

## 📦 Core Components

### 1. Type Parsers Registry

A registry pattern that maps type identifiers to parser functions:

```typescript
const TYPE_PARSERS: Record<string, (value: string) => ParsedValue> = {
	int: parseStringToInt,
	date: parseStringToDate,
	datetime: parseStringToDate,
	float: parseStringToFloat,
	string: parseStringToString,
	boolean: parseStringToBoolean,
	bool: parseStringToBoolean,
	array: parseStringToArray,
	field: parseFieldReference, // Field-to-field comparison
};
```

**Adding a new type:**
```typescript
// 1. Create parser function
function parseStringToDecimal(ruleValue: string): number {
	if (!ruleValue.startsWith('decimal(') || !ruleValue.endsWith(')')) {
		return 0;
	}
	const content = extractParenthesesContent(ruleValue);
	return content ? parseFloat(content) : 0;
}

// 2. Register in TYPE_PARSERS
const TYPE_PARSERS = {
	// ... existing parsers
	decimal: parseStringToDecimal,
};
```

---

### 2. Operator Extraction

Filter operators are defined as a const array for type safety:

```typescript
const FILTER_OPERATORS = [
	'lt', 'lte', 'gt', 'gte', 'equals', 'not', 
	'contains', 'startsWith', 'endsWith',
	'every', 'some', 'none', 
	'in', 'has', 'hasEvery', 'hasSome',
] as const;
```

The `extractOperatorAndValue()` function splits operator from value:

```typescript
// Input: "gte date(2024-01-01)"
// Output: { operator: "gte", value: "date(2024-01-01)" }
```

---

### 3. Helper Functions

#### `delimetedStringObject(key, value, delimiter)`

Converts dot-notation strings to nested objects:

```typescript
// Example 1: Simple nesting
delimetedStringObject('user.profile.name', 'John')
// Returns: { user: { profile: { name: 'John' } } }

// Example 2: With Prisma relation keywords
delimetedStringObject('posts.some.title', { contains: 'Hello' })
// Returns: { posts: { some: { title: { contains: 'Hello' } } } }
```

**How it works:**
1. Split key by delimiter: `['user', 'profile', 'name']`
2. Reverse array: `['name', 'profile', 'user']`
3. Reduce from value, wrapping each level:
   ```typescript
   v -> { name: v }
   -> { profile: { name: v } }
   -> { user: { profile: { name: v } } }
   ```

#### `deepMerge(target, source)`

Recursively merges two objects, useful for combining multiple conditions on the same field:

```typescript
const target = { createdAt: { gte: '2024-01-01' } };
const source = { createdAt: { lte: '2024-12-31' } };

deepMerge(target, source);
// Returns: { createdAt: { gte: '2024-01-01', lte: '2024-12-31' } }
```

---

## 🔄 Processing Flow

### Step-by-Step Transformation

```
Query String → Parse → Extract → Transform → Merge → Result
```

#### Example: `"qty: lte field(recQty), status: active"`

**Step 1: Parse with `parseObjectLiteral()`**
```typescript
[
  ['qty', 'lte field(recQty)'],
  ['status', 'active']
]
```

**Step 2: Extract Operator**
```typescript
// For 'qty':
{ operator: 'lte', value: 'field(recQty)' }

// For 'status':
{ operator: null, value: 'active' }
```

**Step 3: Parse Value**
```typescript
// 'field(recQty)' → { _ref: 'recQty' }
// 'active' → 'active'
```

**Step 4: Transform to Final Value**
```typescript
// qty: { lte: 'recQty' }
// status: 'active'
```

**Step 5: Build Result**
```typescript
{
  qty: { lte: 'recQty' },
  status: 'active'
}
```

---

## 🎯 Special Cases

### 1. Date Ranges on Same Column

Multiple operators on the same field are merged:

```typescript
// Input: "createdAt: gte date(2024-01-01), createdAt: lte date(2024-12-31)"

// First iteration:
items = { createdAt: { gte: '2024-01-01T00:00:00.000Z' } }

// Second iteration (merge):
items = {
  createdAt: {
    gte: '2024-01-01T00:00:00.000Z',
    lte: '2024-12-31T23:59:59.000Z'
  }
}
```

### 2. Nested Relations

Dot notation is converted to nested objects:

```typescript
// Input: "posts.some.title: contains string(Hello)"

// After delimetedStringObject:
{
  posts: {
    some: {
      title: {
        contains: 'Hello'
      }
    }
  }
}
```

### 3. Field-to-Field Comparison

Field references are detected and converted:

```typescript
// Input: "qty: lte field(recQty)"

// Parse: field(recQty) → { _ref: 'recQty' }
// isFieldReference() → true
// convertToFieldReference() → 'recQty'
// Final: { qty: { lte: 'recQty' } }
```

---

## 🧪 Testing Strategy

### Unit Test Categories

1. **Type Parsing**
   - Each type parser (int, float, string, bool, date, array, field)
   - Edge cases (empty, null, malformed)

2. **Operator Handling**
   - All comparison operators (lt, lte, gt, gte, equals, not)
   - All text operators (contains, startsWith, endsWith)
   - All array operators (in, has, hasEvery, hasSome)
   - All relation operators (is, some, every, none)

3. **Complex Scenarios**
   - Date ranges on same column
   - Multiple field references
   - Deep nested relations
   - Combined filters (operators + dates + relations + field refs)

4. **Edge Cases**
   - Empty strings
   - Null values
   - Empty arrays
   - Invalid formats
   - Multiple operators merging

---

## 🚀 Performance Considerations

### 1. Parser Registry Lookup

Using object lookup for type parsers is O(1):

```typescript
for (const [type, parser] of Object.entries(TYPE_PARSERS)) {
	if (ruleValue.startsWith(`${type}(`)) {
		return parser(ruleValue);
	}
}
```

**Optimization opportunity:** Use a Map instead of Object for faster iterations.

### 2. Deep Merge

The `deepMerge` function is recursive and can be expensive for deeply nested objects. However, Prisma where clauses are typically not deeply nested (3-5 levels max), so this is acceptable.

### 3. String Operations

Multiple string operations (split, indexOf, startsWith) are used. These are optimized by V8 engine and perform well for typical query lengths.

---

## 🔧 Extension Points

### Adding New Operators

```typescript
// 1. Add to FILTER_OPERATORS array
const FILTER_OPERATORS = [
	// ... existing
	'regexp', // NEW
] as const;

// 2. No additional code needed - operator extraction is automatic
```

### Adding Custom Type Parsers

```typescript
// 1. Define parser
function parseStringToUUID(ruleValue: string): string {
	if (!ruleValue.startsWith('uuid(') || !ruleValue.endsWith(')')) {
		return '';
	}
	const content = extractParenthesesContent(ruleValue);
	// Validate UUID format
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	return content && uuidRegex.test(content) ? content : '';
}

// 2. Register
const TYPE_PARSERS = {
	// ... existing
	uuid: parseStringToUUID,
};

// 3. Use in queries
// ?where=id:uuid(123e4567-e89b-12d3-a456-426614174000)
```

### Adding Validation

```typescript
// Add validation layer before processing
transform(value: string): Pipes.Where | undefined {
	if (value == null || value === '') {
		return {};
	}
	
	// NEW: Validate query length
	if (value.length > 5000) {
		throw new BadRequestException('Query string too long');
	}
	
	// NEW: Validate character set
	const dangerousChars = /[;<>]/;
	if (dangerousChars.test(value)) {
		throw new BadRequestException('Invalid characters in query');
	}
	
	// ... rest of transform logic
}
```

---

## 📊 Complexity Analysis

### Time Complexity

- **Parse**: O(n) where n is query string length
- **Extract Operator**: O(m) where m is number of operators (constant ~15)
- **Parse Value**: O(k) where k is value string length
- **Deep Merge**: O(d) where d is depth of nesting (typically 3-5)

**Overall**: O(n * m) for the entire transformation, which is acceptable for typical query strings.

### Space Complexity

- **Result Object**: O(f) where f is number of fields
- **Nested Objects**: O(d * f) where d is depth

**Overall**: O(d * f), linear with query complexity.

---

## 🛡️ Security Considerations

### 1. Input Validation

- Query strings are validated before processing
- Type parsers validate input format
- Invalid formats throw `BadRequestException`

### 2. SQL Injection Protection

Since we're using Prisma, SQL injection is prevented by Prisma's parameterized queries. The pipe only transforms strings to objects - actual query execution is handled by Prisma.

### 3. DoS Protection

Potential DoS vectors:
- Very long query strings → Add length limits
- Deeply nested objects → Add depth limits
- Many conditions → Add condition count limits

**Recommended limits:**
```typescript
const MAX_QUERY_LENGTH = 5000;
const MAX_NESTING_DEPTH = 10;
const MAX_CONDITIONS = 50;
```

---

## 📝 Maintenance Guidelines

### Code Style

1. **Functional Programming**: Prefer pure functions without side effects
2. **Type Safety**: Use TypeScript types for all parameters and returns
3. **Single Responsibility**: Each function does one thing well
4. **Documentation**: JSDoc comments for public functions

### Adding Features

1. Add tests first (TDD approach)
2. Implement feature in isolated function
3. Register in appropriate registry/array
4. Update documentation
5. Add real-world example in README

### Debugging Tips

```typescript
// Add debug logging
console.log('Rules:', rules);
console.log('Operator:', operator, 'Value:', rawValue);
console.log('Parsed Value:', parsedValue);
console.log('Final Value:', finalValue);
console.log('Items:', items);
```

---

## 🔍 Common Issues & Solutions

### Issue 1: Double Nesting

**Problem:** Field appears twice in nested object
```typescript
{ user: { role: { role: 'admin' } } } // Wrong
```

**Solution:** Ensure `delimetedStringObject` receives the final processed value, not wrapped value.

### Issue 2: Operator Not Recognized

**Problem:** Operator treated as part of value

**Solution:** Ensure operator is in `FILTER_OPERATORS` array and followed by a space.

### Issue 3: Date Range Not Merging

**Problem:** Second date operator overwrites first

**Solution:** Check that merge logic in flat key handling is correct:
```typescript
if (items[ruleKey] && typeof items[ruleKey] === 'object' && typeof finalValue === 'object') {
	items[ruleKey] = { ...items[ruleKey], ...finalValue };
}
```

---

## 📚 Further Reading

- [Prisma Where Clause Documentation](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#where)
- [NestJS Pipes Documentation](https://docs.nestjs.com/pipes)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

---

## 🎓 Learning Resources

### For Contributors

1. Understand Prisma's where clause structure
2. Learn NestJS pipe transform pattern
3. Study functional programming patterns
4. Review test-driven development (TDD)

### For Users

1. Start with basic examples
2. Progress to nested relations
3. Explore field-to-field comparison
4. Combine multiple features

---

**Version:** 2.2.0  
**Last Updated:** 2024  
**Maintainer:** @dwcahyo