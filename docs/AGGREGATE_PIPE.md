# AggregatePipe - Complete Documentation

Transform query strings into Prisma aggregations with powerful grouping and chart generation capabilities.

---

## 📖 Table of Contents

- [Overview](#overview)
- [Basic Usage](#basic-usage)
- [Aggregate Functions](#aggregate-functions)
- [Alias Support](#alias-support)
- [Grouping](#grouping)
- [Chart Generation](#chart-generation)
- [Time Series](#time-series)
- [Advanced Examples](#advanced-examples)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)

---

## Overview

AggregatePipe provides:

- ✅ 5 aggregate functions (sum, avg, min, max, count)
- ✅ **Custom alias for series names**
- ✅ Multi-field grouping
- ✅ Relationship aggregation
- ✅ **Many-to-many pivot table aggregation**
- ✅ Chart generation (5 chart types)
- ✅ Time series analysis (day, month, year)
- ✅ Timezone-aware grouping
- ✅ Automatic data transformation

---

## Basic Usage

### Controller Setup

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { 
  WherePipe, 
  AggregatePipe, 
  Pipes 
} from '@dwcahyo/nestjs-prisma-pipes';

@Controller('analytics')
export class AnalyticsController {
  constructor(private prisma: PrismaService) {}

  @Get('sales')
  async getSalesStats(
    @Query('filter', WherePipe) where?: Pipes.Where,
    @Query('aggregate', AggregatePipe) aggregate?: Pipes.Aggregate,
  ): Promise<Pipes.ChartSeries> {
    const model = this.prisma.order;
    const data = await AggregatePipe.execute(model, aggregate, where);
    return AggregatePipe.toChartSeries(data, aggregate);
  }
}
```

### Simple Queries

```bash
# Total revenue
GET /analytics/sales?aggregate=total:sum()

# Average order value
GET /analytics/sales?aggregate=total:avg()

# Count orders
GET /analytics/sales?aggregate=id:count()

# Multiple aggregates
GET /analytics/sales?aggregate=total:sum(),orders:count(),avgValue:avg()
```

---

## Aggregate Functions

### sum() - Calculate Sum

```bash
# Total revenue
GET /analytics/sales?aggregate=revenue:sum()

# Total quantity sold
GET /analytics/sales?aggregate=quantity:sum()
```

**Query output:**
```typescript
{
  prismaQuery: {
    _sum: { revenue: true, quantity: true }
  }
}
```

**Result:**
```typescript
{
  categories: ['Total'],
  series: [
    { name: 'sum(revenue)', data: [15000] },
    { name: 'sum(quantity)', data: [250] }
  ]
}
```

### avg() - Calculate Average

```bash
# Average order value
GET /analytics/sales?aggregate=total:avg()

# Average rating
GET /analytics/products?aggregate=rating:avg()
```

**Result:**
```typescript
{
  categories: ['Average'],
  series: [
    { name: 'avg(total)', data: [125.50] }
  ]
}
```

### min() - Find Minimum

```bash
# Lowest price
GET /analytics/products?aggregate=price:min()

# Earliest order date
GET /analytics/orders?aggregate=orderDate:min()
```

### max() - Find Maximum

```bash
# Highest price
GET /analytics/products?aggregate=price:max()

# Latest order date
GET /analytics/orders?aggregate=orderDate:max()
```

### count() - Count Records

```bash
# Total orders
GET /analytics/orders?aggregate=id:count()

# Count by status
GET /analytics/orders?aggregate=id:count(),groupBy:(status)
```

**Result:**
```typescript
{
  categories: ['pending', 'completed', 'cancelled'],
  series: [
    { name: 'count(id)', data: [15, 125, 8] }
  ]
}
```

---

## Alias Support

Customize series names with user-friendly labels using the `:alias()` syntax.

### Basic Alias Usage

```bash
# Single aggregate with alias
GET /analytics/sales?aggregate=revenue:sum():alias(Total Revenue)

# Multiple aggregates with aliases
GET /analytics/sales?aggregate=revenue:sum():alias(Total Revenue),orders:count():alias(Order Count)
```

**Without Alias:**
```typescript
{
  categories: ['Total'],
  series: [
    { name: 'sum(revenue)', data: [15000] }
  ]
}
```

**With Alias:**
```typescript
{
  categories: ['Total'],
  series: [
    { name: 'Total Revenue', data: [15000] }
  ]
}
```

### Mixed Usage

You can mix aliases and default names in the same query:

```bash
# Some with alias, some without
GET /analytics/sales?aggregate=revenue:sum():alias(Total Revenue),quantity:sum(),avgValue:avg():alias(Average Value)
```

**Result:**
```typescript
{
  categories: ['Total'],
  series: [
    { name: 'Total Revenue', data: [15000] },      // ✅ With alias
    { name: 'sum(quantity)', data: [250] },         // ✅ Default name
    { name: 'Average Value', data: [125.50] }       // ✅ With alias
  ]
}
```

### Alias with Grouping

Aliases work seamlessly with grouped data:

```bash
# Grouped by category with alias
GET /analytics/sales?aggregate=revenue:sum():alias(Revenue),groupBy:(category)
```

**Result:**
```typescript
{
  categories: ['Electronics', 'Clothing', 'Books'],
  series: [
    { name: 'Revenue', data: [5000, 3000, 2000] }
  ]
}
```

### Alias with Time Series

```bash
# Monthly revenue with custom name
GET /analytics/sales?aggregate=revenue:sum():alias(Monthly Revenue),chart:line(orderDate,month:2025)
```

**Result:**
```typescript
{
  categories: ['Jan', 'Feb', 'Mar', ...],
  series: [
    { name: 'Monthly Revenue', data: [5000, 6000, 7500, ...] }
  ],
  chartType: 'line'
}
```

### Multiple Series with Aliases

Perfect for dashboard KPIs:

```bash
# Performance metrics with readable names
GET /analytics/performance?aggregate=s:avg():alias(Safety Score),p:avg():alias(Productivity),pd:avg():alias(Performance)
```

**Result:**
```typescript
{
  categories: ['Total'],
  series: [
    { name: 'Safety Score', data: [45.5] },
    { name: 'Productivity', data: [85.3] },
    { name: 'Performance', data: [92.1] }
  ]
}
```

### Alias with Grouped Time Series

When combining grouping with time series:

```bash
# Revenue by status over time with alias
GET /analytics/sales?aggregate=revenue:sum():alias(Revenue),groupBy:(status),chart:line(orderDate,month:2025)
```

**Result:**
```typescript
{
  categories: ['Jan', 'Feb', 'Mar', ...],
  series: [
    { name: 'completed - Revenue', data: [4000, 5000, 6000, ...] },
    { name: 'pending - Revenue', data: [800, 900, 1200, ...] },
    { name: 'cancelled - Revenue', data: [200, 100, 300, ...] }
  ],
  chartType: 'line'
}
```

**Note:** When grouping is combined with aliases, the group value is prepended to the alias name for clarity.

### Alias Best Practices

```bash
# ✅ Good - Clear, descriptive names
GET /analytics?aggregate=revenue:sum():alias(Total Sales),orders:count():alias(Number of Orders)

# ✅ Good - Short names for charts
GET /analytics?aggregate=s:avg():alias(Safety),p:avg():alias(Productivity)

# ✅ Good - Localized names (if needed)
GET /analytics?aggregate=revenue:sum():alias(Pendapatan Total)

# ❌ Bad - Too long
GET /analytics?aggregate=revenue:sum():alias(The Total Revenue Generated From All Orders This Year)

# ❌ Bad - Special characters that might break
GET /analytics?aggregate=revenue:sum():alias(Revenue (in $))
```

### Alias Syntax Rules

- ✅ Syntax: `field:function():alias(Custom Name)`
- ✅ Alias is optional - defaults to `function(field)`
- ✅ Can be mixed with non-aliased aggregates
- ✅ Works with all aggregate functions
- ✅ Works with grouping and time series
- ✅ Spaces are allowed in alias names
- ⚠️ Avoid special characters like `()[]{}` in alias names

---

## Grouping

### Single Field Grouping

```bash
# Revenue by category
GET /analytics/sales?aggregate=revenue:sum(),groupBy:(category)

# Orders by status
GET /analytics/orders?aggregate=id:count(),groupBy:(status)
```

**Query output:**
```typescript
{
  prismaQuery: {
    by: ['category'],
    _sum: { revenue: true }
  },
  groupBy: ['category']
}
```

**Result:**
```typescript
{
  categories: ['Electronics', 'Clothing', 'Books'],
  series: [
    { name: 'sum(revenue)', data: [5000, 3000, 2000] }
  ]
}
```

### Multiple Field Grouping

```bash
# Revenue by region and status
GET /analytics/sales?aggregate=revenue:sum(),groupBy:(region,status)

# Orders by category and payment method
GET /analytics/orders?aggregate=id:count(),groupBy:(category,paymentMethod)
```

**Result with multi-level grouping:**
```typescript
{
  categories: ['Asia-Completed', 'Asia-Pending', 'Europe-Completed'],
  series: [
    { name: 'sum(revenue)', data: [8000, 2000, 5000] }
  ]
}
```

### Relationship Grouping

AggregatePipe automatically handles relationship aggregations:

```bash
# Revenue by warehouse region (relationship)
GET /analytics/sales?aggregate=revenue:sum(),groupBy:(warehouse.region)

# Orders by customer city
GET /analytics/orders?aggregate=id:count(),groupBy:(customer.city)
```

**Important:** Uses manual aggregation internally when relationships are detected.

### Many-to-Many Pivot Table Grouping

AggregatePipe automatically handles many-to-many relationships through pivot tables:
```bash
# Average performance by leader (through pivot table)
GET /analytics/performance?aggregate=s:avg(),p:avg(),pd:avg(),groupBy:(productionEmployeePerformanceLeaders.leaderNik)

# Performance by machine (many-to-many)
GET /analytics/performance?aggregate=output:sum(),groupBy:(productionEmployeePerformanceMachine.mcCode)

# With chart visualization and aliases
GET /analytics/performance?aggregate=s:avg():alias(Safety),p:avg():alias(Productivity),pd:avg():alias(Performance),groupBy:(productionEmployeePerformanceLeaders.leaderNik),chart:radar(productionEmployeePerformanceLeaders.leaderNik)
```

**How it works:**
- Automatically detects array relationships in groupBy
- Flattens pivot table records for proper aggregation
- Each pivot record is treated as separate data point

**Example Schema:**
```prisma
model ProductionEmployeePerformance {
  id         String
  s          Float
  p          Float
  pd         Float
  
  // Many-to-many through pivot
  productionEmployeePerformanceLeaders ProductionEmployeePerformanceLeader[]
}

model ProductionEmployeePerformanceLeader {
  id            String
  performanceId String
  leaderNik     String
  
  performance ProductionEmployeePerformance @relation(...)
  leader      MasterUser @relation(...)
}
```

**Result:**
```typescript
{
  categories: ['NIK001', 'NIK002', 'NIK003'],
  series: [
    { name: 'Safety', data: [45.5, 38.2, 42.1] },
    { name: 'Productivity', data: [85.3, 78.9, 82.4] },
    { name: 'Performance', data: [92.1, 88.5, 90.3] }
  ],
  chartType: 'radar'
}
```

**Important:** 
- Uses manual aggregation internally for pivot tables
- One performance record with 3 leaders = 3 separate data points in aggregation
- Ideal for analyzing relationships like "performance by leader" or "orders by tag"

---

## Chart Generation

### Chart Types

| Type | Description | Use Case |
|------|-------------|----------|
| `bar` | Vertical bars | Category comparison |
| `line` | Line graph | Trends over time |
| `area` | Filled area | Cumulative trends |
| `pie` | Circular pie | Proportions |
| `donut` | Donut chart | Proportions with center space |

### Bar Charts

```bash
# Revenue by category
GET /analytics/sales?aggregate=revenue:sum(),chart:bar(category)

# Horizontal bar chart
GET /analytics/sales?aggregate=revenue:sum(),chart:bar(category,horizontal)

# Stacked bar chart with multiple series
GET /analytics/sales?aggregate=revenue:sum(),groupBy:(region,status),chart:bar(region,stacked)
```

**Output:**
```typescript
{
  categories: ['Electronics', 'Clothing', 'Books'],
  series: [
    { name: 'sum(revenue)', data: [5000, 3000, 2000] }
  ],
  chartType: 'bar',
  stacked: false,
  horizontal: false
}
```

### Line Charts

```bash
# Monthly revenue trend
GET /analytics/sales?aggregate=revenue:sum(),chart:line(orderDate,month:2025)

# Daily orders
GET /analytics/orders?aggregate=id:count(),chart:line(createdAt,day:2025)
```

**Output:**
```typescript
{
  categories: ['Jan', 'Feb', 'Mar', 'Apr', ...],
  series: [
    { name: 'sum(revenue)', data: [5000, 6000, 7500, ...] }
  ],
  chartType: 'line'
}
```

### Area Charts

```bash
# Cumulative sales over time
GET /analytics/sales?aggregate=revenue:sum(),chart:area(orderDate,month:2025)

# Stacked area by status
GET /analytics/sales?aggregate=revenue:sum(),groupBy:(status),chart:area(orderDate,month:2025,stacked)
```

### Pie & Donut Charts

```bash
# Revenue distribution by category
GET /analytics/sales?aggregate=revenue:sum(),groupBy:(category),chart:pie(category)

# Market share donut
GET /analytics/sales?aggregate=revenue:sum(),groupBy:(region),chart:donut(region)
```

**Output:**
```typescript
{
  categories: ['Electronics', 'Clothing', 'Books'],
  series: [
    { 
      name: 'sum(revenue)', 
      data: [5000, 3000, 2000] // Automatically calculated as percentages
    }
  ],
  chartType: 'pie'
}
```

---

## Time Series

### Time Intervals

| Interval | Description | Groups By |
|----------|-------------|-----------|
| `day` | Daily grouping | Each day |
| `month` | Monthly grouping | Each month |
| `year` | Yearly grouping | Each year |

### Daily Time Series

```bash
# Daily revenue for 2025
GET /analytics/sales?aggregate=revenue:sum(),chart:line(orderDate,day:2025)

# Daily orders with filter and alias
GET /analytics/orders?aggregate=id:count():alias(Daily Orders),chart:line(createdAt,day:2025)&filter=status:completed
```

**Features:**
- Groups by each day of the year
- Respects configured timezone
- Fills missing dates with 0

**Output:**
```typescript
{
  categories: ['2025-01-01', '2025-01-02', '2025-01-03', ...],
  series: [
    { name: 'Daily Orders', data: [1200, 1500, 1350, ...] }
  ],
  chartType: 'line'
}
```

### Monthly Time Series

```bash
# Monthly revenue for 2025
GET /analytics/sales?aggregate=revenue:sum():alias(Monthly Revenue),chart:line(orderDate,month:2025)

# Monthly orders by status (stacked)
GET /analytics/orders?aggregate=id:count():alias(Orders),groupBy:(status),chart:area(createdAt,month:2025,stacked)
```

**Features:**
- Groups by each month (Jan-Dec)
- Year parameter is required
- Timezone-aware month boundaries

**Output:**
```typescript
{
  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  series: [
    { name: 'Monthly Revenue', data: [5000, 6000, 7500, 8000, ...] }
  ],
  chartType: 'line'
}
```

### Yearly Time Series

```bash
# 5-year revenue trend (ending 2025)
GET /analytics/sales?aggregate=revenue:sum():alias(Yearly Revenue),chart:line(orderDate,year:2025)

# Yearly comparison
GET /analytics/sales?aggregate=revenue:sum(),groupBy:(category),chart:bar(orderDate,year:2025)
```

**Features:**
- Shows last 5 years ending with specified year
- Example: year:2025 shows 2021-2025

**Output:**
```typescript
{
  categories: ['2021', '2022', '2023', '2024', '2025'],
  series: [
    { name: 'Yearly Revenue', data: [45000, 52000, 61000, 70000, 85000] }
  ],
  chartType: 'line'
}
```

### Time Series with Grouping

```bash
# Monthly revenue by status (multi-series)
GET /analytics/sales?aggregate=revenue:sum():alias(Revenue),groupBy:(status),chart:line(orderDate,month:2025)

# Daily orders by region (stacked area)
GET /analytics/orders?aggregate=id:count():alias(Orders),groupBy:(region),chart:area(createdAt,day:2025,stacked)
```

**Output with multiple series:**
```typescript
{
  categories: ['Jan', 'Feb', 'Mar', ...],
  series: [
    { name: 'completed - Revenue', data: [4000, 5000, 6000, ...] },
    { name: 'pending - Revenue', data: [800, 900, 1200, ...] },
    { name: 'cancelled - Revenue', data: [200, 100, 300, ...] }
  ],
  chartType: 'line',
  stacked: true
}
```

---

## Advanced Examples

### Sales Analytics Dashboard with Aliases

```typescript
@Controller('analytics')
export class AnalyticsController {
  constructor(private prisma: PrismaService) {}

  // Total revenue with custom name
  @Get('revenue/total')
  async getTotalRevenue(
    @Query('filter', WherePipe) where?: Pipes.Where,
    @Query('aggregate', AggregatePipe) aggregate?: Pipes.Aggregate,
  ) {
    const data = await AggregatePipe.execute(
      this.prisma.order,
      aggregate,
      where
    );
    return AggregatePipe.toChartSeries(data, aggregate);
  }

  // Revenue by region
  @Get('revenue/by-region')
  async getRevenueByRegion(
    @Query('filter', WherePipe) where?: Pipes.Where,
  ) {
    const aggregate = {
      aggregates: [{ 
        field: 'total', 
        function: 'sum', 
        params: [],
        alias: 'Regional Revenue' // ✅ Alias in code
      }],
      groupBy: ['region'],
      chartConfig: { type: 'pie', groupField: 'region' },
    } as Pipes.Aggregate;

    const data = await AggregatePipe.execute(
      this.prisma.order,
      aggregate,
      where
    );
    return AggregatePipe.toChartSeries(data, aggregate);
  }
}
```

**Requests:**
```bash
# Total revenue with alias
GET /analytics/revenue/total?aggregate=total:sum():alias(Total Revenue)&filter=orderDate:gte+date(2025-01-01)

# KPI Dashboard with multiple aliases
GET /analytics/revenue/total?aggregate=total:sum():alias(Revenue),id:count():alias(Orders),total:avg():alias(Avg Order Value)
```

### Employee Performance with Aliases

```typescript
@Controller('performance')
export class PerformanceController {
  constructor(private prisma: PrismaService) {}

  @Get('by-leader')
  async getPerformanceByLeader(
    @Query('filter', WherePipe) where?: Pipes.Where,
    @Query('aggregate', AggregatePipe) aggregate?: Pipes.Aggregate,
  ) {
    const data = await AggregatePipe.execute(
      this.prisma.productionEmployeePerformance,
      aggregate,
      where
    );
    return AggregatePipe.toChartSeries(data, aggregate);
  }
}
```

**Requests:**
```bash
# Performance metrics with readable names
GET /performance/by-leader?aggregate=s:avg():alias(Safety Score),p:avg():alias(Productivity),pd:avg():alias(Performance),groupBy:(productionEmployeePerformanceLeaders.leaderNik),chart:radar(productionEmployeePerformanceLeaders.leaderNik)

# Monthly performance trend
GET /performance/by-leader?aggregate=s:avg():alias(Safety),groupBy:(productionEmployeePerformanceLeaders.leaderNik),chart:line(date,month:2025)
```

**Response:**
```typescript
{
  categories: ['NIK001', 'NIK002', 'NIK003'],
  series: [
    { name: 'Safety Score', data: [45.5, 38.2, 42.1] },
    { name: 'Productivity', data: [85.3, 78.9, 82.4] },
    { name: 'Performance', data: [92.1, 88.5, 90.3] }
  ],
  chartType: 'radar'
}
```

---

## API Reference

### AggregatePipe.execute()

Execute aggregation query against Prisma model.

```typescript
static async execute(
  model: any,
  aggregate: Pipes.Aggregate,
  where?: Pipes.Where
): Promise<any[]>
```

**Parameters:**
- `model` - Prisma model (e.g., `prisma.order`)
- `aggregate` - Aggregate configuration from AggregatePipe
- `where` - Optional where clause for filtering

**Returns:**
- Array of aggregated data

**Example:**
```typescript
const data = await AggregatePipe.execute(
  this.prisma.order,
  aggregate,
  where
);
```

### AggregatePipe.toChartSeries()

Transform aggregated data into chart-ready format.

```typescript
static toChartSeries(
  data: any[],
  aggregate: Pipes.Aggregate
): Pipes.ChartSeries
```

**Parameters:**
- `data` - Aggregated data from `execute()`
- `aggregate` - Aggregate configuration

**Returns:**
- Chart series object with categories and series

**Example:**
```typescript
const chartData = AggregatePipe.toChartSeries(data, aggregate);
```

### Query String Syntax

```
aggregate=field:function(params):alias(name),groupBy:(fields),chart:type(config)
```

**Components:**
- `field:function()` - Aggregate specification
- `:alias(name)` - Optional custom series name
- `groupBy:(fields)` - Optional grouping fields
- `chart:type(config)` - Optional chart configuration

**Examples:**
```
aggregate=revenue:sum()
aggregate=revenue:sum():alias(Total Revenue)
aggregate=price:avg():alias(Average Price),groupBy:(category)
aggregate=total:sum():alias(Monthly Revenue),chart:line(orderDate,month:2025)
aggregate=s:avg():alias(Safety),p:avg():alias(Productivity),groupBy:(leaderNik)
```

---

## Best Practices

### 1. Use Meaningful Aliases for User-Facing Data

```bash
# ✅ Good - Clear names for dashboards
GET /analytics?aggregate=revenue:sum():alias(Total Sales),orders:count():alias(Number of Orders)

# ✅ Good - Short names for charts
GET /analytics?aggregate=s:avg():alias(Safety),p:avg():alias(Productivity)

# ❌ Bad - Default technical names
GET /analytics?aggregate=revenue:sum(),orders:count()
```

### 2. Use Filters to Reduce Data

```bash
# ✅ Good - Filter before aggregation
GET /analytics/sales?aggregate=revenue:sum():alias(YTD Revenue)&filter=orderDate:gte+date(2025-01-01)

# ❌ Bad - Aggregate all data
GET /analytics/sales?aggregate=revenue:sum()
```

### 3. Specify Year for Time Series

```bash
# ✅ Good - Explicit year with alias
GET /analytics/sales?aggregate=revenue:sum():alias(Monthly Sales),chart:line(orderDate,month:2025)

# ❌ Bad - No year
GET /analytics/sales?aggregate=revenue:sum(),chart:line(orderDate,month)
```

### 4. Add Database Indexes

```prisma
// ✅ Good - Index grouped and aggregated fields
model Order {
  id         String   @id
  total      Decimal
  status     String
  region     String
  orderDate  DateTime
  
  @@index([status])
  @@index([region])
  @@index([orderDate])
  @@index([region, status]) // Composite for multi-field grouping
}
```

### 5. Configure Timezone

```typescript
// ✅ Good - Configure at startup
configurePipesTimezone({ offset: '+07:00' });

// Time series will respect timezone boundaries
GET /analytics/sales?aggregate=revenue:sum():alias(Daily Revenue),chart:line(orderDate,day:2025)
```

---

## Common Issues

### Issue 1: Alias Not Appearing

**Problem:**
```bash
# Alias specified but still shows default name
GET /analytics?aggregate=revenue:sum():alias(Total Revenue)

# Result still shows:
{ name: 'sum(revenue)', data: [...] }
```

**Solution:**
Ensure you're using the updated `parseAggregateFunction` and `getSeriesName` helper. The alias feature requires code changes to support the `:alias()` syntax.

### Issue 2: Special Characters in Alias

**Problem:**
```bash
# Alias with parentheses breaks parsing
GET /analytics?aggregate=revenue:sum():alias(Revenue ($))
```

**Solution:**
Avoid special characters like `()[]{}` in alias names. Use simple text:
```bash
# ✅ Good
GET /analytics?aggregate=revenue:sum():alias(Revenue in USD)
```

### Issue 3: Relationship Aggregation Slow

**Problem:**
```bash
# Slow query with relationship grouping
GET /analytics/sales?aggregate=revenue:sum():alias(Regional Revenue),groupBy:(warehouse.region)
```

**Solution:**
- Add indexes on foreign keys
- Use denormalized fields when possible
- Cache frequently accessed aggregations

```prisma
model Order {
  warehouseId    String
  warehouse      Warehouse @relation(fields: [warehouseId], references: [id])
  warehouseRegion String  // Denormalized for faster grouping
  
  @@index([warehouseId])
  @@index([warehouseRegion])
}
```

---

## Related Documentation

- [📖 WherePipe - Filtering](./WHERE_PIPE.md)
- [📖 Timezone Configuration](./TIMEZONE.md)
- [📖 Best Practices](./BEST_PRACTICES.md)
- [📖 API Reference](./API.md)

---

[⬅️ Back to Main Documentation](../README.md)