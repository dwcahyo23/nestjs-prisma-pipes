# WherePipe - Complete Documentation

Transform query strings into Prisma `where` clauses with advanced filtering, type casting, and field-to-field comparison.

---

## 📖 Table of Contents

- [Overview](#overview)
- [Basic Usage](#basic-usage)
- [Operators](#operators)
- [Type Casting](#type-casting)
- [Field-to-Field Comparison](#field-to-field-comparison)
- [Nested Relations](#nested-relations)
- [Multiple Conditions](#multiple-conditions)
- [Advanced Examples](#advanced-examples)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)

---

## Overview

WherePipe transforms URL query strings into Prisma-compatible `where` objects, supporting:

- ✅ 15+ filter operators
- ✅ 8 type casting functions
- ✅ Field-to-field comparison
- ✅ Nested relation filtering
- ✅ Timezone-aware dates
- ✅ Multiple conditions with AND/OR logic

---

## Basic Usage

### Controller Setup

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { WherePipe, Pipes } from '@dwcahyo/nestjs-prisma-pipes';

@Controller('products')
export class ProductController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(@Query('filter', WherePipe) where?: Pipes.Where) {
    return this.prisma.product.findMany({ where });
  }
}
```

### Simple Queries

```bash
# Exact match
GET /products?filter=category:electronics

# Comparison
GET /products?filter=price:gte+int(100)

# Text search
GET /products?filter=name:contains+string(laptop)

# Boolean
GET /products?filter=active:equals+bool(true)
```

---

## Operators

### Comparison Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `lt` | Less than | `price:lt+int(100)` |
| `lte` | Less than or equal | `price:lte+int(100)` |
| `gt` | Greater than | `price:gt+int(100)` |
| `gte` | Greater than or equal | `price:gte+int(100)` |
| `equals` | Exact match | `status:equals+string(active)` |
| `not` | Not equal | `category:not+string(archived)` |

**Example:**
```bash
# Products priced between $100 and $500
GET /products?filter=price:gte+int(100),price:lte+int(500)
```

### String Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `contains` | Contains substring | `name:contains+string(laptop)` |
| `startsWith` | Starts with | `sku:startsWith+string(PROD)` |
| `endsWith` | Ends with | `email:endsWith+string(@gmail.com)` |

**Example:**
```bash
# Find all products with "laptop" in name
GET /products?filter=name:contains+string(laptop)

# Find all SKUs starting with PROD
GET /products?filter=sku:startsWith+string(PROD)
```

### Array Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `in` | Value in array | `status:in+array(active,pending)` |
| `has` | Array has value | `tags:has+string(featured)` |
| `hasEvery` | Array has all values | `tags:hasEvery+array(sale,new)` |
| `hasSome` | Array has any value | `tags:hasSome+array(sale,featured)` |

**Example:**
```bash
# Products with status active OR pending
GET /products?filter=status:in+array(active,pending)

# Products tagged as "featured"
GET /products?filter=tags:has+string(featured)
```

### Relation Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `is` | One-to-one match | `category.is.name:electronics` |
| `some` | At least one match | `reviews.some.rating:gte+int(4)` |
| `every` | All must match | `items.every.status:completed` |
| `none` | None must match | `tags.none.name:deprecated` |

**Example:**
```bash
# Products with at least one 4+ star review
GET /products?filter=reviews.some.rating:gte+int(4)

# Products where all items are completed
GET /products?filter=items.every.status:completed
```

---

## Type Casting

### Integer - `int()`

Parse strings to integers.

```bash
# Price greater than or equal to 100
GET /products?filter=price:gte+int(100)

# Stock less than 50
GET /products?filter=stock:lt+int(50)
```

**Prisma output:**
```typescript
{
  price: { gte: 100 },
  stock: { lt: 50 }
}
```

### Float - `float()`

Parse strings to floating-point numbers.

```bash
# Discount greater than 10.5%
GET /products?filter=discount:gt+float(10.5)

# Weight less than 2.5kg
GET /products?filter=weight:lte+float(2.5)
```

**Prisma output:**
```typescript
{
  discount: { gt: 10.5 },
  weight: { lte: 2.5 }
}
```

### String - `string()`

Explicit string values (useful for values containing special characters).

```bash
# Category equals "electronics"
GET /products?filter=category:equals+string(electronics)

# Name contains "laptop"
GET /products?filter=name:contains+string(laptop)
```

**Prisma output:**
```typescript
{
  category: { equals: 'electronics' },
  name: { contains: 'laptop' }
}
```

### Boolean - `bool()` or `boolean()`

Parse boolean values.

```bash
# Active products only
GET /products?filter=active:equals+bool(true)

# Not featured
GET /products?filter=featured:equals+bool(false)
```

**Prisma output:**
```typescript
{
  active: { equals: true },
  featured: { equals: false }
}
```

### Date - `date()` or `datetime()`

Parse date strings with timezone support.

```bash
# Created after January 1, 2025
GET /products?filter=createdAt:gte+date(2025-01-01)

# Created before December 31, 2025
GET /products?filter=createdAt:lte+date(2025-12-31)

# Specific datetime
GET /products?filter=updatedAt:gte+datetime(2025-01-01T10:30:00)
```

**Prisma output (with timezone +07:00):**
```typescript
{
  createdAt: { 
    gte: '2025-01-01T00:00:00+07:00' // Respects configured timezone
  },
  updatedAt: {
    gte: '2025-01-01T10:30:00+07:00'
  }
}
```

**Important:** Configure timezone at app startup:
```typescript
import { configurePipesTimezone } from '@dwcahyo/nestjs-prisma-pipes';

configurePipesTimezone({ offset: '+07:00', name: 'Asia/Jakarta' });
```

### Array - `array()`

Parse comma-separated values into arrays.

```bash
# Status is active OR pending
GET /products?filter=status:in+array(active,pending)

# Tags has "sale" OR "featured"
GET /products?filter=tags:hasSome+array(sale,featured)
```

**Prisma output:**
```typescript
{
  status: { in: ['active', 'pending'] },
  tags: { hasSome: ['sale', 'featured'] }
}
```

### Field Reference - `field()`

Compare with another field in the same table.

```bash
# Quantity less than recommended quantity
GET /products?filter=qty:lte+field(recQty)

# Shipping cost greater than product cost
GET /orders?filter=shippingCost:gt+field(productCost)
```

**Service implementation required:**
```typescript
import { convertWhereClause } from '@dwcahyo/nestjs-prisma-pipes';

async findAll(where?: Pipes.Where) {
  const resolved = convertWhereClause(where, this.prisma, 'product');
  return this.prisma.product.findMany({ where: resolved });
}
```

**Prisma output:**
```typescript
{
  qty: { lte: prisma.product.fields.recQty }
}
```

[📖 Read more about Field References](./FIELD_REFERENCE.md)

---

## Field-to-Field Comparison

Compare fields within the same row or across relations.

### Same Table Comparison

```bash
# Products where current quantity is below minimum stock
GET /products?filter=qty:lte+field(minStock)

# Orders where actual cost exceeded budget
GET /orders?filter=actualCost:gt+field(budget)
```

### Parent Scope Comparison

Compare with parent table field in nested relations:

```bash
# Workorders where user had machine BEFORE workorder date
GET /workorders?filter=mesin.some.userMesin.some.createdAt:lte+field($parent.createdAt)
```

**Explanation:**
- `$parent.createdAt` refers to `workorder.createdAt` (parent table)
- Ensures user had machine assignment before workorder was created

### Root Scope Comparison

Compare with top-level field in deeply nested queries:

```bash
# Order items where price exceeds order's max budget
GET /orders?filter=items.some.price:lte+field($root.maxBudget)
```

**Explanation:**
- `$root.maxBudget` refers to `order.maxBudget` (root/top-level table)
- Useful in deep nesting scenarios

### Service Implementation

```typescript
import { 
  convertWhereClause,
  createFieldRefConverter 
} from '@dwcahyo/nestjs-prisma-pipes';

@Injectable()
export class ProductService {
  // Method 1: Direct conversion
  async findWithFieldRefs(where?: Pipes.Where) {
    const resolved = convertWhereClause(where, this.prisma, 'product');
    return this.prisma.product.findMany({ where: resolved });
  }

  // Method 2: Reusable converter (better performance)
  private convertWhere = createFieldRefConverter(this.prisma, 'product');

  async findAll(where?: Pipes.Where) {
    const resolved = this.convertWhere(where);
    return this.prisma.product.findMany({ where: resolved });
  }
}
```

[📖 Complete Field Reference Guide](./FIELD_REFERENCE.md)

---

## Nested Relations

Filter by related table fields using dot notation.

### One-to-One Relations

```bash
# Products where category name is "electronics"
GET /products?filter=category.name:electronics

# Users with premium profile
GET /users?filter=profile.tier:premium
```

**Prisma output:**
```typescript
{
  category: {
    name: 'electronics'
  },
  profile: {
    tier: 'premium'
  }
}
```

### One-to-Many Relations

Use `some`, `every`, or `none`:

```bash
# Products with at least one 5-star review
GET /products?filter=reviews.some.rating:equals+int(5)

# Products where all reviews are approved
GET /products?filter=reviews.every.approved:equals+bool(true)

# Products with no pending reviews
GET /products?filter=reviews.none.status:pending
```

**Prisma output:**
```typescript
{
  reviews: {
    some: { rating: { equals: 5 } },
    every: { approved: { equals: true } },
    none: { status: 'pending' }
  }
}
```

### Many-to-Many Relations

```bash
# Products tagged as "featured"
GET /products?filter=tags.some.name:featured

# Products in both "sale" and "new" categories
GET /products?filter=categories.some.name:sale,categories.some.name:new
```

### Deep Nesting

```bash
# Products with reviews by verified users
GET /products?filter=reviews.some.user.verified:equals+bool(true)

# Orders from warehouses in Asia region
GET /orders?filter=items.some.product.warehouse.region:asia
```

**Prisma output:**
```typescript
{
  reviews: {
    some: {
      user: {
        verified: { equals: true }
      }
    }
  },
  items: {
    some: {
      product: {
        warehouse: {
          region: 'asia'
        }
      }
    }
  }
}
```

---

## Multiple Conditions

### AND Logic (Default)

Comma-separated conditions are combined with AND:

```bash
# Products that are active AND in electronics category AND price >= 100
GET /products?filter=active:equals+bool(true),category:electronics,price:gte+int(100)
```

**Prisma output:**
```typescript
{
  active: { equals: true },
  category: 'electronics',
  price: { gte: 100 }
}
```

### Date Ranges

Multiple operators on the same field are merged:

```bash
# Products created in November 2025
GET /products?filter=createdAt:gte+date(2025-11-01),createdAt:lte+date(2025-11-30)
```

**Prisma output:**
```typescript
{
  createdAt: {
    gte: '2025-11-01T00:00:00+07:00',
    lte: '2025-11-30T23:59:59+07:00'
  }
}
```

### Complex Filtering

```bash
# Active electronics products priced $100-$500, created in last 30 days
GET /products?filter=active:equals+bool(true),category:electronics,price:gte+int(100),price:lte+int(500),createdAt:gte+date(2025-11-01)
```

---

## Advanced Examples

### E-Commerce Product Search

```typescript
@Controller('products')
export class ProductController {
  @Get('search')
  async search(
    @Query('filter', WherePipe) where?: Pipes.Where,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.prisma.product.findMany({
      where,
      take: limit,
      skip: (page - 1) * limit,
      include: { category: true, reviews: true },
    });
  }
}
```

**Requests:**
```bash
# Search by category and price range
GET /products/search?filter=category.name:electronics,price:gte+int(100),price:lte+int(500)

# Search by name and rating
GET /products/search?filter=name:contains+string(laptop),reviews.some.rating:gte+int(4)

# Active products only
GET /products/search?filter=active:equals+bool(true)
```

### Inventory Management

```typescript
@Controller('inventory')
export class InventoryController {
  @Get('low-stock')
  async getLowStock(@Query('filter', WherePipe) where?: Pipes.Where) {
    const resolved = convertWhereClause(where, this.prisma, 'product');
    
    return this.prisma.product.findMany({
      where: resolved,
      orderBy: { qty: 'asc' },
      include: { warehouse: true },
    });
  }
}
```

**Requests:**
```bash
# Products below minimum stock level
GET /inventory/low-stock?filter=qty:lte+field(minStock)

# Critical stock in specific warehouse
GET /inventory/low-stock?filter=qty:lt+int(10),warehouse.region:asia
```

### Order Management

```typescript
@Controller('orders')
export class OrderController {
  @Get()
  async findOrders(@Query('filter', WherePipe) where?: Pipes.Where) {
    return this.prisma.order.findMany({
      where,
      include: { customer: true, items: true },
    });
  }
}
```

**Requests:**
```bash
# Pending orders from last 7 days
GET /orders?filter=status:pending,createdAt:gte+date(2025-11-24)

# High-value orders
GET /orders?filter=total:gte+int(1000)

# Orders with specific items
GET /orders?filter=items.some.productId:equals+string(prod-123)
```

---

## API Reference

### Transform Method

```typescript
transform(value: string): Pipes.Where | undefined
```

**Parameters:**
- `value` - Query string to parse

**Returns:**
- Prisma `where` object or `undefined` if empty

**Throws:**
- `BadRequestException` - If query format is invalid

### Query String Syntax

```
field: [operator] [type](value)
```

**Components:**
- `field` - Field name (supports dot notation for relations)
- `operator` - Optional filter operator (lt, gte, contains, etc.)
- `type` - Type casting function (int, date, string, etc.)
- `value` - The value to filter by

**Examples:**
```
price:gte+int(100)
name:contains+string(laptop)
createdAt:gte+date(2025-01-01)
category.name:electronics
qty:lte+field(minStock)
```

---

## Best Practices

### 1. Always Use Type Casting

```bash
# ✅ Good - Explicit type
GET /products?filter=price:gte+int(100)

# ❌ Bad - Implicit type (may cause issues)
GET /products?filter=price:gte+100
```

### 2. Configure Timezone

```typescript
// ✅ Good - Configure once at startup
configurePipesTimezone({ offset: '+07:00' });

// ❌ Bad - No timezone configuration (defaults to UTC)
```

### 3. Use Field References in Service Layer

```typescript
// ✅ Good - Proper field reference conversion
async findAll(where?: Pipes.Where) {
  const resolved = convertWhereClause(where, this.prisma, 'product');
  return this.prisma.product.findMany({ where: resolved });
}

// ❌ Bad - Direct use without conversion (won't work)
async findAll(where?: Pipes.Where) {
  return this.prisma.product.findMany({ where });
}
```

### 4. Validate Input

```typescript
// ✅ Good - Add validation
@Get()
async findAll(
  @Query('filter', WherePipe) where?: Pipes.Where,
  @Query('page', ParseIntPipe) page = 1,
) {
  if (page < 1) throw new BadRequestException('Invalid page');
  // ...
}
```

### 5. Use Indexes

```prisma
// ✅ Good - Add indexes for frequently filtered fields
model Product {
  id        String   @id
  price     Decimal
  category  String
  createdAt DateTime
  
  @@index([price])
  @@index([category])
  @@index([createdAt])
}
```

---

## Common Issues

### Issue 1: Date Filter Not Working

**Problem:**
```bash
GET /products?filter=createdAt:gte+date(2025-11-01)
# Returns unexpected results
```

**Solution:**
```typescript
// Configure timezone at app startup
configurePipesTimezone({ offset: '+07:00' });
```

### Issue 2: Field Reference Not Resolved

**Problem:**
```bash
GET /products?filter=qty:lte+field(minStock)
# Error or field reference not working
```

**Solution:**
```typescript
// Convert field references in service
import { convertWhereClause } from '@dwcahyo/nestjs-prisma-pipes';

const resolved = convertWhereClause(where, this.prisma, 'product');
```

### Issue 3: Nested Filter Not Working

**Problem:**
```bash
GET /products?filter=category.name:electronics
# No results
```

**Solution:**
```typescript
// Ensure relation exists in Prisma schema
model Product {
  category   Category @relation(fields: [categoryId], references: [id])
  categoryId String
}
```

---

## Related Documentation

- [📖 Field Reference Complete Guide](./FIELD_REFERENCE.md)
- [📖 Timezone Configuration](./TIMEZONE.md)
- [📖 Best Practices](./BEST_PRACTICES.md)
- [📖 API Reference](./API.md)

---

[⬅️ Back to Main Documentation](../README.md)