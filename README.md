# 🛠 @dwcahyo/nestjs-prisma-pipes

**NestJS + Prisma query pipes**  
Parse query strings (`where`, `orderBy`, `select`, `include`) directly into **Prisma-ready objects**.  
No more manual parsing — just pass query params, and you're good to go 🚀

---

## 📦 Installation

```bash
npm install --save @dwcahyo/nestjs-prisma-pipes
```

---

# 📜 Changelog

## [2.3.0]

### Added
- **AggregatePipe** — Parse URL query into Prisma `aggregate()` options
  Supports: `_count`, `_sum`, `_avg`, `_min`, `_max`

## [2.2.1]

### Added
- **Field-to-field helper** --Helper to returns a special format for field references that must be converted in service layer before passing to Prima

## [2.2.0]

### Added
- [Internal Documentation Where Pipe](README_WHERE.md)
- **Field-to-field comparison** - Compare values between columns in the same table! Perfect for inventory management, date validation, and business logic filters.
  
  Example:
  ```url
  ?where=qty:lte field(recQty),startDate:lt field(endDate)
  ```

## [2.1.0]

### Added
- **Date range support on the same column** - Now you can apply multiple operators (e.g., `gte` and `lte`) on the same field for powerful date filtering.
  
  Example:
  ```url
  ?where=createdAt:gte date(2024-01-01),createdAt:lte date(2024-12-31)
  ```

### Improved
- **Refactored WherePipe** for better scalability, maintainability, and type safety
- Enhanced type parsers with registry pattern for easier extensibility
- Improved error handling and validation
- Better support for merging multiple operators on the same field

## [2.0.4]

### Added
- Support for **nested `orderBy`** (multi-level deep ordering).
  
  Example:
  ```url
  ?orderBy=user.profile.name:asc,posts.comments.createdAt:desc
  ```

---

## 🚀 Quick Start

Use pipes in your controller to transform query parameters automatically:

```ts
import { Controller, Get, Query } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import {
  Pipes,
  WherePipe,
  OrderByPipe,
  SelectPipe,
  IncludePipe,
} from "@dwcahyo/nestjs-prisma-pipes";

@Controller("users")
export class UserController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(
    @Query("where", WherePipe) where?: Pipes.Where,
    @Query("orderBy", OrderByPipe) orderBy?: Pipes.Order,
    @Query("select", SelectPipe) select?: Pipes.Select,
    @Query("include", IncludePipe) include?: Pipes.Include
  ) {
    return this.prisma.user.findMany({ where, orderBy, select, include });
  }
}
```

---

## 🔎 Pipes Overview

| Pipe          | Purpose                                                       |
| ------------- | ------------------------------------------------------------- |
| `WherePipe`   | Parse `where` filters (supports operators & nested relations) |
| `OrderByPipe` | Parse `orderBy` filters (supports deep nesting)               |
| `SelectPipe`  | Pick specific fields to return                                |
| `IncludePipe` | Include relations (with nested `select`)                      |

---

## 1️⃣ WherePipe

Convert query strings into **Prisma `where` objects** with support for operators, nested relations, type casting, and **date ranges on the same column**.

```ts
@Query("where", WherePipe) where?: Pipes.Where
```

---

### 🔧 Supported Operators

| Type       | Operators                                 | Example                                          |
| ---------- | ----------------------------------------- | ------------------------------------------------ |
| Comparison | `equals`, `not`, `lt`, `lte`, `gt`, `gte` | `?where=age:gt int(18)`                          |
| Text       | `contains`, `startsWith`, `endsWith`      | `?where=name:contains string(John)`              |
| Arrays     | `has`, `hasEvery`, `hasSome`, `in`        | `?where=id:in array(int(1),int(2))`              |
| Relations  | `is`, `some`, `every`, `none`             | `?where=posts.some.title:contains string(Hello)` |

---

### 🔢 Supported Value Types

