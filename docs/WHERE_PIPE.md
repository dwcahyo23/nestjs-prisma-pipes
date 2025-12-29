# WherePipe - Complete Documentation

Transform query strings into Prisma `where` clauses with advanced filtering, type casting, field-to-field comparison, and comprehensive NULL handling.

---

## 📖 Table of Contents

- [Overview](#overview)
- [Basic Usage](#basic-usage)
- [Operators](#operators)
- [Type Casting](#type-casting)
  - [Integer, Float, String, Boolean](#basic-types)
  - [Date & DateTime](#date--datetime)
  - [Array](#array)
  - [Field Reference](#field-reference)
  - [NULL Handling](#null-handling)
- [Field-to-Field Comparison](#field-to-field-comparison)
- [Nested Relations](#nested-relations)
- [Multiple Conditions](#multiple-conditions)
- [Advanced Examples](#advanced-examples)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)
- [Common Issues](#common-issues)

---

## Overview

WherePipe transforms URL query strings into Prisma-compatible `where` objects, supporting:

- ✅ 15+ filter operators
- ✅ 9 type casting functions (including comprehensive null handling)
- ✅ Field-to-field comparison
- ✅ Nested relation filtering
- ✅ Timezone-aware dates
- ✅ Multiple conditions with AND/OR logic
- ✅ NULL and NOT NULL checks (Prisma-compliant)

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

# NULL check
GET /products?filter=categoryId:null()

# NOT NULL check
GET /products?filter=categoryId:not+null()
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

### Basic Types

#### Integer - `int()`

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

#### Float - `float()`

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

#### String - `string()`

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

#### Boolean - `bool()` or `boolean()`

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

---

### Date & DateTime

#### Date - `date()` or `datetime()`

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

---

### Array

#### Array - `array()`

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

---

### Field Reference

#### Field Reference - `field()`

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

### NULL Handling

#### Overview

WherePipe provides comprehensive NULL handling following official [Prisma conventions](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/null-and-undefined).

**Key Principle:** According to Prisma documentation, both direct assignment and explicit equals are valid:

```typescript
// Both are valid in Prisma:
{ field: null }                  // Direct assignment
{ field: { equals: null } }      // Explicit equals

// Both generate: WHERE field IS NULL
```

#### WherePipe NULL Syntax

**🔒 Strict Rule:** Always use `null()` function format (never plain `null`)

```bash
# ✅ CORRECT - Function format
field: null()

# ❌ INCORRECT - Plain null (will throw error)
field: null
```

#### Quick Reference

| Query | Prisma Output | Description |
|-------|---------------|-------------|
| `field: null()` | `{ field: null }` | Field is NULL (direct assignment) |
| `field: equals null()` | `{ field: { equals: null } }` | Field is NULL (explicit) |
| `field: not null()` | `{ field: { not: null } }` | Field is NOT NULL |

#### Simple Field NULL Checks

**Check if Field is NULL:**

```bash
# Products without category
GET /products?filter=categoryId:null()

# Users without phone number
GET /users?filter=phone:null()

# Orders without tracking
GET /orders?filter=trackingNumber:null()
```

**Prisma Output:**
```typescript
{
  categoryId: null,      // Direct assignment (default)
  phone: null,
  trackingNumber: null
}
```

**Check if Field is NOT NULL:**

```bash
# Products WITH category
GET /products?filter=categoryId:not+null()

# Users WITH phone number
GET /users?filter=phone:not+null()
```

**Prisma Output:**
```typescript
{
  categoryId: { not: null },
  phone: { not: null }
}
```

**Explicit Equals NULL:**

```bash
# Explicit NULL check (same result as direct)
GET /products?filter=categoryId:equals+null()
```

**Prisma Output:**
```typescript
{
  categoryId: { equals: null }
}
```

#### Relationship NULL Checks

**Important Distinction:**

Prisma uses **different operators** for scalar fields vs relationships:

| Type | NULL Check | NOT NULL Check |
|------|------------|----------------|
| **Scalar Field** (e.g., `categoryId`) | `field: null` or `{ equals: null }` | `{ not: null }` |
| **Relationship** (e.g., `category`) | `{ is: null }` | `{ isNot: null }` |

**Why the difference?**
- Scalar fields use standard operators: `equals`, `not`
- Relationships use special operators: `is`, `isNot`

**Examples:**

```bash
# ❌ WRONG - Using 'not' on relationship
GET /schedules?filter=hseAparResult:not+null()
# Error: Unknown argument `not`. Did you mean `is`?

# ✅ CORRECT - Using 'isNot' for relationship
# WherePipe automatically detects and converts:
GET /schedules?filter=hseAparResult:not+null()
# → { hseAparResult: { isNot: null } }

# ✅ CORRECT - Check if relationship exists
GET /schedules?filter=hseAparResult:null()
# → { hseAparResult: { is: null } }

# ✅ CORRECT - Scalar field (foreign key)
GET /schedules?filter=scheduleId:null()
# → { scheduleId: null }

GET /schedules?filter=scheduleId:not+null()
# → { scheduleId: { not: null } }
```

**WherePipe Smart Detection:**

WherePipe automatically detects whether a field is a relationship or scalar:

```bash
# Relationships (auto-detected by field name not ending with 'Id')
hseAparResult:null()      → { hseAparResult: { is: null } }
hseAparResult:not+null()  → { hseAparResult: { isNot: null } }
category:null()           → { category: { is: null } }
profile:not+null()        → { profile: { isNot: null } }

# Scalar Fields (foreign keys, regular fields)
scheduleId:null()         → { scheduleId: null }
categoryId:not+null()     → { categoryId: { not: null } }
email:null()              → { email: null }
```

**Schema Reference:**

```prisma
model HseAparSchedule {
  id              String          @id
  
  // ✅ Scalar field - uses 'not'
  scheduleId      String?
  
  // ✅ Relationship - uses 'isNot'
  hseAparResult   HseAparResult?
}
```

**Common Patterns:**

```bash
# 1. Check if one-to-one relationship is NULL
GET /schedules?filter=hseAparResult:null()
# → Schedules WITHOUT results

# 2. Check if one-to-one relationship EXISTS
GET /schedules?filter=hseAparResult:not+null()
# → Schedules WITH results

# 3. Combine relationship and scalar NULL checks
GET /schedules?filter=hseAparResult:null(),isActive:bool(true)
# → Active schedules without results
```

#### Many Relationship NULL Checks

```bash
# Products with SOME reviews that have NULL comment
GET /products?filter=reviews.some.comment:null()

# Products with NO reviews that have NULL comment
GET /products?filter=reviews.none.comment:null()

# Products where EVERY review has NULL rating
GET /products?filter=reviews.every.rating:null()
```

**Prisma Output:**
```typescript
{
  reviews: {
    some: { comment: null },
    none: { comment: null },
    every: { rating: null }
  }
}
```

#### Common NULL Patterns

**1. Incomplete Data Checks:**

```bash
# Users with email but no phone
GET /users?filter=email:not+null(),phone:null()

# Products with name but no description
GET /products?filter=name:not+null(),description:null()
```

**2. Optional Relations:**

```bash
# Products without category
GET /products?filter=category:null()

# Orders without tracking
GET /orders?filter=trackingNumber:null()
```

**3. Combining with Other Filters:**

```bash
# Active products without category
GET /products?filter=active:bool(true),categoryId:null()

# Recent orders without tracking
GET /orders?filter=createdAt:gte+date(2025-12-01),trackingNumber:null()

# Users with verified email but no phone
GET /users?filter=emailVerified:bool(true),email:not+null(),phone:null()
```

**4. Complex Relationship Checks:**

```bash
# Products with category but category has no description
GET /products?filter=category:not+null(),category.description:null()

# Orders with customer but customer has no phone
GET /orders?filter=customer:not+null(),customer.phone:null()
```

#### NULL Decision Tree

```
┌─────────────────────────────────────┐
│ What are you checking for NULL?    │
└─────────────────────────────────────┘
                │
        ┌───────┴───────────┐
        │                   │
    ┌───▼────────┐    ┌─────▼─────────┐
    │Scalar Field│    │Relationship   │
    │(ends in Id)│    │(no Id suffix) │
    └───┬────────┘    └─────┬─────────┘
        │                   │
        │                   │
┌───────▼─────────┐  ┌──────▼────────────────┐
│categoryId:null()│  │category:null()        │
│                 │  │hseAparResult:null()   │
│Uses standard    │  │                       │
│operators:       │  │Uses relationship ops: │
│- null           │  │- { is: null }         │
│- { not: null }  │  │- { isNot: null }      │
└─────────────────┘  └───────────────────────┘
                            │
                ┌───────────▼──────────────┐
                │Field inside relationship?│
                └───────────┬──────────────┘
                            │
                    ┌───────┴────────┐
                    │                │
            ┌───────▼──────┐  ┌──────▼────────┐
            │category.name:│  │reviews.some.  │
            │null()        │  │comment:null() │
            │              │  │               │
            │Uses standard │  │Uses standard  │
            │null operator │  │null operator  │
            └──────────────┘  └───────────────┘
```

#### NULL Error Handling

WherePipe provides clear error messages for invalid NULL formats:

```typescript
// ❌ Invalid: plain "null" without ()
GET /products?filter=categoryId:null

// Error Response:
{
  "statusCode": 400,
  "message": "Invalid null format in \"categoryId\". Use null() not null. Examples: \"field: null()\" or \"field: not null()\""
}
```

**Common Mistakes:**

| Mistake | Error | Solution |
|---------|-------|----------|
| Using `null` | Invalid format | Use `null()` |
| `null(value)` | Must be empty | Use `null()` |
| `NULL()` | Not recognized | Use lowercase `null()` |

#### NULL Schema Requirements

For NULL checks to work, fields must be nullable in Prisma schema:

```prisma
model Product {
  id          String    @id @default(cuid())
  name        String
  
  // ✅ Nullable fields (can use null())
  categoryId  String?   // Optional foreign key
  description String?   // Optional field
  deletedAt   DateTime? // Soft delete
  
  // ✅ Optional relation
  category    Category? @relation(fields: [categoryId], references: [id])
  
  // ❌ NOT nullable (null() will cause error)
  // price       Decimal   // Required field
  // createdAt   DateTime  // Required field
}
```

#### NULL Best Practices

**1. Always use `null()` function:**
```bash
# ✅ Good
GET /products?filter=categoryId:null()

# ❌ Bad
GET /products?filter=categoryId:null
```

**2. Be explicit about intent:**
```bash
# Check foreign key
categoryId:null()

# Check relationship
category:null()

# Check field in relationship
category.name:null()
```

**3. Use appropriate format:**
```bash
# Direct assignment (simpler)
field:null()

# Explicit equals (more verbose)
field:equals+null()

# NOT NULL
field:not+null()
```

**4. Combine logically:**
```bash
# Clear, readable filters
GET /users?filter=email:not+null(),emailVerified:bool(true),phone:null()
```

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

# Products where category name is NULL
GET /products?filter=category.name:null()
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

# Products with at least one review that has no comment
GET /products?filter=reviews.some.comment:null()
```

**Prisma output:**
```typescript
{
  reviews: {
    some: { rating: { equals: 5 } },
    every: { approved: { equals: true } },
    none: { status: 'pending' },
    some: { comment: null }
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

# Products with reviews that have no reply
GET /products?filter=reviews.some.reply:null()
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

# Active products with category but no description
GET /products?filter=active:bool(true),categoryId:not+null(),description:null()
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
# Active electronics products priced $100-$500, created in last 30 days, with tracking
GET /products?filter=active:equals+bool(true),category:electronics,price:gte+int(100),price:lte+int(500),createdAt:gte+date(2025-11-01),trackingNumber:not+null()
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

# Products without category
GET /products/search?filter=categoryId:null()

# Products with description
GET /products/search?filter=description:not+null()
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

# Products without assigned warehouse
GET /inventory/low-stock?filter=warehouseId:null()
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

# Orders without tracking number
GET /orders?filter=trackingNumber:null()

# Completed orders with tracking
GET /orders?filter=status:completed,trackingNumber:not+null()
```

### User Management

```typescript
@Controller('users')
export class UserController {
  @Get('incomplete-profiles')
  async getIncompleteProfiles(@Query('filter', WherePipe) where?: Pipes.Where) {
    return this.prisma.user.findMany({
      where,
      select: { id: true, email: true, phone: true, address: true },
    });
  }
}
```

**Requests:**
```bash
# Users with email but no phone
GET /users/incomplete-profiles?filter=email:not+null(),phone:null()

# Users without address
GET /users/incomplete-profiles?filter=address:null()

# Active users without phone verification
GET /users/incomplete-profiles?filter=active:bool(true),phoneVerified:null()
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
- `type` - Type casting function (int, date, string, null, etc.)
- `value` - The value to filter by (omitted for null())

**Examples:**
```
price:gte+int(100)
name:contains+string(laptop)
createdAt:gte+date(2025-01-01)
category.name:electronics
qty:lte+field(minStock)
categoryId:null()
email:not+null()
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

### 2. Use Explicit NULL Checks

```bash
# ✅ Good - Explicit null check
GET /products?filter=categoryId:null()

# ✅ Good - Explicit not null check
GET /products?filter=categoryId:not+null()

# ❌ Avoid - Invalid format
GET /products?filter=categoryId:null
```

### 3. Be Clear About NULL Intent

```bash
# ✅ Good - Check foreign key
GET /products?filter=categoryId:null()

# ✅ Good - Check relationship
GET /products?filter=category:null()

# ✅ Good - Check field in relationship
GET /products?filter=category.name:null()
```

### 4. Configure Timezone

```typescript
// ✅ Good - Configure once at startup
configurePipesTimezone({ offset: '+07:00' });

// ❌ Bad - No timezone configuration (defaults to UTC)
```

### 5. Use Field References in Service Layer

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

### 6. Validate Input

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

### 7. Use Indexes

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

### 8. Handle NULL in Optional Relations

```prisma
// ✅ Good - Make optional relations nullable
model Product {
  id         String    @id
  categoryId String?   // Nullable
  category   Category? @relation(fields: [categoryId], references: [id])
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

### Issue 4: NULL Filter Error

**Problem:**
```bash
GET /products?filter=categoryId:null
# Error: Invalid null format
```

**Solution:**
```bash
# Use null() function format
GET /products?filter=categoryId:null()
```

### Issue 5: NULL on Non-Nullable Field

**Problem:**
```bash
GET /products?filter=id:null()
# Error: id cannot be null
```

**Solution:**
```prisma
// Ensure field is nullable in schema
model Product {
  id         String  @id
  categoryId String? // ✅ Make nullable with ?
}
```

---

## Type Casting Reference

| Type | Syntax | Example | Output |
|------|--------|---------|--------|
| Integer | `int(value)` | `int(100)` | `100` |
| Float | `float(value)` | `float(10.5)` | `10.5` |
| String | `string(value)` | `string(text)` | `"text"` |
| Boolean | `bool(value)` | `bool(true)` | `true` |
| Date | `date(value)` | `date(2025-01-01)` | `"2025-01-01T00:00:00+07:00"` |
| DateTime | `datetime(value)` | `datetime(2025-01-01T10:00:00)` | `"2025-01-01T10:00:00+07:00"` |
| Array | `array(v1,v2)` | `array(a,b,c)` | `["a","b","c"]` |
| Field | `field(name)` | `field(minStock)` | `{ _ref: "minStock", _isFieldRef: true }` |
| Null | `null()` | `null()` | `null` |

---

## Quick Reference Cheat Sheet

### Basic Filters

```bash
# Exact match
field:value

# Comparison
field:gte+int(100)
field:lt+float(50.5)

# String operations
field:contains+string(text)
field:startsWith+string(prefix)
field:endsWith+string(suffix)

# Boolean
field:bool(true)
field:equals+bool(false)

# Date
field:gte+date(2025-01-01)
field:lte+datetime(2025-12-31T23:59:59)

# Array
field:in+array(value1,value2)
field:has+string(value)
```

### NULL Filters

```bash
# Check NULL
field:null()                    # Direct assignment
field:equals+null()             # Explicit equals

# Check NOT NULL
field:not+null()

# Relationship NULL
relation:null()                 # Check if relationship exists
relation.field:null()           # Check field in relationship

# Many relationship NULL
relation.some.field:null()
relation.every.field:null()
relation.none.field:null()
```

### Relation Filters

```bash
# One-to-one
relation.field:value

# One-to-many
relation.some.field:value
relation.every.field:value
relation.none.field:value

# Deep nesting
relation.some.nested.field:value
```

### Field References

```bash
# Same table
field:lte+field(otherField)

# Parent scope
nested.some.field:lte+field($parent.parentField)

# Root scope
deep.nested.field:lte+field($root.rootField)
```

### Multiple Conditions

```bash
# AND (comma-separated)
field1:value1,field2:value2

# Date range
field:gte+date(2025-01-01),field:lte+date(2025-12-31)

# Complex
active:bool(true),price:gte+int(100),categoryId:not+null()
```

---

## Related Documentation

- [📖 Field Reference Complete Guide](./FIELD_REFERENCE.md)
- [📖 Timezone Configuration](./TIMEZONE.md)
- [📖 Best Practices](./BEST_PRACTICES.md)
- [📖 API Reference](./API.md)
- [📖 Prisma NULL Documentation](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/null-and-undefined)

---

[⬅️ Back to Main Documentation](../README.md)