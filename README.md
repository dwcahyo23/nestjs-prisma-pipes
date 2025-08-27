
---

# Installation

Install langsung dari GitHub fork:

```bash
npm install --save github:dwcahyo23/nestjs-pipes

# Usage

```ts
// import pipes
import { WherePipe, OrderByPipe, SelectPipe } from '@nodeteam/nestjs-pipes';
// import types
import { Pipes } from '@nodeteam/nestjs-pipes/index';
```

---

# OrderByPipe

Gunakan untuk mengubah query string `orderBy` menjadi Prisma order filter.

```ts
@Query('orderBy', OrderByPipe) orderBy?: Pipes.Order
```

### Example

Sort kolom `firstName` ascending:

```
https://example.com/?orderBy=firstName:asc
```

---

# WherePipe

Gunakan untuk mengubah query string `where` menjadi Prisma where filter.

```ts
@Query('where', WherePipe) where?: Pipes.Where
```

---

## Operators

* **equals** – `where=age: equals int(12)`
* **not** – `where=age: not int(12)`
* **in** – `where=zipCode: in array(int(11111), int(22222))`
* **lt** – `where=age: lt int(12)`
* **lte** – `where=age: lte int(12)`
* **gt** – `where=age: gt int(12)`
* **gte** – `where=age: gte int(12)`
* **contains** – `where=firstName: contains string(John)`
* **startsWith** – `where=firstName: startsWith string(John)`
* **endsWith** – `where=firstName: endsWith string(John)`
* **has** – `where=tags: has yellow`
* **hasEvery** – `where=tags: hasEvery array(yellow, green)`
* **hasSome** – `where=tags: hasSome array(yellow, green)`
* **is** – relation filter tunggal (one-to-one)
* **some** – relation filter (minimal satu cocok)
* **every** – relation filter (semua cocok)
* **none** – relation filter (tidak ada yang cocok)

---

## Types

* **string** – `where=firstName: contains string(John)`
* **int** – `where=age: gt int(12)`
* **float** – `where=price: gt float(12.5)`
* **boolean / bool** – `where=active: equals boolean(true)`
* **date** – `where=createdAt: gt date(2019-01-01)`
* **datetime** – `where=createdAt: gt datetime(2019-01-01 12:00:00)`
* **array** – `where=zipCode: in array(int(111111), int(222222))`

---

## Nested Relation Filters

Mendukung Prisma-style nested relation filter dengan keyword:

* `is` – one-to-one relation
* `some` – minimal satu cocok
* `every` – semua cocok
* `none` – tidak ada yang cocok

### Examples

* Relation tunggal

```
?where=profile.is.firstName: contains string(John)
```

* Relation many-to-many

```
?where=posts.some.title: contains string(Hello)
```

* Deeply nested

```
?where=company.is.departments.some.employees.every.name: contains string(John)
```

---

## Examples

* Semua row dengan `firstName = John`

```
https://example.com/?where=firstName:John
```

* Semua row dengan `createdAt > 2023-01-13 12:04:27.689`

```
https://example.com/?where=createdAt: gt date(2023-01-13 12:04:27.689)
```

* Semua row dengan `id ≠ 12`

```
https://example.com/?where=id: not int(12)
```

* Multi filter (default `AND`)

```
https://example.com/?where=id: gt int(1), email: contains @gmail.com
```

---

# WherePipe + OrderByPipe

Combine filter & sort:

```
https://example.com/?where=firstName:John&orderBy=firstName:asc
```

---

# SelectPipe

Gunakan untuk memilih kolom tertentu.

```ts
@Query('select', SelectPipe) select?: Pipes.Select
```

### Examples

* Select kolom `firstName` dan `lastName`

```
https://example.com/?select=firstName,lastName
```

* Exclude kolom `firstName` dan `lastName`

```
https://example.com/?select=-firstName,-lastName
```

---