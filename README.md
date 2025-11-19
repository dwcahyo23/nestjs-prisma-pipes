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

### [2.4.2] - 2025

#### 🚀 Enhanced - Grouped Time Series Support

##### Added
- **Grouped Time Series Charts** - Compare trends across multiple groups over time
  - Group by category + time to see trends per category
  - Support for multiple aggregates per group
  - Automatic series generation: one line/bar per group
  - Perfect for category performance tracking, regional comparisons, product trends
  
  **Example - Sales per Category Over Time:**
  ```url
  ?where=category: in array(COM,O4W,O2W,OES,EXX)
  &aggregate=qty: sum(), groupBy: (category, createdAt), chart: line(createdAt, month)
  ```
  
  **Result:**
  - X-axis: 12 months (Jan-Dec)
  - 5 separate lines: one for each category
  - Each line shows monthly trend for that category
  - Series names: "COM - sum(qty)", "O4W - sum(qty)", etc.

##### Chart Options Enhanced
- **Stacked grouped time series**: `chart: area(createdAt, month, stacked)`
  - See market share evolution
  - Total height = sum of all groups
  - Perfect for contribution analysis
  
- **Horizontal grouped bars**: `chart: bar(category, horizontal)`
  - Better readability for many categories
  - Great for ranking visualizations
  
- **Multiple chart types**: `bar`, `line`, `pie`, `area`, `donut`

##### Use Cases
- **Category Performance**: Track sales/revenue per product category over time
- **Regional Comparison**: Compare metrics across different regions monthly
- **Product Trends**: Monitor multiple products' performance side by side
- **Market Share Evolution**: See how category contributions change over time
- **Multi-metric Analysis**: Compare qty AND recQty per category simultaneously

---

### [2.4.0] - 2025

#### 🎉 Major Release - AggregatePipe with Chart Support

##### Added
- **AggregatePipe** - Complete aggregation support with chart-ready transformations
  - Support for all aggregate functions: `sum()`, `avg()`, `min()`, `max()`, `count()`
  - Time series support: `day`, `month`, `year` intervals
  - Chart type specification: `bar`, `line`, `pie`, `area`, `donut`
  - Automatic gap filling for time series data (fills missing months with 0)
  - Multiple aggregates per query
  - Flexible groupBy support with nested fields
  - Advanced chart options: `stacked`, `horizontal`
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
  - `Pipes.ChartConfig` - Advanced chart configuration with grouping
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
// ============================================
// users.controller.ts
// ============================================
import { Controller, Get, Query } from "@nestjs/common";
import { UserService } from "./user.service";
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
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll(
    @Query("where", WherePipe) where?: Pipes.Where,
    @Query("orderBy", OrderByPipe) orderBy?: Pipes.Order,
    @Query("select", SelectPipe) select?: Pipes.Select,
    @Query("include", IncludePipe) include?: Pipes.Include
  ) {
    return this.userService.findAll({ where, orderBy, select, include });
  }

  @Get("stats")
  async getStats(
    @Query("where", WherePipe) where?: Pipes.Where,
    @Query("aggregate", AggregatePipe) aggregate?: Pipes.Aggregate
  ) {
    return this.userService.getAggregateStats(where, aggregate);
  }
}

