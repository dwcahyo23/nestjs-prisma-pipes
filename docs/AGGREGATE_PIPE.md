# AggregatePipe - Complete Documentation

Transform query strings into Prisma aggregations with powerful grouping and chart generation capabilities.

---

## 📖 Table of Contents

- [Overview](#overview)
- [Basic Usage](#basic-usage)
- [Aggregate Functions](#aggregate-functions)
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
GET /analytics/sales?aggregate=total:sum(),orders:count(),avgValue:avg(total)
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

# With chart visualization
GET /analytics/performance?aggregate=s:avg(),p:avg(),pd:avg(),groupBy:(productionEmployeePerformanceLeaders.leaderNik),chart:radar(productionEmployeePerformanceLeaders.leaderNik)
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
    { name: 'avg(s)', data: [45.5, 38.2, 42.1] },
    { name: 'avg(p)', data: [85.3, 78.9, 82.4] },
    { name: 'avg(pd)', data: [92.1, 88.5, 90.3] }
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

# Daily orders with filter
GET /analytics/orders?aggregate=id:count(),chart:line(createdAt,day:2025)&filter=status:completed
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
    { name: 'sum(revenue)', data: [1200, 1500, 1350, ...] }
  ],
  chartType: 'line'
}
```

### Monthly Time Series

```bash
# Monthly revenue for 2025
GET /analytics/sales?aggregate=revenue:sum(),chart:line(orderDate,month:2025)

# Monthly orders by status (stacked)
GET /analytics/orders?aggregate=id:count(),groupBy:(status),chart:area(createdAt,month:2025,stacked)
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
    { name: 'sum(revenue)', data: [5000, 6000, 7500, 8000, ...] }
  ],
  chartType: 'line'
}
```

### Yearly Time Series

```bash
# 5-year revenue trend (ending 2025)
GET /analytics/sales?aggregate=revenue:sum(),chart:line(orderDate,year:2025)

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
    { name: 'sum(revenue)', data: [45000, 52000, 61000, 70000, 85000] }
  ],
  chartType: 'line'
}
```

### Time Series with Grouping

```bash
# Monthly revenue by status (multi-series)
GET /analytics/sales?aggregate=revenue:sum(),groupBy:(status),chart:line(orderDate,month:2025)

# Daily orders by region (stacked area)
GET /analytics/orders?aggregate=id:count(),groupBy:(region),chart:area(createdAt,day:2025,stacked)
```

**Output with multiple series:**
```typescript
{
  categories: ['Jan', 'Feb', 'Mar', ...],
  series: [
    { name: 'completed', data: [4000, 5000, 6000, ...] },
    { name: 'pending', data: [800, 900, 1200, ...] },
    { name: 'cancelled', data: [200, 100, 300, ...] }
  ],
  chartType: 'line',
  stacked: true
}
```

---

## Advanced Examples

### Sales Analytics Dashboard

```typescript
@Controller('analytics')
export class AnalyticsController {
  constructor(private prisma: PrismaService) {}

  // Total revenue
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
      aggregates: [{ field: 'total', function: 'sum', params: [] }],
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

  // Monthly trend
  @Get('revenue/monthly')
  async getMonthlyRevenue(
    @Query('year') year = 2025,
  ) {
    const aggregate = {
      aggregates: [{ field: 'total', function: 'sum', params: [] }],
      chartConfig: {
        type: 'line',
        dateField: 'orderDate',
        interval: 'month',
        year: year,
      },
    } as Pipes.Aggregate;

    const data = await AggregatePipe.execute(
      this.prisma.order,
      aggregate
    );
    return AggregatePipe.toChartSeries(data, aggregate);
  }
}
```

**Requests:**
```bash
# Total revenue this year
GET /analytics/revenue/total?aggregate=total:sum()&filter=orderDate:gte+date(2025-01-01)

# Revenue by region
GET /analytics/revenue/by-region

# Monthly revenue for 2025
GET /analytics/revenue/monthly?year=2025

# Monthly revenue by status
GET /analytics/revenue/monthly?year=2025&aggregate=total:sum(),groupBy:(status)
```

### Product Performance

```typescript
@Controller('products')
export class ProductController {
  @Get('stats')
  async getProductStats(
    @Query('filter', WherePipe) where?: Pipes.Where,
    @Query('aggregate', AggregatePipe) aggregate?: Pipes.Aggregate,
  ) {
    const data = await AggregatePipe.execute(
      this.prisma.product,
      aggregate,
      where
    );
    return AggregatePipe.toChartSeries(data, aggregate);
  }
}
```

**Requests:**
```bash
# Total inventory value
GET /products/stats?aggregate=value:sum(price)

# Average price by category
GET /products/stats?aggregate=price:avg(),groupBy:(category),chart:bar(category)

# Stock levels by warehouse
GET /products/stats?aggregate=stock:sum(),groupBy:(warehouse.name),chart:pie(warehouse.name)
```

### Customer Analytics

```typescript
@Controller('customers')
export class CustomerController {
  @Get('analytics')
  async getCustomerAnalytics(
    @Query('aggregate', AggregatePipe) aggregate?: Pipes.Aggregate,
  ) {
    const data = await AggregatePipe.execute(
      this.prisma.customer,
      aggregate
    );
    return AggregatePipe.toChartSeries(data, aggregate);
  }
}
```

**Requests:**
```bash
# Customers by region
GET /customers/analytics?aggregate=id:count(),groupBy:(region),chart:pie(region)

