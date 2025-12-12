
## [2.4.11] - 2025

### 🔗 Added - Many-to-Many Pivot Table Aggregation Support

Added automatic support for aggregating data through many-to-many relationships and pivot tables.

#### What's New
- ✅ Automatic pivot table flattening for proper aggregation
- ✅ Supports array relationships in groupBy (e.g., `pivotTable.field`)
- ✅ Works with all chart types and time series
- ✅ Accurate aggregation for many-to-many patterns

#### Examples

**Employee Performance by Leader:**
```bash
GET /performance?aggregate=s:avg(),p:avg(),pd:avg(),groupBy:(productionEmployeePerformanceLeaders.leaderNik),chart:radar(productionEmployeePerformanceLeaders.leaderNik)
```

**Production by Machine:**
```bash
GET /performance?aggregate=output:sum(),groupBy:(productionEmployeePerformanceMachine.mcCode),chart:bar(productionEmployeePerformanceMachine.mcCode)
```

**Time Series with Pivot:**
```bash
GET /performance?aggregate=s:avg(),groupBy:(productionEmployeePerformanceLeaders.leaderNik),chart:line(date,month:2025)
```

#### How It Works
1. Detects array relationships in groupBy fields
2. Flattens pivot table records (1 record with N pivots → N records)
3. Performs normal aggregation with flattened data
4. Returns accurate results for many-to-many analysis

#### Schema Pattern
```prisma
model ProductionEmployeePerformance {
  id     String
  s      Float
  
  // One-to-many to pivot
  productionEmployeePerformanceLeaders ProductionEmployeePerformanceLeader[]
}

model ProductionEmployeePerformanceLeader {
  id            String
  performanceId String
  leaderNik     String
  
  performance ProductionEmployeePerformance @relation(...)
  
  @@unique([performanceId, leaderNik])
}
```

#### Migration
No breaking changes! Existing queries continue to work.