| Type           | Syntax                            | Example                                           |
| -------------- | --------------------------------- | ------------------------------------------------- |
| String         | `string(value)`                   | `string(John)` → `"John"`                         |
| Integer        | `int(value)`                      | `int(42)` → `42`                                  |
| Float          | `float(value)`                    | `float(3.14)` → `3.14`                            |
| Boolean        | `boolean(value)` / `bool(value)`  | `bool(true)` → `true`                             |
| Date           | `date(value)` / `datetime(value)` | `date(2025-01-01)` → `"2025-01-01T00:00:00.000Z"` |
| Array          | `array(type(...))`                | `array(int(1),int(2))` → `[1,2]`                  |
| Field (NEW 🔥) | `field(columnName)`               | `field(recQty)` → Reference to `recQty` column    |

---

### 🧩 Examples

#### 1. Basic Filter

```url
?where=firstName:John
```

```ts
{ firstName: "John" }
```

#### 2. Typed Value

```url
?where=age:int(25)
```

```ts
{ age: 25 }
```

#### 3. Text Search

```url
?where=firstName:contains string(John)
```

```ts
{
  firstName: {
    contains: "John"
  }
}
```

#### 4. Comparison Operator

```url
?where=age:gt int(18)
```

```ts
{
  age: {
    gt: 18
  }
}
```

#### 5. Multiple Conditions

```url
?where=firstName:contains string(John),age:gte int(18)
```

```ts
{
  firstName: {
    contains: "John"
  },
  age: {
    gte: 18
  }
}
```

---

### 🔄 Field-to-Field Comparison

**In v2.2.1**: Compare values between columns in the same table! This is incredibly useful for:
- Inventory management (quantity vs recommended quantity)
- Date validation (start date vs end date)
- Price ranges (min price vs max price)
- Business logic filters (actual vs target values)

#### ⚠️ Important: Service Layer Conversion Required

WherePipe returns a special format for field references that **must be converted** in your service layer before passing to Prisma.

**Step 1: Import the helper**
```typescript
// Copy field-ref-converter.helper.ts to your project
import { convertFieldReferences } from '@dwcahyo/nestjs-prisma-pipes';
```

**Step 2: Use in your service**
```typescript
@Injectable()
export class YourService {
  constructor(private prisma: PrismaService) {}

  async findMany(
    @Query('where', WherePipe) whereFromPipe?: Pipes.Where
  ) {
    // Convert field references before passing to Prisma
    const where = convertFieldReferences(whereFromPipe, this.prisma.yourModel);
    
    return this.prisma.yourModel.findMany({ where });
  }
}
```

#### Basic Field Comparison

**Query:**
```url
?where=qty:lte field(recQty)
```

**Pipe Output:**
```ts
{
  qty: {
    lte: { _ref: "recQty", _isFieldRef: true }
  }
}
```

**After Conversion:**
```ts
{
  qty: {
    lte: prisma.marketingSPB.fields.recQty
  }
}
```

**Full Example:**
```typescript
// Controller
@Get()
async findAll(@Query('where', WherePipe) where?: Pipes.Where) {
  return this.service.findAll(where);
}

// Service
import { convertFieldReferences } from '@dwcahyo/nestjs-prisma-pipes';

async findAll(whereFromPipe: any) {
  const where = convertFieldReferences(whereFromPipe, this.prisma.marketingSPB);
  return this.prisma.marketingSPB.findMany({ where });
}
```

#### Date Field Comparison

```url
?where=startDate:lt field(endDate)
```

```ts
// After conversion
{
  startDate: {
    lt: prisma.event.fields.endDate
  }
}
```

#### Multiple Field Comparisons

```url
?where=qty:lte field(recQty),startDate:lt field(endDate),minPrice:lte field(maxPrice)
```

```ts
// After conversion
{
  qty: {
    lte: prisma.product.fields.recQty
  },
  startDate: {
    lt: prisma.event.fields.endDate
  },
  minPrice: {
    lte: prisma.product.fields.maxPrice
  }
}
```

