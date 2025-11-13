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

## \[2.0.4]

### Added

- Support for **nested `orderBy`** (multi-level deep ordering).
  Example:

  ```url
  ?orderBy=user.profile.name:asc,posts.comments.createdAt:desc
  ```

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

Convert query strings into **Prisma `where` objects** with support for operators, nested relations, and type casting.

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

| Type    | Syntax                            | Example                                           |
| ------- | --------------------------------- | ------------------------------------------------- |
| String  | `string(value)`                   | `string(John)` → `"John"`                         |
| Integer | `int(value)`                      | `int(42)` → `42`                                  |
| Float   | `float(value)`                    | `float(3.14)` → `3.14`                            |
| Boolean | `boolean(value)` / `bool(value)`  | `bool(true)` → `true`                             |
| Date    | `date(value)` / `datetime(value)` | `date(2025-01-01)` → `"2025-01-01T00:00:00.000Z"` |
| Array   | `array(type(...))`                | `array(int(1),int(2))` → `[1,2]`                  |

---

### 🧩 Examples

#### Flat Filter

```url
?where=firstName:contains string(John)
```

```ts
{
  firstName: {
    contains: "John";
  }
}
```

#### Comparison

```url
?where=age:gt int(18)
```

```ts
{
  age: {
    gt: 18;
  }
}
```

#### Nested Relation

```url
?where=posts.some.title:contains string(Hello)
```

```ts
{
  posts: {
    some: {
      title: {
        contains: "Hello";
      }
    }
  }
}
```

#### Multi-Nested Condition

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
              startsWith: "A";
            }
          }
        }
      }
    }
  }
}
```

#### Array Condition

```url
?where=id:in array(int(1),int(2),int(3))
```

```ts
{ id: { in: [1, 2, 3] } }
```

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
  createdAt: "desc";
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
      name: "asc";
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
  profile: true;
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
      comments: true;
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

## 5️⃣ Combined Example

```url
/users?where=firstName:contains string(John)&orderBy=user.profile.name:asc&select=id,firstName&include=profile
```

```ts
{
  where: { firstName: { contains: 'John' } },
  orderBy: { user: { profile: { name: 'asc' } } },
  select: { id: true, firstName: true },
  include: { profile: true }
}
```

---

## 💡 Pro Tips

- All pipes handle **empty / undefined query params** gracefully.
- `where`, `orderBy`, `select`, and `include` all support **deep nesting**.
- Mix `select` and `include` freely to shape your response.
- Perfect for building **dynamic, frontend-driven filters**.

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
| `AggregatePipe`  | Parse aggregate queries (`_sum`, `_avg`, `_min`, `_max`) into Prisma query | 🔵 Research |

✅ Already Available: `WherePipe`, `OrderByPipe`, `SelectPipe`, `IncludePipe`

---

✨ With `@dwcahyo/nestjs-prisma-pipes`, you write **less boilerplate** and let your users build **powerful dynamic queries** right from the URL.