// ============================================
// users.service.ts
// ============================================
import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { Pipes, AggregatePipe } from "@dwcahyo/nestjs-prisma-pipes";

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: {
    where?: Pipes.Where;
    orderBy?: Pipes.Order;
    select?: Pipes.Select;
    include?: Pipes.Include;
  }) {
    return this.prisma.user.findMany(query);
  }

  async getAggregateStats(
    where?: Pipes.Where,
    aggregate?: Pipes.Aggregate
  ): Promise<Pipes.ChartSeries> {
    if (!aggregate) {
      throw new BadRequestException('Aggregate query is required');
    }

    // Promise pattern for cleaner async flow
    const dataPromise = aggregate.isGrouped
      ? this.prisma.order.groupBy: ({
          where,
          ...aggregate.prismaQuery,
        })
      : this.prisma.order.aggregate({
          where,
          ...aggregate.prismaQuery,
        });

    return dataPromise.then(data => AggregatePipe.toChartSeries(data, aggregate));
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
| `AggregatePipe` | Aggregations with chart support ⭐ NEW                        | 2.4+    |

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

⭐ **NEW in v2.4.0** - Powerful aggregations with chart-ready transformations!  
🚀 **ENHANCED in v2.4.1** - Grouped time series support!

Parse aggregate queries and transform results into chart-ready format with automatic time series support and flexible grouping.

```ts
@Query('aggregate', AggregatePipe) aggregate?: Pipes.Aggregate
```

### 🎯 Query Format

```
aggregate=field1: function(params), field2: function(), groupBy: (field1, field2), chart: type(options)
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

| Type    | Use Case                           | Grouping Support        |
| ------- | ---------------------------------- | ----------------------- |
| `bar`   | Compare values across categories   | ✅ Multi-series support |
| `line`  | Show trends over time              | ✅ Multi-line trends    |
| `pie`   | Show proportions                   | ⚠️ Single metric only   |
| `area`  | Filled trend visualization         | ✅ Stacked areas        |
| `donut` | Modern proportion chart            | ⚠️ Single metric only   |

### 📅 Time Intervals

| Interval | Description                    | Data Points |
| -------- | ------------------------------ | ----------- |
| `day`    | Group by day                   | 365 points  |
| `month`  | Group by month                 | 12 points   |
| `year`   | Group by year                  | 5 points    |

### 🎨 Chart Options

| Option       | Syntax                         | Description                      |
| ------------ | ------------------------------ | -------------------------------- |
| Horizontal   | `bar(field, horizontal)`       | Horizontal bar orientation       |
| Stacked      | `bar(field, stacked)`          | Stack multiple series            |
| Time Series  | `line(dateField, month)`       | Time-based X-axis                |
| Group Field  | `bar(category)`                | Explicit field for categories    |

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
// orders.service.ts
@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrderStats(aggregate: Pipes.Aggregate) {
    return this.prisma.order.aggregate(aggregate.prismaQuery)
      .then(data => AggregatePipe.toChartSeries(data, aggregate));
  }
}

// Controller
@Get('stats')
async getStats(@Query('aggregate', AggregatePipe) aggregate?: Pipes.Aggregate) {
  return this.orderService.getOrderStats(aggregate);
}
```

**Response:**
```json
{
  "categories": ["Total"],
  "series": [
    { "name": "sum(revenue)", "data": [125000] },
    { "name": "count(orders)", "data": [450] }
  ],
  "chartType": null,
  "raw": [{ "_sum": { "revenue": 125000 }, "_count": 450 }]
}
```

#### 2. Grouped Aggregation (Category Breakdown)

```url
?where=marketingMasterCategory.category: in array(COM,O4W,O2W,OES,EXX)
&aggregate=qty: sum(), recQty: sum(), groupBy: (marketingMasterCategory.category), chart: bar
```

**What This Does:**
- Filters to 5 specific categories
- Groups data by category
- Sums qty and recQty for each category
- Returns bar chart format

**Response:**
```json
{
  "categories": ["COM", "O4W", "O2W", "OES", "EXX"],
  "series": [
    { "name": "sum(qty)", "data": [1500, 2300, 1800, 2900, 2100] },
    { "name": "sum(recQty)", "data": [1400, 2200, 1750, 2800, 2050] }
  ],
  "chartType": "bar",
  "raw": [...]
}
```

**Visual Result:**
```
Bar Chart:
         ┌─────┬─────┬─────┬─────┬─────┐
   3000 ─┤     │ ████│     │ ████│     │
   2000 ─┤ ████│ ████│ ████│ ████│ ████│
   1000 ─┤ ████│ ████│ ████│ ████│ ████│
      0 ─┴─────┴─────┴─────┴─────┴─────┴
         COM   O4W   O2W   OES   EXX
         
Legend: ■ sum(qty)  ■ sum(recQty)
```

#### 3. 🚀 Grouped Time Series (NEW in v2.4.1)

**Example: Sales Trend per Category**

```url
?where=marketingMasterCategory.category: in array(COM,O4W,O2W,OES,EXX)
&aggregate=qty: sum(), groupBy: (marketingMasterCategory.category, createdAt), chart: line(createdAt, month)
```

**What This Does:**
- Filters to 5 categories
- Groups by BOTH category AND createdAt
- Shows monthly trend for EACH category
- Creates separate line for each category

**Response:**
```json
{
  "categories": ["Jan 2024", "Feb 2024", "Mar 2024", "Apr 2024", "May 2024", "Jun 2024", "Jul 2024", "Aug 2024", "Sep 2024", "Oct 2024", "Nov 2024", "Dec 2024"],
  "series": [
    { "name": "COM - sum(qty)", "data": [100, 120, 115, 130, 125, 140, 135, 145, 150, 155, 160, 165] },
    { "name": "O4W - sum(qty)", "data": [200, 180, 210, 195, 220, 205, 230, 215, 240, 225, 250, 235] },
    { "name": "O2W - sum(qty)", "data": [150, 160, 155, 170, 165, 180, 175, 190, 185, 195, 200, 205] },
    { "name": "OES - sum(qty)", "data": [300, 320, 310, 340, 330, 360, 350, 380, 370, 390, 400, 410] },
    { "name": "EXX - sum(qty)", "data": [250, 240, 260, 255, 270, 265, 280, 275, 290, 285, 300, 295] }
  ],
  "chartType": "line",
  "raw": [...]
}
```

**Visual Result:**
```
Line Chart:
400 ─                                      ╱─
350 ─                          ╱───────╱─
300 ─        ╱─────────────╱─         
250 ─    ╱─                         ╱───────
200 ─╱─                     ╱───────
150 ─                   ╱─
    ┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───
    Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec

Legend:
─ COM    ─ O4W    ─ O2W    ─ OES    ─ EXX
```

#### 4. Multiple Metrics per Category Over Time

```url
?aggregate=qty: sum(), recQty: sum(), groupBy: (category, createdAt), chart: line(createdAt, month)
```

**Result:**
- 2 metrics × N categories = 2N lines
- Example with 3 categories = 6 lines:
  - Category A - sum(qty)
  - Category A - sum(recQty)
  - Category B - sum(qty)
  - Category B - sum(recQty)
  - Category C - sum(qty)
  - Category C - sum(recQty)

#### 5. Stacked Area Chart (Market Share Evolution)

```url
?aggregate=revenue: sum(), groupBy: (category, createdAt), chart: area(createdAt, month, stacked)
```

**Visual Result:**
```
Stacked Area Chart:
500 ─                                      ╱▓▓▓
450 ─                          ╱▓▓▓▓▓▓▓▓▓▓▓
400 ─        ╱▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
350 ─    ╱▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
300 ─╱░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
    ┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───
    Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec

Legend: ░ Category A  ▒ Category B  ▓ Category C
```

**Perfect For:**
- See total revenue growth
- Understand each category's contribution
- Identify growing/shrinking market shares

#### 6. Horizontal Bar (Better for Many Categories)

```url
?aggregate=qty: sum(), groupBy: (marketingMasterCategory.category), chart: bar(marketingMasterCategory.category, horizontal)
```

**Visual Result:**
```
Horizontal Bar Chart:

EXX    ████████████████████████ 2100
OES    ██████████████████████████████ 2900
O2W    ██████████████████ 1800
O4W    ███████████████████████ 2300
COM    ███████████████ 1500
       └─────┴─────┴─────┴─────┴─────┘
       0    1000  2000  3000  4000  5000
```

#### 7. Filtered Aggregation (with WherePipe)

```url
?where=status: string(completed), createdAt: gte date(2024-01-01)&aggregate=total: sum(), chart: line(createdAt, month)
```

**Service Code:**
```ts
// orders.service.ts
@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async getFilteredStats(
    where: Pipes.Where,
    aggregate: Pipes.Aggregate
  ): Promise<Pipes.ChartSeries> {
    return this.prisma.order.groupBy: ({
      where, // Filter completed orders from 2024
      ...aggregate.prismaQuery
    }).then(data => AggregatePipe.toChartSeries(data, aggregate));
  }
}
```

### 🎨 Chart Integration Examples

#### With Recharts (React)
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

function TrendChart({ data }: { data: Pipes.ChartSeries }) {
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
        <Line 
          key={i} 
          type="monotone" 
          dataKey={s.name} 
          stroke={`hsl(${i * 360 / data.series.length}, 70%, 50%)`}
          strokeWidth={2}
        />
      ))}
    </LineChart>
  );
}