#### Combined with Other Filters

```url
?where=qty:lte field(recQty),status:string(active),price:gte float(100)
```

```ts
// After conversion
{
  qty: {
    lte: prisma.product.fields.recQty
  },
  status: "active",
  price: {
    gte: 100
  }
}
```

#### Supported Operators for Field Comparison

All comparison operators work with field references:
- `equals` - Field A equals Field B
- `not` - Field A not equals Field B
- `lt` - Field A less than Field B
- `lte` - Field A less than or equal to Field B
- `gt` - Field A greater than Field B
- `gte` - Field A greater than or equal to Field B

#### Helper Function: convertFieldReferences

```typescript
/**
 * field-ref-converter.helper.ts
 */
export function convertFieldReferences(obj: any, modelDelegate: any): any {
  // Recursively converts { _ref: 'fieldName', _isFieldRef: true }
  // to prisma.model.fields.fieldName
  
  // See full implementation in artifacts
}

// Optional: Create a reusable converter
import { createFieldRefConverter } from '@dwcahyo/nestjs-prisma-pipes';

@Injectable()
export class YourService {
  private convertWhere = createFieldRefConverter(this.prisma.yourModel);

  async findMany(whereFromPipe: any) {
    const where = this.convertWhere(whereFromPipe);
    return this.prisma.yourModel.findMany({ where });
  }
}
```

---

### 📅 Date Range Support

**NEW in v2.1.0**: Apply multiple operators on the same column for powerful date filtering!

#### Single Date Filter

```url
?where=createdAt:gte date(2024-01-01T00:00:00Z)
```

```ts
{
  createdAt: {
    gte: "2024-01-01T00:00:00.000Z"
  }
}
```

#### Date Range (Same Column)

```url
?where=createdAt:gte date(2024-01-01T00:00:00Z),createdAt:lte date(2024-12-31T23:59:59Z)
```

```ts
{
  createdAt: {
    gte: "2024-01-01T00:00:00.000Z",
    lte: "2024-12-31T23:59:59.000Z"
  }
}
```

#### Multiple Date Ranges

```url
?where=createdAt:gte date(2024-01-01),createdAt:lte date(2024-12-31),updatedAt:gte date(2024-06-01),updatedAt:lte date(2024-06-30)
```

```ts
{
  createdAt: {
    gte: "2024-01-01T00:00:00.000Z",
    lte: "2024-12-31T00:00:00.000Z"
  },
  updatedAt: {
    gte: "2024-06-01T00:00:00.000Z",
    lte: "2024-06-30T00:00:00.000Z"
  }
}
```

#### Complex Date Query

```url
?where=status:equals string(active),createdAt:gte date(2024-01-01),createdAt:lte date(2024-12-31),publishedAt:not date(2024-06-15)
```

```ts
{
  status: {
    equals: "active"
  },
  createdAt: {
    gte: "2024-01-01T00:00:00.000Z",
    lte: "2024-12-31T00:00:00.000Z"
  },
  publishedAt: {
    not: "2024-06-15T00:00:00.000Z"
  }
}
```

---

### 🔗 Nested Relations

#### Simple Relation Filter

```url
?where=profile.is.verified:bool(true)
```

```ts
{
  profile: {
    is: {
      verified: true
    }
  }
}
```

#### Collection Relation Filter

```url
?where=posts.some.title:contains string(Hello)
```

```ts
{
  posts: {
    some: {
      title: {
        contains: "Hello"
      }
    }
  }
}
```

#### Deep Nested Relations

```url
?where=company.departments.every.employees.some.name:startsWith string(A)
```

```ts
{
  company: {
    departments: {
      every: {
        employees: {
          some: {
            name: {
              startsWith: "A"
            }
          }
        }
      }
    }
  }
}
```

#### Mixed Nested and Flat Filters

```url
?where=status:active,user.is.role:string(admin),createdAt:gte date(2024-01-01)
```

