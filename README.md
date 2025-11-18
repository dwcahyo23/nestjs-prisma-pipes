# 🛠 @dwcahyo/nestjs-prisma-pipes

**NestJS + Prisma query pipes**  
Parse query strings (`where`, `orderBy`, `select`, `include`, `aggregate`) directly into **Prisma-ready objects**.  
No more manual parsing — just pass query params, and you're good to go 🚀

---

## 📑 Table of Contents

- [Installation](#-installation)
- [Changelog](#-changelog)
- [Quick Start](#-quick-start)
- [Pipes Overview](#-pipes-overview)
- **Pipes Documentation**
  - [1. WherePipe](#1️⃣-wherepipe) - Filter with operators, types, field comparisons
  - [2. OrderByPipe](#2️⃣-orderbypipe) - Sort with nested relations
  - [3. SelectPipe](#3️⃣-selectpipe) - Pick specific fields
  - [4. IncludePipe](#4️⃣-includepipe) - Include relations
  - [5. AggregatePipe](#5️⃣-aggregatepipe) - Aggregations & charts ⭐ NEW
- [Roadmap](#-roadmap--next-pipes)

---

## 📦 Installation

```bash
npm install --save @dwcahyo/nestjs-prisma-pipes
```

---

## 📜 Changelog

### [2.4.0] - 2025

#### 🎉 Major Release - AggregatePipe with Chart Support

##### Added
- **AggregatePipe** - Complete aggregation support with chart-ready transformations
  - Support for all aggregate functions: `sum()`, `avg()`, `min()`, `max()`, `count()`
  - Time series support: `day`, `month`, `year` intervals
  - Chart type specification: `bar`, `line`, `pie`
  - Automatic gap filling for time series data (fills missing months with 0)
  - Multiple aggregates per query
  - Combines seamlessly with WherePipe for filtered aggregations
  
  **Example:**
  ```url
  ?where=status: string(active)&aggregate=revenue: sum(), orders: count(), chart: line(createdAt, month)
  ```

- **Strong TypeScript Types** - Complete type safety for all pipes
  - `Pipes.Where` - Recursive types with operators & field references
  - `Pipes.OrderBy` - Nested sort support
  - `Pipes.Select` - Nested field selection
  - `Pipes.Include` - Complex include clauses with where/orderBy/pagination
  - `Pipes.Aggregate` - Complete aggregate configuration
  - `Pipes.ChartSeries` - Chart-ready data structure
  - Helper types: `FilterOperator`, `SortDirection`, `AggregateFunction`, `ChartType`, `TimeInterval`

##### Improved
- Enhanced type safety across all pipes
- Better error messages for invalid queries
- Comprehensive documentation with real-world examples
- Added navigation links for easier documentation browsing

---

### [2.3.0]

#### Added
- **AggregatePipe (Basic)** — Parse URL query into Prisma `aggregate()` options
  - Supports: `_count`, `_sum`, `_avg`, `_min`, `_max`

---

### [2.2.1]

#### Added
- **Field-to-field helper** - Helper to returns a special format for field references that must be converted in service layer before passing to Prisma

---

### [2.2.0]

#### Added
- [Internal Documentation Where Pipe](README_WHERE.md)
- **Field-to-field comparison** - Compare values between columns in the same table! Perfect for inventory management, date validation, and business logic filters.
  
  **Example:**
  ```url
  ?where=qty:lte field(recQty),startDate:lt field(endDate)
  ```

---

### [2.1.0]

#### Added
- **Date range support on the same column** - Now you can apply multiple operators (e.g., `gte` and `lte`) on the same field for powerful date filtering.
  
  **Example:**
  ```url
  ?where=createdAt:gte date(2025-01-01),createdAt:lte date(2025-12-31)
  ```

#### Improved
- **Refactored WherePipe** for better scalability, maintainability, and type safety
- Enhanced type parsers with registry pattern for easier extensibility
- Improved error handling and validation
- Better support for merging multiple operators on the same field

---

### [2.0.4]

#### Added
- Support for **nested `orderBy`** (multi-level deep ordering).
  
  **Example:**
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
  AggregatePipe,
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

  @Get("stats")
  async getStats(
    @Query("where", WherePipe) where?: Pipes.Where,
    @Query("aggregate", AggregatePipe) aggregate?: Pipes.Aggregate
  ) {
    const data = aggregate?.isGrouped
      ? await this.prisma.order.groupBy({
          where,
          ...aggregate.prismaQuery,
        })
      : await this.prisma.order.aggregate({
          where,
          ...aggregate.prismaQuery,
        });

    return AggregatePipe.toChartSeries(data, aggregate);
  }
}
```

---

## 🔎 Pipes Overview

| Pipe            | Purpose                                                       | Version |
| --------------- | ------------------------------------------------------------- | ------- |
| `WherePipe`     | Parse `where` filters (supports operators & nested relations) | 2.0+    |
| `OrderByPipe`   | Parse `orderBy` filters (supports deep nesting)               | 2.0+    |
| `SelectPipe`    | Pick specific fields to return                                | 1.0+    |
| `IncludePipe`   | Include relations (with nested `select`)                      | 1.0+    |
| `AggregatePipe` | Aggregations with chart support ⭐ NEW                        | 2.0+    |

[↑ Back to top](#-table-of-contents)

---

## 1️⃣ WherePipe

Convert query strings into **Prisma `where` objects** with support for operators, nested relations, type casting, date ranges, and field-to-field comparisons.

```ts
@Query("where", WherePipe) where?: Pipes.Where
```

### 🔧 Supported Operators

| Type       | Operators                                 | Example                                          |
| ---------- | ----------------------------------------- | ------------------------------------------------ |
| Comparison | `equals`, `not`, `lt`, `lte`, `gt`, `gte` | `?where=age:gt int(18)`                          |
| Text       | `contains`, `startsWith`, `endsWith`      | `?where=name:contains string(John)`              |
| Arrays     | `has`, `hasEvery`, `hasSome`, `in`        | `?where=id:in array(int(1),int(2))`              |
| Relations  | `is`, `some`, `every`, `none`             | `?where=posts.some.title:contains string(Hello)` |

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

### 🧩 Basic Examples

#### Simple Filter
```url
?where=firstName:John
```
```ts
{ firstName: "John" }
```

#### With Type
```url
?where=age:int(25)
```
```ts
{ age: 25 }
```

#### Text Search
```url
?where=firstName:contains string(John)
```
```ts
{ firstName: { contains: "John" } }
```

#### Multiple Conditions
```url
?where=firstName:contains string(John),age:gte int(18)
```
```ts
{
  firstName: { contains: "John" },
  age: { gte: 18 }
}
```

[See more WherePipe examples ↓](#-advanced-where-examples)

[↑ Back to top](#-table-of-contents)

---

## 2️⃣ OrderByPipe

Convert query strings into **Prisma `orderBy` objects** with nested relation support.

```ts
@Query('orderBy', OrderByPipe) orderBy?: Pipes.Order
```

### 🧩 Examples

#### Simple Sort
```url
?orderBy=createdAt:desc
```
```ts
[{ createdAt: "desc" }]
```

#### Nested Sort
```url
?orderBy=user.profile.name:asc
```
```ts
[{ user: { profile: { name: "asc" } } }]
```

#### Multiple Sorts
```url
?orderBy=user.profile.name:asc,createdAt:desc
```
```ts
[
  { user: { profile: { name: 'asc' } } },
  { createdAt: 'desc' }
]
```

[↑ Back to top](#-table-of-contents)

---

## 3️⃣ SelectPipe

Pick which fields to return.

```ts
@Query('select', SelectPipe) select?: Pipes.Select
```

### 🧩 Examples

```url
?select=id,firstName,lastName
```
```ts
{ id: true, firstName: true, lastName: true }
```

```url
?select=-password
```
```ts
{ password: false }
```

[↑ Back to top](#-table-of-contents)

---

## 4️⃣ IncludePipe

Include relations, with optional nested includes & selects.

```ts
@Query('include', IncludePipe) include?: Pipes.Include
```

### 🧩 Examples

#### Basic Include
```url
?include=profile
```
```ts
{ profile: true }
```

#### Nested Include
```url
?include=posts.comments
```
```ts
{ posts: { include: { comments: true } } }
```

#### Include with Select
```url
?include=profile.select:(id,firstName,lastName)
```
```ts
{ profile: { select: { id: true, firstName: true, lastName: true } } }
```

[↑ Back to top](#-table-of-contents)

---

## 5️⃣ AggregatePipe

⭐ **NEW in v3.0.0** - Powerful aggregations with chart-ready transformations!

Parse aggregate queries and transform results into chart-ready format with automatic time series support.

```ts
@Query('aggregate', AggregatePipe) aggregate?: Pipes.Aggregate
```

### 🎯 Query Format

```
aggregate=field1: function(params), field2: function(), chart: type(dateField, interval)
```

### ✅ Supported Functions

| Function                    | Prisma Output | Description                  |
| --------------------------- | ------------- | ---------------------------- |
| `sum()`                     | `_sum`        | Sum of values                |
| `avg()`                     | `_avg`        | Average of values            |
| `min()`                     | `_min`        | Minimum value                |
| `max()`                     | `_max`        | Maximum value                |
| `count()` or `count(field)` | `_count`      | Count of records             |

### 📊 Chart Types

| Type   | Use Case                           |
| ------ | ---------------------------------- |
| `bar`  | Compare values across categories   |
| `line` | Show trends over time              |
| `pie`  | Show proportions                   |

### 📅 Time Intervals

| Interval | Description                    |
| -------- | ------------------------------ |
| `day`    | Group by day (365 data points) |
| `month`  | Group by month (12 data points)|
| `year`   | Group by year (5 data points)  |

### 🧩 Examples

#### 1. Simple Aggregation

```url
?aggregate=revenue: sum(), orders: count()
```

**Pipe Output:**
```ts
{
  prismaQuery: {
    _sum: { revenue: true },
    _count: true
  },
  aggregates: [
    { field: 'revenue', function: 'sum', params: [] },
    { field: 'orders', function: 'count', params: [] }
  ],
  groupBy: [],
  isGrouped: false
}
```

**Usage in Service:**
```ts
const data = await prisma.order.aggregate(aggregate.prismaQuery);
// { _sum: { revenue: 150000 }, _count: 42 }
```

#### 2. Monthly Revenue Chart

```url
?aggregate=revenue: sum(), chart: line(createdAt, month)
```

**Pipe Output:**
```ts
{
  prismaQuery: {
    by: ['createdAt'],
    _sum: { revenue: true }
  },
  aggregates: [{ field: 'revenue', function: 'sum', params: [] }],
  groupBy: ['createdAt'],
  isGrouped: true,
  chartType: 'line',
  timeSeries: {
    dateField: 'createdAt',
    interval: 'month'
  }
}
```

**Usage in Service:**
```ts
const data = await prisma.order.groupBy({
  by: ['createdAt'],
  _sum: { revenue: true }
});

const chartData = AggregatePipe.toChartSeries(data, aggregate);
// {
//   categories: ['Jan 2025', 'Feb 2025', ..., 'Dec 2025'],
//   series: [{
//     name: 'sum(revenue)',
//     data: [12000, 15000, 0, 18000, ...] // Gaps filled with 0
//   }],
//   chartType: 'line',
//   raw: [...]
// }
```

#### 3. Multiple Aggregates with Time Series

```url
?aggregate=revenue: sum(), orders: count(), avgPrice: avg(), chart: bar(orderDate, month)
```

**Chart Output:**
```ts
{
  categories: ['Jan 2025', 'Feb 2025', ..., 'Dec 2025'],
  series: [
    { name: 'sum(revenue)', data: [12000, 15000, ...] },
    { name: 'count(orders)', data: [45, 52, ...] },
    { name: 'avg(avgPrice)', data: [266.67, 288.46, ...] }
  ],
  chartType: 'bar'
}
```

#### 4. Filtered Aggregation (with WherePipe)

```url
?where=status: string(completed), createdAt: gte date(2025-01-01)&aggregate=total: sum(), chart: line(createdAt, month)
```

**Service Code:**
```ts
async getStats(
  @Query('where', WherePipe) where?: Pipes.Where,
  @Query('aggregate', AggregatePipe) aggregate?: Pipes.Aggregate
) {
  const data = await this.prisma.order.groupBy({
    where, // Filter completed orders from 2025
    ...aggregate.prismaQuery
  });

  return AggregatePipe.toChartSeries(data, aggregate);
}
```

### 🎨 Chart Integration Examples

#### With Recharts (React)
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

function RevenueChart({ data }: { data: Pipes.ChartSeries }) {
  const chartData = data.categories.map((cat, i) => ({
    name: cat,
    ...data.series.reduce((acc, s) => ({
      ...acc,
      [s.name]: s.data[i]
    }), {})
  }));

  return (
    <LineChart width={800} height={400} data={chartData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Legend />
      {data.series.map((s, i) => (
        <Line key={i} type="monotone" dataKey={s.name} stroke={`#${i}82ca9d`} />
      ))}
    </LineChart>
  );
}
```

#### With Chart.js
```ts
import { Chart } from 'chart.js';

function createChart(ctx: HTMLCanvasElement, data: Pipes.ChartSeries) {
  return new Chart(ctx, {
    type: data.chartType || 'bar',
    data: {
      labels: data.categories,
      datasets: data.series.map(s => ({
        label: s.name,
        data: s.data,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }))
    }
  });
}
```

### 🔥 Advanced Examples

#### Sales Dashboard
```url
?where=status: string(paid)&aggregate=revenue: sum(), orders: count(), avgOrder: avg(), chart: line(paidAt, month)
```

#### Category Performance
```url
?where=category: in array(string(electronics), string(books))&aggregate=sales: sum(), units: count(), chart: bar(soldAt, month)
```

#### Year-over-Year Comparison
```url
?where=year: in array(int(2023), int(2025))&aggregate=revenue: sum(), chart: bar(createdAt, year)
```

### 💡 Best Practices

1. **Use time series for trends** - Always specify `chart: type(dateField, interval)` for time-based data
2. **Filter before aggregating** - Combine with WherePipe for filtered aggregations
3. **Choose appropriate intervals**:
   - `day` for detailed analysis (last 30 days)
   - `month` for trends (last 12 months)
   - `year` for long-term patterns
4. **Multiple metrics** - Aggregate multiple fields to compare side-by-side
5. **Frontend-ready** - Use `AggregatePipe.toChartSeries()` to get chart-ready data structure

### ⚠️ Important Notes

- Time series automatically fills gaps with 0 (e.g., if no data for March, value = 0)
- Uses UTC timezone for consistent date handling
- `isGrouped: true` requires `groupBy()`, `false` uses `aggregate()`
- Chart metadata is optional - you can aggregate without charts
- Raw Prisma data included in `raw` property for custom processing

[↑ Back to top](#-table-of-contents)

---

## 🔍 Advanced Where Examples

### 🔄 Field-to-Field Comparison

**NEW in v2.2.0** - Compare values between columns in the same table!

⚠️ **Important:** Requires service layer conversion using `convertFieldReferences()`

```ts
import { convertFieldReferences } from '@dwcahyo/nestjs-prisma-pipes';

async findAll(@Query('where', WherePipe) whereFromPipe?: Pipes.Where) {
  const where = convertFieldReferences(whereFromPipe, this.prisma.product);
  return this.prisma.product.findMany({ where });
}
```

#### Inventory Management
```url
?where=qty:lte field(recQty),status:string(active)
```
```ts
// Find products below recommended quantity
{
  qty: { lte: prisma.product.fields.recQty },
  status: "active"
}
```

#### Date Validation
```url
?where=startDate:lt field(endDate)
```
```ts
{
  startDate: { lt: prisma.event.fields.endDate }
}
```

### 📅 Date Range Support

**NEW in v2.1.0** - Multiple operators on same field!

#### Single Date Range
```url
?where=createdAt:gte date(2025-01-01),createdAt:lte date(2025-12-31)
```
```ts
{
  createdAt: {
    gte: "2025-01-01T00:00:00.000Z",
    lte: "2025-12-31T23:59:59.000Z"
  }
}
```

#### Multiple Date Ranges
```url
?where=createdAt:gte date(2025-01-01),createdAt:lte date(2025-12-31),updatedAt:gte date(2025-06-01)
```
```ts
{
  createdAt: {
    gte: "2025-01-01T00:00:00.000Z",
    lte: "2025-12-31T23:59:59.000Z"
  },
  updatedAt: {
    gte: "2025-06-01T00:00:00.000Z"
  }
}
```

### 🔗 Nested Relations

#### Deep Nesting
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
            name: { startsWith: "A" }
          }
        }
      }
    }
  }
}
```

### 🎯 Real-World Examples

#### E-commerce Product Search
```url
?where=category:string(Electronics),price:gte float(100),price:lte float(500),inStock:bool(true),tags:hasSome array(sale,featured)
```

#### Inventory Low Stock Alert
```url
?where=qty:lte field(recQty),status:string(active),lastRestocked:lte date(2025-01-01)
```

#### Event Scheduling Validation
```url
?where=startDate:lt field(endDate),status:in array(scheduled,active),capacity:gte field(minParticipants)
```

[↑ Back to top](#-table-of-contents)

---

## 🗺 Roadmap – Next Pipes

| Pipe             | Description                                                       | Status     |
| ---------------- | ----------------------------------------------------------------- | ---------- |
| `DistinctPipe`   | Parse `distinct` query param into Prisma `distinct` array        | 🟡 Planned |
| `PaginationPipe` | Parse `skip` & `take` (or `page` & `limit`) into pagination      | 🟡 Planned |
| `HavingPipe`     | Support SQL-like `having` filters after grouping                 | 🟡 Planned |
| `CountPipe`      | Shortcut to request `count` results alongside data               | 🟡 Planned |


✅ **Available Now:** `WherePipe`, `OrderByPipe`, `SelectPipe`, `IncludePipe`, `AggregatePipe`

[↑ Back to top](#-table-of-contents)

---

## 📝 License

MIT

---

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

---

✨ With `@dwcahyo/nestjs-prisma-pipes`, you write **less boilerplate** and let your users build **powerful dynamic queries** right from the URL.

[↑ Back to top](#-table-of-contents)