// Usage:
<TrendChart data={chartSeries} />
```

#### With Chart.js
```ts
import { Chart } from 'chart.js';

function createGroupedTimeSeriesChart(ctx: HTMLCanvasElement, data: Pipes.ChartSeries) {
  return new Chart(ctx, {
    type: data.chartType || 'line',
    data: {
      labels: data.categories,
      datasets: data.series.map((s, i) => ({
        label: s.name,
        data: s.data,
        backgroundColor: `hsla(${i * 360 / data.series.length}, 70%, 50%, 0.2)`,
        borderColor: `hsl(${i * 360 / data.series.length}, 70%, 50%)`,
        borderWidth: 2,
        fill: data.stacked
      }))
    },
    options: {
      scales: {
        y: {
          stacked: data.stacked,
          beginAtZero: true
        },
        x: {
          stacked: data.stacked
        }
      }
    }
  });
}
```

### 🔥 Real-World Use Cases

#### 1. E-commerce Dashboard
```url
?where=status: string(paid)
&aggregate=revenue: sum(), orders: count(), avgOrder: avg(), groupBy: (category, paidAt), chart: line(paidAt, month)
```

**Use Case:** Track revenue, order count, and average order value per category monthly

#### 2. Regional Sales Performance
```url
?aggregate=sales: sum(), groupBy: (region, createdAt), chart: area(createdAt, month, stacked)
```

**Use Case:** See market share evolution across regions

#### 3. Product Category Ranking
```url
?aggregate=units: sum(), groupBy: (category), chart: bar(category, horizontal)
```

**Use Case:** Rank categories by total units sold (easy to read with horizontal bars)

#### 4. Multi-Product Trend Analysis
```url
?where=productId: in array(101,102,103,104,105)
&aggregate=qty: sum(), revenue: sum(), groupBy: (productId, orderDate), chart: line(orderDate, month)
```

**Use Case:** Compare 5 products' performance over time (10 lines: 2 metrics × 5 products)

#### 5. Seasonal Pattern Detection
```url
?where=year: in array(int(2023), int(2024))
&aggregate=revenue: sum(), groupBy: (category, createdAt), chart: line(createdAt, month)
```

**Use Case:** Compare this year vs last year patterns per category

### 💡 Best Practices

1. **Choose Right Chart Type:**
   - `line` - Trends over time, grouped time series
   - `bar` - Category comparisons
   - `area` with `stacked` - Market share evolution
   - `horizontal` - Better readability for many categories
   - `pie`/`donut` - Proportions (single metric only)

2. **Grouping Strategy:**
   - Single group: Simple category breakdown
   - Group + Time: Trends per category/region/product
   - Multiple metrics: Compare metrics side-by-side per group
   - Nested fields: Support `marketingMasterCategory.category` for complex schemas

3. **Performance Optimization:**
   - Use `month` interval for yearly trends (12 points)
   - Use `day` only for detailed short-term analysis (30-90 days)
   - Filter with `where` before aggregating to reduce data processing
   - Limit categories in grouped time series (5-10 max for readability)

4. **Time Series Tips:**
   - Always include dateField in groupBy for time series
   - Gaps are automatically filled with 0
   - Use UTC timezone for consistency
   - Combine with `where` for date range filtering

5. **Chart Visualization:**
   - Stacked charts: Show total + breakdown
   - Multiple series: Compare trends (limit to 5-10 lines)
   - Horizontal bars: Better for long category names
   - Tooltips: Use series names for clarity

### ⚠️ Important Notes

- **Grouped Time Series** requires groupBy with both category field AND date field
- Time series automatically fills gaps with 0 (e.g., if no data for March, value = 0)
- Uses UTC timezone for consistent date handling
- `isGrouped: true` requires Prisma `groupBy: ()`, `false` uses `aggregate()`
- Chart metadata is optional - you can aggregate without charts
- Raw Prisma data included in `raw` property for custom processing
- Series names format: `"GroupValue - function(field)"` for grouped time series

### 🆚 Comparison: Regular vs Grouped Time Series

| Feature | Regular Time Series | Grouped Time Series |
|---------|-------------------|-------------------|
| Query | `chart: line(createdAt, month)` | `groupBy: (category, createdAt), chart: line(createdAt, month)` |
| Series Count | 1 per aggregate | N × aggregates (N = number of groups) |
| Use Case | Overall trend | Compare trends across groups |
| Example | Total monthly revenue | Revenue per category monthly |
| Series Names | `"sum(revenue)"` | `"Electronics - sum(revenue)"`, `"Books - sum(revenue)"` |

**Example Comparison:**

**Regular:**
```url
?aggregate=revenue: sum(), chart: line(createdAt, month)
```
→ 1 line showing total revenue trend

**Grouped:**
```url
?aggregate=revenue: sum(), groupBy: (category, createdAt), chart: line(createdAt, month)
```
→ N lines (one per category) showing revenue trend for each category

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

#### Aggregate + Where: Category Performance Analysis
```url
?where=marketingMasterCategory.category:in array(COM,O4W,O2W,OES,EXX),createdAt:gte date(2024-01-01)
&aggregate=qty:sum(),revenue:sum(),groupBy: (marketingMasterCategory.category,createdAt),chart:line(createdAt,month)
```

**What This Does:**
1. Filters to 5 specific categories
2. Filters to orders from 2024 onwards
3. Groups by category AND month
4. Shows qty and revenue trends for each category
5. Result: 10 lines (5 categories × 2 metrics)

[↑ Back to top](#-table-of-contents)

---

## 🗺 Roadmap – Next Pipes

| Pipe             | Description                                                       | Status     |
| ---------------- | ----------------------------------------------------------------- | ---------- |
| `DistinctPipe`   | Parse `distinct` query param into Prisma `distinct` array        | 🟡 Planned |
| `PaginationPipe` | Parse `skip` & `take` (or `page` & `limit`) into pagination      | 🟡 Planned |
| `GroupByPipe`    | Parse `groupBy` queries into Prisma `groupBy` options            | 🔵 Done ✅ |
| `HavingPipe`     | Support SQL-like `having` filters after grouping                 | 🟡 Planned |
| `CountPipe`      | Shortcut to request `count` results alongside data               | 🟡 Planned |

✅ **Available Now:** `WherePipe`, `OrderByPipe`, `SelectPipe`, `IncludePipe`, `AggregatePipe` (with groupBy support)

[↑ Back to top](#-table-of-contents)

---

## 📊 Complete Example: Sales Dashboard

Here's a complete example combining multiple pipes for a powerful sales dashboard:

### API Endpoints

```ts
// orders.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { OrderService } from './order.service';
import {
  Pipes,
  WherePipe,
  OrderByPipe,
  AggregatePipe,
} from '@dwcahyo/nestjs-prisma-pipes';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // 1. List orders with filtering and sorting
  @Get()
  async findAll(
    @Query('where', WherePipe) where?: Pipes.Where,
    @Query('orderBy', OrderByPipe) orderBy?: Pipes.Order,
    @Query('skip') skip?: string,
    @Query('take') take?: string
  ) {
    return this.orderService.findAll({
      where,
      orderBy,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : 20,
    });
  }

  // 2. Total stats (no grouping)
  @Get('stats/total')
  async getTotalStats(
    @Query('where', WherePipe) where?: Pipes.Where,
    @Query('aggregate', AggregatePipe) aggregate?: Pipes.Aggregate
  ) {
    return this.orderService.getTotalStats(where, aggregate);
  }

  // 3. Category breakdown
  @Get('stats/by-category')
  async getByCategory(
    @Query('where', WherePipe) where?: Pipes.Where,
    @Query('aggregate', AggregatePipe) aggregate?: Pipes.Aggregate
  ) {
    return this.orderService.getCategoryStats(where, aggregate);
  }

  // 4. Time series trends
  @Get('stats/trends')
  async getTrends(
    @Query('where', WherePipe) where?: Pipes.Where,
    @Query('aggregate', AggregatePipe) aggregate?: Pipes.Aggregate
  ) {
    return this.orderService.getTrendStats(where, aggregate);
  }

  // 5. Grouped time series (category trends)
  @Get('stats/category-trends')
  async getCategoryTrends(
    @Query('where', WherePipe) where?: Pipes.Where,
    @Query('aggregate', AggregatePipe) aggregate?: Pipes.Aggregate
  ) {
    return this.orderService.getCategoryTrends(where, aggregate);
  }
}
```

### Service Implementation

```ts
// orders.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Pipes, AggregatePipe } from '@dwcahyo/nestjs-prisma-pipes';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: {
    where?: Pipes.Where;
    orderBy?: Pipes.Order;
    skip?: number;
    take?: number;
  }) {
    return this.prisma.order.findMany({
      ...query,
      include: {
        customer: {
          select: { id: true, name: true, email: true }
        },
        items: true
      }
    });
  }

  async getTotalStats(
    where?: Pipes.Where,
    aggregate?: Pipes.Aggregate
  ): Promise<Pipes.ChartSeries> {
    if (!aggregate) {
      throw new BadRequestException('Aggregate query required');
    }

    return this.prisma.order
      .aggregate({
        where,
        ...aggregate.prismaQuery,
      })
      .then(data => AggregatePipe.toChartSeries(data, aggregate));
  }

  async getCategoryStats(
    where?: Pipes.Where,
    aggregate?: Pipes.Aggregate
  ): Promise<Pipes.ChartSeries> {
    if (!aggregate || !aggregate.isGrouped) {
      throw new BadRequestException('Grouped aggregate query required');
    }

    return this.prisma.order
      .groupBy: ({
        where,
        ...aggregate.prismaQuery,
      })
      .then(data => AggregatePipe.toChartSeries(data, aggregate));
  }

  async getTrendStats(
    where?: Pipes.Where,
    aggregate?: Pipes.Aggregate
  ): Promise<Pipes.ChartSeries> {
    if (!aggregate || !aggregate.isGrouped) {
      throw new BadRequestException('Time series aggregate required');
    }

    return this.prisma.order
      .groupBy: ({
        where,
        ...aggregate.prismaQuery,
      })
      .then(data => AggregatePipe.toChartSeries(data, aggregate));
  }

  async getCategoryTrends(
    where?: Pipes.Where,
    aggregate?: Pipes.Aggregate
  ): Promise<Pipes.ChartSeries> {
    if (!aggregate || !aggregate.isGrouped) {
      throw new BadRequestException('Grouped time series required');
    }

    return this.prisma.order
      .groupBy: ({
        where,
        ...aggregate.prismaQuery,
      })
      .then(data => AggregatePipe.toChartSeries(data, aggregate));
  }
}
```

### Usage Examples

#### 1. Total Revenue & Orders (This Year)
```bash
GET /orders/stats/total?where=createdAt:gte date(2024-01-01)&aggregate=revenue:sum(),orders:count()
```

**Response:**
```json
{
  "categories": ["Total"],
  "series": [
    { "name": "sum(revenue)", "data": [1250000] },
    { "name": "count(orders)", "data": [4523] }
  ]
}
```

#### 2. Revenue by Category
```bash
GET /orders/stats/by-category?where=status:string(completed)&aggregate=revenue:sum(),orders:count(),groupBy: (category),chart:bar(category,horizontal)
```

**Response:**
```json
{
  "categories": ["Electronics", "Books", "Clothing", "Food", "Toys"],
  "series": [
    { "name": "sum(revenue)", "data": [450000, 280000, 320000, 150000, 50000] },
    { "name": "count(orders)", "data": [1200, 950, 1500, 800, 73] }
  ],
  "chartType": "bar",
  "horizontal": true
}
```

#### 3. Monthly Revenue Trend
```bash
GET /orders/stats/trends?where=createdAt:gte date(2024-01-01)&aggregate=revenue:sum(),orders:count(),chart:line(createdAt,month)
```

**Response:**
```json
{
  "categories": ["Jan 2024", "Feb 2024", "Mar 2024", "Apr 2024", "May 2024", "Jun 2024", "Jul 2024", "Aug 2024", "Sep 2024", "Oct 2024", "Nov 2024", "Dec 2024"],
  "series": [
    { "name": "sum(revenue)", "data": [95000, 102000, 98000, 110000, 115000, 125000, 118000, 130000, 128000, 135000, 142000, 152000] },
    { "name": "count(orders)", "data": [320, 340, 315, 365, 380, 410, 390, 425, 420, 445, 465, 498] }
  ],
  "chartType": "line"
}
```

#### 4. 🚀 Category Performance Over Time (NEW!)
```bash
GET /orders/stats/category-trends?where=category:in array(Electronics,Books,Clothing)&aggregate=revenue:sum(),groupBy: (category,createdAt),chart:line(createdAt,month)
```

**Response:**
```json
{
  "categories": ["Jan 2024", "Feb 2024", "Mar 2024", "Apr 2024", "May 2024", "Jun 2024", "Jul 2024", "Aug 2024", "Sep 2024", "Oct 2024", "Nov 2024", "Dec 2024"],
  "series": [
    { "name": "Electronics - sum(revenue)", "data": [42000, 45000, 43000, 48000, 52000, 55000, 51000, 58000, 57000, 60000, 63000, 68000] },
    { "name": "Books - sum(revenue)", "data": [21000, 23000, 22000, 24000, 25000, 27000, 26000, 28000, 29000, 30000, 31000, 34000] },
    { "name": "Clothing - sum(revenue)", "data": [28000, 30000, 29000, 32000, 33000, 36000, 35000, 38000, 37000, 39000, 41000, 44000] }
  ],
  "chartType": "line"
}
```

#### 5. Market Share Evolution (Stacked Area)
```bash
GET /orders/stats/category-trends?where=status:string(completed)&aggregate=revenue:sum(),groupBy: (category,createdAt),chart:area(createdAt,month,stacked)
```

**Response:**
```json
{
  "categories": ["Jan 2024", "Feb 2024", ..., "Dec 2024"],
  "series": [
    { "name": "Electronics - sum(revenue)", "data": [...] },
    { "name": "Books - sum(revenue)", "data": [...] },
    { "name": "Clothing - sum(revenue)", "data": [...] },
    { "name": "Food - sum(revenue)", "data": [...] },
    { "name": "Toys - sum(revenue)", "data": [...] }
  ],
  "chartType": "area",
  "stacked": true
}
```

[↑ Back to top](#-table-of-contents)

---

## 📝 License

MIT

---

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/dwcahyo/nestjs-prisma-pipes.git

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

---

## 🙏 Acknowledgments

Special thanks to:
- NestJS team for the amazing framework
- Prisma team for the excellent ORM
- All contributors and users of this library

---

## 📧 Support

- 📫 Issues: [GitHub Issues](https://github.com/dwcahyo/nestjs-prisma-pipes/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/dwcahyo/nestjs-prisma-pipes/discussions)
- 📖 Documentation: [GitHub Wiki](https://github.com/dwcahyo/nestjs-prisma-pipes/wiki)

---

✨ **With `@dwcahyo/nestjs-prisma-pipes`, you write less boilerplate and let your users build powerful dynamic queries right from the URL.**

🚀 **NEW in v2.4.1:** Grouped time series support lets you compare trends across categories, regions, products, and more - all with a simple query string!

[↑ Back to top](#-table-of-contents)