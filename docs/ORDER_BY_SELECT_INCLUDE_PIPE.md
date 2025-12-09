# OrderByPipe, SelectPipe, IncludePipe - Documentation

Quick reference for sorting, field selection, and relation loading pipes.

---

## OrderByPipe - Sorting

Transform query strings into Prisma `orderBy` clauses.

### Basic Usage

```typescript
@Controller('products')
export class ProductController {
  @Get()
  async findAll(@Query('sort', OrderByPipe) orderBy?: Pipes.Order) {
    return this.prisma.product.findMany({ orderBy });
  }
}
```

### Syntax

```bash
# Ascending (default)
?sort=price

# Descending (prefix with -)
?sort=-price

# Multiple fields
?sort=category,-price,name

# Nested relations
?sort=category.name,-warehouse.stock
```

### Examples

```bash
# Sort by price ascending
GET /products?sort=price

# Sort by price descending
GET /products?sort=-price

# Sort by category, then price descending
GET /products?sort=category,-price

# Sort by nested relation
GET /products?sort=category.name

# Complex sorting
GET /products?sort=warehouse.region,category.name,-price
```

### Output Format

```typescript
// Input: ?sort=category,-price
// Output:
[
  { category: 'asc' },
  { price: 'desc' }
]

// Input: ?sort=category.name,-price
// Output:
[
  { category: { name: 'asc' } },
  { price: 'desc' }
]
```

---

## SelectPipe - Field Selection

Transform query strings into Prisma `select` clauses for choosing specific fields.

### Basic Usage

```typescript
@Controller('products')
export class ProductController {
  @Get()
  async findAll(@Query('fields', SelectPipe) select?: Pipes.Select) {
    return this.prisma.product.findMany({ select });
  }
}
```

### Syntax

```bash
# Select specific fields
?fields=id,name,price

# Nested relations
?fields=id,name,category.name,category.slug

# Deep nesting
?fields=id,name,reviews.rating,reviews.user.name
```

### Examples

```bash
# Select only id, name, and price
GET /products?fields=id,name,price

# Select with category name
GET /products?fields=id,name,price,category.name

# Select with multiple nested fields
GET /products?fields=id,name,category.name,category.slug,warehouse.name

# Complex selection
GET /products?fields=id,name,reviews.rating,reviews.comment,reviews.user.name
```

### Output Format

```typescript
// Input: ?fields=id,name,price
// Output:
{
  id: true,
  name: true,
  price: true
}

// Input: ?fields=id,name,category.name
// Output:
{
  id: true,
  name: true,
  category: {
    select: {
      name: true
    }
  }
}

// Input: ?fields=id,reviews.rating,reviews.user.name
// Output:
{
  id: true,
  reviews: {
    select: {
      rating: true,
      user: {
        select: {
          name: true
        }
      }
    }
  }
}
```

### Important Notes

- Cannot be used with `include` pipe simultaneously
- Use for API optimization (reduce payload size)
- Nested selections automatically add `select` wrappers

---

## IncludePipe - Relation Loading

Transform query strings into Prisma `include` clauses for loading relations.

### Basic Usage

```typescript
@Controller('products')
export class ProductController {
  @Get()
  async findAll(@Query('include', IncludePipe) include?: Pipes.Include) {
    return this.prisma.product.findMany({ include });
  }
}
```

### Syntax

```bash
# Single relation
?include=category

# Multiple relations
?include=category,reviews,warehouse

# Nested relations
?include=category,reviews.user,warehouse.location
```

### Examples

```bash
# Include category
GET /products?include=category

# Include multiple relations
GET /products?include=category,reviews,warehouse

# Include nested relations
GET /products?include=category,reviews.user

# Deep nesting
GET /products?include=reviews.user.profile,warehouse.location.country
```

### Output Format

```typescript
// Input: ?include=category
// Output:
{
  category: true
}

// Input: ?include=category,reviews
// Output:
{
  category: true,
  reviews: true
}

// Input: ?include=category,reviews.user
// Output:
{
  category: true,
  reviews: {
    include: {
      user: true
    }
  }
}

// Input: ?include=reviews.user.profile
// Output:
{
  reviews: {
    include: {
      user: {
        include: {
          profile: true
        }
      }
    }
  }
}
```

### Advanced Include with Filters

```typescript
// Manual configuration for advanced scenarios
@Get()
async findAll(
  @Query('include', IncludePipe) include?: Pipes.Include,
  @Query('filter', WherePipe) where?: Pipes.Where,
) {
  return this.prisma.product.findMany({
    where,
    include: {
      ...include,
      reviews: {
        where: { rating: { gte: 4 } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });
}
```

### Important Notes

- Cannot be used with `select` pipe simultaneously
- Use for loading complete relation data
- Nested includes automatically add `include` wrappers
- Can be combined with `where` and `orderBy` for filtered includes

---

## Combining Multiple Pipes

### Example: Complete Product Listing

```typescript
@Controller('products')
export class ProductController {
  @Get()
  async findAll(
    @Query('filter', WherePipe) where?: Pipes.Where,
    @Query('sort', OrderByPipe) orderBy?: Pipes.Order,
    @Query('fields', SelectPipe) select?: Pipes.Select,
    @Query('include', IncludePipe) include?: Pipes.Include,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const skip = (page - 1) * limit;

    return this.prisma.product.findMany({
      where,
      orderBy,
      select: select || undefined,
      include: select ? undefined : include, // Mutually exclusive
      take: limit,
      skip,
    });
  }
}
```

