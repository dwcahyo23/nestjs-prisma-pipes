
# @dwcahyo/nestjs-prisma-pipes

Utility pipes untuk **NestJS + Prisma**: parsing query string (`where`, `orderBy`, `select`, `include`) langsung menjadi Prisma filter object.

---

## 📦 Installation

```bash
npm install --save @dwcahyo/nestjs-prisma-pipes
```

---

## 🔽 Pipes

### 🔹 OrderByPipe

Mengubah query string `orderBy` menjadi Prisma **order filter**.

```ts
@Query('orderBy', OrderByPipe) orderBy?: Pipes.Order
```

**Example**

```url
https://example.com/?orderBy=firstName:asc
```

---

### 🔹 WherePipe

Mengubah query string `where` menjadi Prisma **where filter**.

```ts
@Query('where', WherePipe) where?: Pipes.Where
```

#### Operators

* `equals` → `where=age: equals int(12)`
* `not` → `where=age: not int(12)`
* `in` → `where=zipCode: in array(int(11111), int(22222))`
* `lt` / `lte` / `gt` / `gte`
* `contains` / `startsWith` / `endsWith`
* `has` / `hasEvery` / `hasSome`
* `is` / `some` / `every` / `none` → relation filter

#### Types

* `string` → `where=firstName: contains string(John)`
* `int` → `where=age: gt int(12)`
* `float` → `where=price: gt float(12.5)`
* `boolean` → `where=active: equals boolean(true)`
* `date` → `where=createdAt: gt date(2019-01-01)`
* `datetime` → `where=createdAt: gt datetime(2019-01-01 12:00:00)`
* `array` → `where=zipCode: in array(int(111111), int(222222))`

#### Examples

```url
https://example.com/?where=firstName:John
https://example.com/?where=createdAt: gt date(2023-01-13 12:04:27.689)
https://example.com/?where=id: not int(12)
https://example.com/?where=id: gt int(1), email: contains @gmail.com
```

#### Nested Relation Filters

Mendukung Prisma-style nested relation filter:

```url
https://example.com/?where=profile.is.firstName: contains string(John)
https://example.com/?where=posts.some.title: contains string(Hello)
https://example.com/?where=company.is.departments.some.employees.every.name: contains string(John)
```

---

### 🔹 SelectPipe

Memilih kolom tertentu pada query.

```ts
@Query('select', SelectPipe) select?: Pipes.Select
```

**Examples**

```url
https://example.com/?select=firstName,lastName
https://example.com/?select=-firstName,-lastName
```

---

### 🔹 IncludePipe

Mengubah query string `include` menjadi Prisma **include object**.

```ts
@Query('include', IncludePipe) include?: Pipes.Include
```

**Examples**

* Simple include:

```url
https://example.com/?include=profile
```

```ts
{ include: { profile: true } }
```

* Nested include:

```url
https://example.com/?include=posts.comments
```

```ts
{ include: { posts: { include: { comments: true } } } }
```

* Include dengan `select`:

```url
https://example.com/?include=profile.select:(id,firstName,lastName)
```

```ts
{
  include: {
    profile: {
      select: { id: true, firstName: true, lastName: true },
    },
  }
}
```

* Kombinasi nested + select:

```url
https://example.com/?include=posts.comments,profile.select:(id,firstName)
```

```ts
{
  include: {
    posts: { include: { comments: true } },
    profile: { select: { id: true, firstName: true } },
  }
}
```

---

### 🔹 WherePipe + OrderByPipe

Kombinasi filter & sort:

```url
https://example.com/?where=firstName:John&orderBy=firstName:asc
```
