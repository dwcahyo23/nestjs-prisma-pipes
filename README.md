# 🛠 @dwcahyo/nestjs-prisma-pipes

**NestJS + Prisma Pipes** — Parse query strings (`where`, `orderBy`, `select`, `include`) directly into **Prisma query objects**.
No more manual parsing! Just send queries from URL and get ready-to-use Prisma objects.

---

## 📦 Installation

```bash
npm install --save @dwcahyo/nestjs-prisma-pipes
```

---

## 🚀 Quick Start

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
    return this.prisma.user.findMany({
      where,
      orderBy,
      select,
      include,
    });
  }
}
```

---

## 🔗 Example Query

```url
/users?where=firstName:contains string(John)&orderBy=createdAt:desc&select=id,firstName&include=profile
```

**Generated Prisma query:**

```ts
{
  where: { firstName: { contains: 'John' } },
  orderBy: { createdAt: 'desc' },
  select: { id: true, firstName: true },
  include: { profile: true }
}
```

---

## 🔽 Pipes Overview

| Pipe          | Description                                      |
| ------------- | ------------------------------------------------ |
| `WherePipe`   | Parse `where` filters including nested relations |
| `OrderByPipe` | Parse `orderBy` filters                          |
| `SelectPipe`  | Select specific fields/columns                   |
| `IncludePipe` | Include relations with optional nested selects   |

---

## 1️⃣ WherePipe

Transform query string to **Prisma where filter**.

```ts
@Query('where', WherePipe) where?: Pipes.Where
```

### Supported Operators

- Comparison: `equals`, `not`, `lt`, `lte`, `gt`, `gte`
- Text: `contains`, `startsWith`, `endsWith`
- Array: `has`, `hasEvery`, `hasSome`
- Relations: `is`, `some`, `every`, `none`

### Example

```url
?where=firstName:contains string(John)
?where=age:gt int(18)
?where=posts.some.title:contains string(Hello)
```

---

## 2️⃣ OrderByPipe

Transform query string to **Prisma order filter**.

```ts
@Query('orderBy', OrderByPipe) orderBy?: Pipes.Order
```

**Example:**

```url
?orderBy=createdAt:desc
```

---

## 3️⃣ SelectPipe

Select only specific fields.

```ts
@Query('select', SelectPipe) select?: Pipes.Select
```

**Examples:**

```url
?select=id,firstName,lastName
?select=-password
```

---

## 4️⃣ IncludePipe

Include related models, with **optional nested select**.

```ts
@Query('include', IncludePipe) include?: Pipes.Include
```

### Simple Include

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

### Nested Include + Select

```url
?include=posts.comments,profile.select:(id,firstName)
```

```ts
{
  posts: { include: { comments: true } },
  profile: { select: { id: true, firstName: true } }
}
```

### Multi-Nested Select + Include

```url
?include=profile.select:(id,firstName,account.select:(password,email)),posts.comments
```

```ts
{
  profile: {
    select: {
      id: true,
      firstName: true,
      account: { select: { password: true, email: true } }
    }
  },
  posts: { include: { comments: true } }
}
```

### Deep Multi-Level Nested Include

```url
?include=company.departments.select:(name,employees.select:(id,name,manager.select:(id)))
```

```ts
{
  company: {
    include: {
      departments: {
        select: {
          name: true,
          employees: {
            select: {
              id: true,
              name: true,
              manager: { select: { id: true } }
            }
          }
        }
      }
    }
  }
}
```

---

## 5️⃣ Combine Where + OrderBy

```url
?where=firstName:John&orderBy=firstName:asc
```

---

## 💡 Tips

- Nested select works **arbitrarily deep**
- Mix `include` and `select` freely
- Pipes handle empty / undefined queries gracefully
- Perfect for **dynamic filters from frontend**