### Example Requests

```bash
# Filter + Sort
GET /products?filter=price:gte+int(100)&sort=-price

# Filter + Sort + Include
GET /products?filter=category:electronics&sort=-createdAt&include=category,reviews

# Filter + Sort + Select
GET /products?filter=active:equals+bool(true)&sort=name&fields=id,name,price

# Complete query with pagination
GET /products?filter=price:gte+int(100),price:lte+int(500)&sort=-price&include=category&page=1&limit=20
```

---

## API Reference

### OrderByPipe

```typescript
transform(value: string): Pipes.Order | undefined
```

**Input:** `"category,-price,name"`  
**Output:** `[{ category: 'asc' }, { price: 'desc' }, { name: 'asc' }]`

### SelectPipe

```typescript
transform(value: string): Pipes.Select | undefined
```

**Input:** `"id,name,category.name"`  
**Output:** `{ id: true, name: true, category: { select: { name: true } } }`

### IncludePipe

```typescript
transform(value: string): Pipes.Include | undefined
```

**Input:** `"category,reviews.user"`  
**Output:** `{ category: true, reviews: { include: { user: true } } }`

---

## Best Practices

### 1. Use Select for API Optimization

```bash
# ✅ Good - Only return needed fields
GET /products?fields=id,name,price

# ❌ Bad - Return all fields (slower, larger payload)
GET /products
```

### 2. Include Only Necessary Relations

```bash
# ✅ Good - Specific relations
GET /products?include=category

# ❌ Bad - Too many relations (N+1 problem)
GET /products?include=category,reviews,warehouse,tags,images
```

### 3. Combine Sort with Indexes

```prisma
// ✅ Add indexes for frequently sorted fields
model Product {
  id        String   @id
  price     Decimal
  createdAt DateTime
  
  @@index([price])
  @@index([createdAt])
}
```

### 4. Select vs Include

```bash
# Use Select when you need specific fields
GET /products?fields=id,name,price,category.name

# Use Include when you need full relation objects
GET /products?include=category,reviews

# ⚠️ Don't use both (mutually exclusive)
```

### 5. Limit Deep Nesting

```bash
# ✅ Good - 2-3 levels
GET /products?include=reviews.user

# ❌ Bad - Too deep (performance issues)
GET /products?include=reviews.user.profile.address.country
```

---

## Common Patterns

### Pattern 1: List with Minimal Data

```typescript
@Get()
async list(
  @Query('filter', WherePipe) where?: Pipes.Where,
  @Query('sort', OrderByPipe) orderBy?: Pipes.Order,
) {
  return this.prisma.product.findMany({
    where,
    orderBy,
    select: {
      id: true,
      name: true,
      price: true,
      category: { select: { name: true } },
    },
  });
}
```

```bash
GET /products?filter=active:equals+bool(true)&sort=-createdAt
```

### Pattern 2: Detail with Full Relations

```typescript
@Get(':id')
async detail(@Param('id') id: string) {
  return this.prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      reviews: {
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      warehouse: true,
    },
  });
}
```

### Pattern 3: Flexible API

```typescript
@Get()
async findAll(
  @Query('filter', WherePipe) where?: Pipes.Where,
  @Query('sort', OrderByPipe) orderBy?: Pipes.Order,
  @Query('fields', SelectPipe) select?: Pipes.Select,
  @Query('include', IncludePipe) include?: Pipes.Include,
) {
  // Select and include are mutually exclusive
  return this.prisma.product.findMany({
    where,
    orderBy,
    ...(select ? { select } : { include }),
  });
}
```

```bash
# Client chooses fields
GET /products?fields=id,name,price

# Or includes relations
GET /products?include=category,reviews
```

---

## Performance Tips

### 1. Pagination

Always implement pagination for list endpoints:

```typescript
@Get()
async findAll(
  @Query('page') page = 1,
  @Query('limit') limit = 20,
  @Query('sort', OrderByPipe) orderBy?: Pipes.Order,
) {
  const [data, total] = await Promise.all([
    this.prisma.product.findMany({
      orderBy,
      take: limit,
      skip: (page - 1) * limit,
    }),
    this.prisma.product.count(),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

### 2. Selective Includes

```typescript
// ✅ Good - Limit included records
include: {
  reviews: {
    take: 5,
    orderBy: { createdAt: 'desc' },
    where: { rating: { gte: 4 } },
  },
}

// ❌ Bad - Include all records
include: {
  reviews: true, // Could be thousands!
}
```

### 3. Database Indexes

```prisma
model Product {
  id          String   @id
  name        String
  price       Decimal
  categoryId  String
  createdAt   DateTime
  
  category    Category @relation(fields: [categoryId], references: [id])
  
  // Add indexes for sorting
  @@index([name])
  @@index([price])
  @@index([createdAt])
  @@index([categoryId])
  
  // Composite indexes for common queries
  @@index([categoryId, price])
}
```

---

## Related Documentation

- [📖 WherePipe - Filtering](./WHERE_PIPE.md)
- [📖 AggregatePipe - Aggregations](./AGGREGATE_PIPE.md)
- [📖 Best Practices](./BEST_PRACTICES.md)
- [📖 API Reference](./API.md)

---

[⬅️ Back to Main Documentation](../README.md)