**See detailed documentation:** [AggregatePipe.md - Many-to-Many Section](./docs/AGGREGATE_PIPE.md#many-to-many-pivot-table-grouping)

---

## [2.4.10] - 2025

### 🌍 Added - Timezone Configuration Support

Added global timezone configuration for all date operations.

#### What's New
- ✅ Configure timezone once at app startup
- ✅ All date filters respect configured timezone
- ✅ Time series grouping uses local timezone
- ✅ No manual timezone conversion needed

#### Configuration
```typescript
import { configurePipesTimezone } from '@dwcahyo/nestjs-prisma-pipes';

// Configure once in main.ts
configurePipesTimezone({
  offset: '+07:00',
  name: 'Asia/Jakarta',
});
```

#### Examples
```bash
# Date filters now respect timezone
GET /orders?filter=orderDate:gte+date(2025-11-01)

# Time series uses local timezone
GET /analytics?aggregate=revenue:sum(),chart:line(orderDate,month:2025)
```

#### Benefits
- Date boundaries align with local business hours
- Time series charts group correctly by local time
- Consistent behavior across all pipes

**See detailed documentation:** [Timezone Configuration](./docs/TIMEZONE.md)

---

## [2.4.6] - 2025

### 🚀 Added - Manual Aggregation for Nested Relationships

Added automatic support for relationship fields in groupBy.

#### What's New
- ✅ Group by relationship fields (e.g., `category.name`)
- ✅ Automatic fallback to manual aggregation
- ✅ Works with all aggregate functions
- ✅ Chart compatible

#### Examples
```bash
# Group by relationship field
GET /products?aggregate=qty:sum(),groupBy:(marketingMasterCategory.category)

# Multiple relationships
GET /products?aggregate=qty:sum(),groupBy:(warehouse.region,category.name)

# With charts
GET /products?aggregate=qty:sum(),groupBy:(category.name),chart:bar(category.name)
```

**See detailed documentation:** [AggregatePipe.md - Relationship Grouping](./docs/AGGREGATE_PIPE.md#relationship-grouping)

---

### 📅 Added - Year Parameter Support for Time Series

Added year parameter to control time range in charts.

#### Examples
```bash
# Show specific year
GET /analytics?aggregate=revenue:sum(),chart:line(orderDate,month:2025)

# Year range for yearly charts
GET /analytics?aggregate=sales:sum(),chart:line(saleDate,year:2025)
```

**See detailed documentation:** [AggregatePipe.md - Time Series](./docs/AGGREGATE_PIPE.md#time-series)

---

## [2.4.2] - 2025

### 📊 Enhanced - Grouped Time Series Support

Added support for combining time series with categorical grouping.

#### Examples
```bash
# Multi-series time chart
GET /analytics?aggregate=revenue:sum(),groupBy:(status),chart:line(orderDate,month:2025)

# Stacked time series
GET /analytics?aggregate=sales:sum(),groupBy:(region),chart:area(date,month:2025,stacked)
```

---

## [2.4.0] - 2025

### 🎨 Added - Chart Configuration

Added chart type support with 5 chart types: bar, line, pie, area, donut.

#### Examples
```bash
GET /analytics?aggregate=revenue:sum(),chart:bar(category)
GET /analytics?aggregate=orders:count(),chart:line(orderDate,month)
```

---

## [2.3.0] - 2025

### 🔢 Added - Aggregate Support

Added aggregate functions: sum, avg, min, max, count with groupBy support.

#### Examples
```bash
GET /analytics?aggregate=price:sum(),quantity:avg()
GET /analytics?aggregate=revenue:sum(),groupBy:(category)
```

---

## [2.2.0] - 2025

### 🔗 Added - Include Pipe

Added support for including relations.

#### Examples
```bash
GET /api/products?include=category,reviews
GET /api/products?include=category,reviews.user
```

---

## [2.1.0] - 2025

### 📝 Added - Select Pipe

Added support for field selection.

#### Examples
```bash
GET /api/products?fields=id,name,price
GET /api/products?fields=id,name,category.name
```

---

## [2.0.0] - 2025

### 🔄 Added - OrderBy Pipe

Added support for sorting with multiple fields.

#### Examples
```bash
GET /api/products?sort=price
GET /api/products?sort=-price,name
```

---

## [1.0.0] - 2025

### 🎉 Initial Release

Core filtering features with WherePipe.

#### Features
- Type casting (int, float, bool, date, array)
- Comparison operators (eq, ne, gt, gte, lt, lte)
- String operators (contains, startsWith, endsWith)
- Array operators (in, notIn, has, hasEvery, hasSome)
- Nested relations

#### Examples
```bash
GET /api/products?filter=price:gte+int(100)
GET /api/products?filter=name:contains+banana
GET /api/products?filter=category.name:electronics
```

---

## Version Summary

| Version | Feature | Description |
|---------|---------|-------------|
| **2.4.11** | Many-to-Many | Pivot table aggregation |
| **2.4.10** | Timezone | Global timezone config |
| **2.4.6** | Relationships | Nested field grouping + year params |
| **2.4.2** | Grouped Series | Time series with grouping |
| **2.4.0** | Charts | 5 chart types |
| **2.3.0** | Aggregates | sum, avg, min, max, count |
| **2.2.0** | Include | Relation loading |
| **2.1.0** | Select | Field selection |
| **2.0.0** | OrderBy | Sorting |
| **1.0.0** | WherePipe | Core filtering |

---

**Documentation:**
- [AggregatePipe Documentation](./docs/AGGREGATE_PIPE.md)
- [WherePipe Documentation](./docs/WHERE_PIPE.md)
- [Timezone Configuration](./docs/TIMEZONE.md)
- [OrderPipe, SelectPipe, IncludePipe](./docs/ORDER_BY_SELECT_INCLUDE_PIPE.md)