# Average lifetime value by tier
GET /customers/analytics?aggregate=lifetimeValue:avg(),groupBy:(tier),chart:bar(tier)

# Customer acquisition over time
GET /customers/analytics?aggregate=id:count(),chart:line(createdAt,month:2025)
```

### Employee Performance with Many-to-Many
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
  
  @Get('by-machine')
  async getPerformanceByMachine(
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
# Average scores by leader
GET /performance/by-leader?aggregate=s:avg(),p:avg(),pd:avg(),groupBy:(productionEmployeePerformanceLeaders.leaderNik),chart:radar(productionEmployeePerformanceLeaders.leaderNik)

# Total output by machine
GET /performance/by-machine?aggregate=output:sum(),groupBy:(productionEmployeePerformanceMachine.mcCode),chart:bar(productionEmployeePerformanceMachine.mcCode)

# Performance by leader with time series
GET /performance/by-leader?aggregate=s:avg(),groupBy:(productionEmployeePerformanceLeaders.leaderNik),chart:line(date,month:2025)

# Filtered by date range
GET /performance/by-leader?aggregate=s:avg(),p:avg(),groupBy:(productionEmployeePerformanceLeaders.leaderNik)&filter=date:gte+date(2025-01-01),date:lte+date(2025-12-31)
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
aggregate=field:function(params),groupBy:(fields),chart:type(config)
```

**Components:**
- `field:function()` - Aggregate specification
- `groupBy:(fields)` - Optional grouping fields
- `chart:type(config)` - Optional chart configuration

**Examples:**
```
aggregate=revenue:sum()
aggregate=price:avg(),groupBy:(category)
aggregate=total:sum(),chart:line(orderDate,month:2025)
aggregate=revenue:sum(),groupBy:(region,status),chart:bar(region,stacked)
```

---

## Best Practices

### 1. Use Filters to Reduce Data

```bash
# ✅ Good - Filter before aggregation
GET /analytics/sales?aggregate=revenue:sum()&filter=orderDate:gte+date(2025-01-01)

# ❌ Bad - Aggregate all data
GET /analytics/sales?aggregate=revenue:sum()
```

### 2. Specify Year for Time Series

```bash
# ✅ Good - Explicit year
GET /analytics/sales?aggregate=revenue:sum(),chart:line(orderDate,month:2025)

# ❌ Bad - No year (may use current year)
GET /analytics/sales?aggregate=revenue:sum(),chart:line(orderDate,month)
```

### 3. Add Database Indexes

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

### 4. Handle Large Datasets

```typescript
// ✅ Good - Use pagination for large results
@Get('sales')
async getSales(
  @Query('aggregate', AggregatePipe) aggregate?: Pipes.Aggregate,
  @Query('limit') limit = 100,
) {
  // Add limit to groupBy queries
  const data = await AggregatePipe.execute(model, aggregate);
  return data.slice(0, limit);
}
```

### 5. Configure Timezone

```typescript
// ✅ Good - Configure at startup
configurePipesTimezone({ offset: '+07:00' });

// Time series will respect timezone boundaries
GET /analytics/sales?aggregate=revenue:sum(),chart:line(orderDate,month:2025)
```

---

## Common Issues

### Issue 1: Relationship Aggregation Slow

**Problem:**
```bash
# Slow query with relationship grouping
GET /analytics/sales?aggregate=revenue:sum(),groupBy:(warehouse.region)
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

### Issue 2: Time Series Missing Data Points

**Problem:**
```bash
# Some months show 0 or are missing
GET /analytics/sales?aggregate=revenue:sum(),chart:line(orderDate,month:2025)
```

**Solution:**
AggregatePipe automatically fills missing periods with 0. Ensure:
- Year parameter is correct
- Date field exists in data
- Timezone is properly configured

### Issue 3: Chart Type Not Applied

**Problem:**
```bash
# Chart type not showing in result
GET /analytics/sales?aggregate=revenue:sum(),chart:bar(category)
```

**Solution:**
Ensure you're using `toChartSeries()` to transform the data:

```typescript
const data = await AggregatePipe.execute(model, aggregate, where);
return AggregatePipe.toChartSeries(data, aggregate); // ✅ Adds chartType
```

### Issue 4: Many-to-Many Returns Null Categories

**Problem:**
```bash
# Pivot table grouping returns null
GET /analytics?aggregate=score:avg(),groupBy:(pivotTable.field)

# Result shows null:
{
  "categories": ["null"],
  "series": [{ "name": "avg(score)", "data": [42.5] }]
}
```

**Cause:**
Array relationships in pivot tables were not being flattened properly.

**Solution:**
This is now automatically handled. Ensure:
- Your groupBy field path is correct: `pivotTableName.fieldName`
- The relationship is properly defined in Prisma schema
- The pivot table has data (not an empty array)

**Verification:**
```bash
# Test if data exists
GET /api/entity?include=pivotTable

# Should return:
{
  "id": "1",
  "pivotTable": [
    { "id": "p1", "field": "value1" },
    { "id": "p2", "field": "value2" }
  ]
}
```

**Note:** Each record with N pivot entries will be counted N times in aggregation, which is correct behavior for many-to-many analysis.

---

## Related Documentation

- [📖 WherePipe - Filtering](./WHERE_PIPE.md)
- [📖 Timezone Configuration](./TIMEZONE.md)
- [📖 Best Practices](./BEST_PRACTICES.md)
- [📖 API Reference](./API.md)

---

[⬅️ Back to Main Documentation](../README.md)