```ts
{
  status: "active",
  user: {
    is: {
      role: "admin"
    }
  },
  createdAt: {
    gte: "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 📦 Array Operations

#### In Array

```url
?where=id:in array(int(1),int(2),int(3))
```

```ts
{
  id: {
    in: [1, 2, 3]
  }
}
```

#### Has Element

```url
?where=tags:has string(urgent)
```

```ts
{
  tags: {
    has: "urgent"
  }
}
```

#### Has Every

```url
?where=tags:hasEvery array(urgent,important)
```

```ts
{
  tags: {
    hasEvery: ["urgent", "important"]
  }
}
```

#### Has Some

```url
?where=categories:hasSome array(int(1),int(2),int(5))
```

```ts
{
  categories: {
    hasSome: [1, 2, 5]
  }
}
```

---

### 🎯 Advanced Real-World Examples

#### 1. E-commerce Product Search

```url
?where=category:string(Electronics),price:gte float(100),price:lte float(500),inStock:bool(true),tags:hasSome array(sale,featured)
```

```ts
{
  category: "Electronics",
  price: {
    gte: 100,
    lte: 500
  },
  inStock: true,
  tags: {
    hasSome: ["sale", "featured"]
  }
}
```

#### 2. Inventory Low Stock Alert

```url
?where=qty:lte field(recQty),status:string(active),lastRestocked:lte date(2024-01-01)
```

```ts
{
  qty: {
    lte: "recQty" // Items where current quantity <= recommended quantity
  },
  status: "active",
  lastRestocked: {
    lte: "2024-01-01T00:00:00.000Z"
  }
}
```

#### 3. User Activity Report

```url
?where=user.is.role:string(admin),createdAt:gte date(2024-01-01),createdAt:lte date(2024-12-31),status:not string(deleted)
```

```ts
{
  user: {
    is: {
      role: "admin"
    }
  },
  createdAt: {
    gte: "2024-01-01T00:00:00.000Z",
    lte: "2024-12-31T23:59:59.000Z"
  },
  status: {
    not: "deleted"
  }
}
```

#### 4. Event Scheduling Validation

```url
?where=startDate:lt field(endDate),status:in array(scheduled,active),capacity:gte field(minParticipants)
```

```ts
{
  startDate: {
    lt: "endDate" // Start date must be before end date
  },
  status: {
    in: ["scheduled", "active"]
  },
  capacity: {
    gte: "minParticipants" // Capacity must meet minimum
  }
}
```

#### 5. Blog Post Search with Relations

```url
?where=title:contains string(NestJS),publishedAt:gte date(2024-01-01),author.is.verified:bool(true),tags:hasEvery array(tutorial,backend),comments.some.rating:gte int(4)
```

```ts
{
  title: {
    contains: "NestJS"
  },
  publishedAt: {
    gte: "2024-01-01T00:00:00.000Z"
  },
  author: {
    is: {
      verified: true
    }
  },
  tags: {
    hasEvery: ["tutorial", "backend"]
  },
  comments: {
    some: {
      rating: {
        gte: 4
      }
    }
  }
}
```

#### 6. Financial Transaction Filter

```url
?where=amount:gte field(minAmount),amount:lte field(maxAmount),transactionDate:gte date(2024-01-01),transactionDate:lte date(2024-12-31),status:string(completed)
```

```ts
{
  amount: {
    gte: "minAmount", // Amount within min-max range
    lte: "maxAmount"
  },
  transactionDate: {
    gte: "2024-01-01T00:00:00.000Z",
    lte: "2024-12-31T23:59:59.000Z"
  },
  status: "completed"
}
```

#### 7. Performance Metrics

```url
?where=actualValue:lt field(targetValue),score:gte int(70),evaluationDate:gte date(2024-01-01)
```

```ts
{
  actualValue: {
    lt: "targetValue" // Find underperforming records
  },
  score: {
    gte: 70
  },
  evaluationDate: {
    gte: "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 💡 Best Practices

1. **Type Your Values**: Always use type wrappers (`int()`, `string()`, `bool()`, etc.) for explicit type conversion
2. **Date Ranges**: Use `gte` and `lte` together for accurate date ranges
3. **Field Comparisons**: Use `field()` wrapper to compare columns within the same table
4. **Relations**: Use `.is` for one-to-one, `.some`/`.every`/`.none` for one-to-many
5. **Arrays**: Use `array()` wrapper with typed values inside: `array(int(1),int(2))`
6. **Complex Queries**: Combine multiple conditions with commas for precise filtering
7. **Nested Fields**: Support nested field references like `field(user.minBalance)`

---

### ⚠️ Important Notes

- Empty or `null` query params return `undefined` (won't break Prisma queries)
- Invalid formats throw `BadRequestException` with clear error messages
- All date values are automatically converted to ISO 8601 format
- Nested properties use dot notation: `user.profile.name`
- Multiple operators on the same field are merged automatically
- Field references (`field()`) compare values between columns at query time
- Field comparisons work with all comparison operators: `lt`, `lte`, `gt`, `gte`, `equals`, `not`

---

### 🔥 Use Cases for Field Comparison

| Scenario                    | Example                                         | Use Case                                      |
| --------------------------- | ----------------------------------------------- | --------------------------------------------- |
| Inventory Management        | `qty:lte field(recQty)`                         | Find items below recommended stock            |
| Date Validation             | `startDate:lt field(endDate)`                   | Validate date ranges                          |
| Price Range Validation      | `minPrice:lte field(maxPrice)`                  | Ensure price logic is correct                 |
| Performance Tracking        | `actualValue:lt field(targetValue)`             | Find underperforming metrics                  |
| Budget Management           | `spent:lte field(budget)`                       | Monitor spending limits                       |
| Capacity Planning           | `currentCapacity:gte field(minRequired)`        | Ensure minimum requirements are met           |
| Time Tracking               | `actualHours:gt field(estimatedHours)`          | Find tasks that exceeded estimates            |
| Quality Control             | `defectRate:lte field(maxAllowedDefects)`       | Filter by quality thresholds                  |

---

## 2️⃣ OrderByPipe

Convert query strings into **Prisma `orderBy` objects**.

```ts
@Query('orderBy', OrderByPipe) orderBy?: Pipes.Order
```

### 🧩 Examples

### Flat Order

```url
?orderBy=createdAt:desc
```

```ts
{
  createdAt: "desc"
}
```

### Nested Order

```url
?orderBy=user.profile.name:asc
```

```ts
{
  user: {
    profile: {
      name: "asc"
    }
  }
}
```

### Multi-Nested Order

```url
?orderBy=user.profile.name:asc,posts.comments.createdAt:desc
```

```ts
{
  user: { profile: { name: 'asc' } },
  posts: { comments: { createdAt: 'desc' } }
}
```

---

## 3️⃣ SelectPipe

Pick which fields to return.

```ts
@Query('select', SelectPipe) select?: Pipes.Select
```

### 🧩 Examples

```url
?select=id,firstName,lastName
?select=-password
```

```ts
{ id: true, firstName: true, lastName: true }
{ password: false }
```

---

## 4️⃣ IncludePipe

Include relations, with optional **nested includes & selects**.

```ts
@Query('include', IncludePipe) include?: Pipes.Include
```

### 🧩 Examples

### Basic Include

```url
?include=profile
```

```ts
{
  profile: true
}
```

### Nested Include

```url
?include=posts.comments
```

```ts
{
  posts: {
    include: {
      comments: true
    }
  }
}
```

### Include with Select

```url
?include=profile.select:(id,firstName,lastName)
```

```ts
{ profile: { select: { id: true, firstName: true, lastName: true } } }
```

### Multi-Nested Include

```url
?include=company.departments.select:(name,employees.select:(id,name))
```

```ts
{
  company: {
    include: {
      departments: {
        select: {
          name: true,
          employees: { select: { id: true, name: true } }
        }
      }
    }
  }
}
```

---

## Combined Example

```url
/users?where=firstName:contains string(John),createdAt:gte date(2024-01-01),createdAt:lte date(2024-12-31)&orderBy=user.profile.name:asc&select=id,firstName&include=profile
```

```ts
{
  where: {
    firstName: { contains: 'John' },
    createdAt: {
      gte: '2024-01-01T00:00:00.000Z',
      lte: '2024-12-31T23:59:59.000Z'
    }
  },
  orderBy: { user: { profile: { name: 'asc' } } },
  select: { id: true, firstName: true },
  include: { profile: true }
}
```

---

## 5️⃣ AggregatePipe
## 🎯 Query Format

```
aggregate=field1: function(params), field2: function(params), chart: type(dateField, interval)
```

### ✔ Supported functions

| Function                    | Prisma Output |
| --------------------------- | ------------- |
| `sum()`                     | `_sum`        |
| `avg()`                     | `_avg`        |
| `min()`                     | `_min`        |
| `max()`                     | `_max`        |
| `count()` or `count(field)` | `_count`      |

---

## 🎯 Chart Metadata (Optional)

```
chart: type(field, interval)
```

Examples:

```
chart: line(createdAt, month)
chart: bar(orderDate, day)
chart: pie
chart: donut(status)
```

* `type` → line, bar, area, pie, donut
* `field` → field used for date grouping (optional)
* `interval` → day, week, month, quarter, year

> Chart metadata is **not passed to Prisma**, but parsed by the pipe so the service layer can generate chart-ready datasets.

---

## 📌 Examples

### 1. Simple Aggregation

```
?aggregate=revenue: sum(), orders: count()
```

Output:

```ts
{
  prisma: {
    _sum: { revenue: true },
    _count: { orders: true }
  }
}
```

---

### 2. Multiple Aggregations

```
?aggregate=price: avg(), quantity: sum()
```

```ts
{
  prisma: {
    _avg: { price: true },
    _sum: { quantity: true }
  }
}
```

---

### 3. With Chart Metadata

```
?aggregate=price: avg(), chart: bar(createdAt, month)
```

```ts
{
  prisma: {
    _avg: { price: true }
  },
  chart: {
    type: "bar",
    field: "createdAt",
    interval: "month"
  }
}
```

---

### 4. Date-based Line Chart

```
?aggregate=total: sum(), chart: line(orderDate, month)
```

```ts
{
  prisma: {
    _sum: { total: true }
  },
  chart: {
    type: "line",
    field: "orderDate",
    interval: "month"
  }
}
```

---

### 5. Count With Parameter

```
?aggregate=amount: sum(), status: count(id), chart: pie
```

```ts
{
  prisma: {
    _sum: { amount: true },
    _count: { id: true }
  },
  chart: {
    type: "pie"
  }
}
```

---


## 🗺 Roadmap – Next Pipes

These are the upcoming pipes planned for future releases:

| Pipe             | Description                                                                | Status      |
| ---------------- | -------------------------------------------------------------------------- | ----------- |
| `DistinctPipe`   | Parse `distinct` query param into Prisma `distinct` array                  | 🟡 Planned  |
| `PaginationPipe` | Parse `skip` & `take` (or `page` & `limit`) into Prisma pagination options | 🟡 Planned  |
| `GroupByPipe`    | Parse `groupBy` queries into Prisma `groupBy` options (with aggregates)    | 🔵 Research |
| `HavingPipe`     | Support SQL-like `having` filters after grouping                           | 🔵 Research |
| `CountPipe`      | Shortcut to request `count` results alongside data                         | 🟡 Planned  |

✅ Already Available: `WherePipe`, `OrderByPipe`, `SelectPipe`, `IncludePipe`, `AggregatePipe`

---

✨ With `@dwcahyo/nestjs-prisma-pipes`, you write **less boilerplate** and let your users build **powerful dynamic queries** right from the URL.