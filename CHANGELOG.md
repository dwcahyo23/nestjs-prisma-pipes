# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.5.0] - 2025-01-XX 🌍 NEW

### 🌍 Added - Timezone Configuration Support

#### Overview
Added global timezone configuration for all date operations across WherePipe and AggregatePipe. Now you can configure your application timezone once and all date filtering and time series grouping will respect that timezone.

#### Features

**Global Timezone Configuration**
```typescript
import { configurePipesTimezone } from '@dwcahyo/nestjs-prisma-pipes';

// Configure once at app startup
configurePipesTimezone({
  offset: '+07:00',
  name: 'Asia/Jakarta',
});
```

**Automatic Date Handling**
- Date strings without timezone automatically get configured timezone
- Date filtering respects configured timezone
- Time series grouping uses configured timezone
- No manual timezone conversion needed

**Timezone Service API**
```typescript
import { TimezoneService, getPipesTimezone } from '@dwcahyo/nestjs-prisma-pipes';

// Get current configuration
const timezone = getPipesTimezone();
// { offset: '+07:00', name: 'Asia/Jakarta', offsetHours: 7 }

// Check if configured
TimezoneService.isConfigured(); // true

// Reset to UTC
TimezoneService.reset();
```

#### What Changed

**Before (v2.4.6):**
```bash
# Problem: Date filter using UTC
GET /api/orders?filter=orderDate:gte+date(2025-11-01)
# Interpreted as: 2025-11-01T00:00:00.000Z (UTC)
# Misses data: 2025-11-01 00:11:36+07 → 2025-10-31T17:11:36Z ❌
```

**After (v2.5.0):**
```typescript
// Configure timezone once
configurePipesTimezone({ offset: '+07:00' });
```

```bash
# Now respects Jakarta timezone
GET /api/orders?filter=orderDate:gte+date(2025-11-01)
# Interpreted as: 2025-11-01T00:00:00+07:00 (Jakarta)
# Correctly includes: 2025-11-01 00:11:36+07 ✅
```

#### Implementation Details

**WherePipe Integration:**
```typescript
// Automatic timezone handling in date parsing
function parseStringToDate(ruleValue: string): string {
  const content = extractParenthesesContent(ruleValue);
  
  // ✅ Adds configured timezone if missing
  const dateString = TimezoneService.addTimezoneToDateString(content);
  return new Date(dateString).toISOString();
}
```

**AggregatePipe Integration:**
```typescript
// Time series grouping with timezone awareness
function getTimeKeyEnhanced(value: Date | string, interval: TimeInterval): string {
  // ✅ Converts to local timezone for grouping
  const localDate = TimezoneService.utcToLocal(date);
  
  // Groups in local timezone
  return getTimeKey(localDate, interval);
}
```

#### Configuration Methods

**1. Direct Configuration (main.ts)**
```typescript
import { NestFactory } from '@nestjs/core';
import { configurePipesTimezone } from '@dwcahyo/nestjs-prisma-pipes';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  configurePipesTimezone({
    offset: '+07:00',
    name: 'Asia/Jakarta',
  });
  
  await app.listen(3000);
}
```

**2. Environment Variables**
```env
TIMEZONE_OFFSET=+07:00
TIMEZONE_NAME=Asia/Jakarta
```

```typescript
import { ConfigService } from '@nestjs/config';

const configService = app.get(ConfigService);
configurePipesTimezone({
  offset: configService.get('TIMEZONE_OFFSET', '+07:00'),
  name: configService.get('TIMEZONE_NAME', 'Asia/Jakarta'),
});
```

**3. Module Configuration**
```typescript
import { PipesModule } from '@dwcahyo/nestjs-prisma-pipes';

@Module({
  imports: [
    PipesModule.forRoot({
      offset: '+07:00',
      name: 'Asia/Jakarta',
    }),
  ],
})
export class AppModule {}
```

#### Use Cases

**1. E-Commerce Platform**
```typescript
// Jakarta timezone for Indonesian e-commerce
configurePipesTimezone({ offset: '+07:00', name: 'Asia/Jakarta' });

// Date filters now work correctly
GET /orders?filter=orderDate:gte+date(2025-11-01),orderDate:lte+date(2025-11-30)
```

**2. Multi-Region Application**
```typescript
// Set default timezone
configurePipesTimezone({ offset: '+07:00', name: 'Asia/Jakarta' });

// Time series respects timezone
GET /analytics/sales?aggregate=revenue:sum(),chart:line(orderDate,month:2025)
```

**3. Financial Reporting**
```typescript
// Ensure fiscal year aligns with local timezone
configurePipesTimezone({ offset: '+07:00' });

// Monthly reports use local timezone
GET /reports/revenue?aggregate=total:sum(),groupBy:(month),chart:bar(date,month:2025)
```

#### API Reference

**configurePipesTimezone(config)**
```typescript
interface TimezoneConfig {
  offset: string;      // e.g., '+07:00', '-05:00'
  name: string;        // e.g., 'Asia/Jakarta', 'America/New_York'
  offsetHours?: number; // Auto-calculated from offset
}

function configurePipesTimezone(config: Partial<TimezoneConfig>): void;
```

**getPipesTimezone()**
```typescript
function getPipesTimezone(): TimezoneConfig;

// Example:
const tz = getPipesTimezone();
// { offset: '+07:00', name: 'Asia/Jakarta', offsetHours: 7 }
```

**TimezoneService Methods**
```typescript
class TimezoneService {
  setTimezone(config: Partial<TimezoneConfig>): void;
  getTimezone(): TimezoneConfig;
  addTimezoneToDateString(dateString: string): string;
  utcToLocal(date: Date): Date;
  localToUtc(date: Date): Date;
  isConfigured(): boolean;
  reset(): void;
}
```

#### Supported Timezone Formats

**Offset Format:**
```typescript
'+07:00'  // Jakarta, Bangkok, Hanoi
'+05:30'  // India, Sri Lanka
'-05:00'  // New York (EST)
'-08:00'  // Los Angeles (PST)
'+00:00'  // UTC, London (GMT)
'+09:00'  // Tokyo, Seoul
```

**Date String Formats Supported:**
```typescript
'2025-11-01'                    // Date only
'2025-11-01T10:30:00'          // Date with time
'2025-11-01T10:30:00.123'      // Date with milliseconds
'2025-11-01T10:30:00+07:00'    // Already has timezone (preserved)
'2025-11-01T10:30:00Z'         // UTC (preserved)
```

#### Migration Guide

**From v2.4.6 to v2.5.0:**

No breaking changes! This is a backward-compatible enhancement.

**Step 1:** Add timezone configuration to `main.ts`
```typescript
import { configurePipesTimezone } from '@dwcahyo/nestjs-prisma-pipes';

configurePipesTimezone({
  offset: '+07:00',
  name: 'Asia/Jakarta',
});
```

**Step 2:** Test your date filters
```bash
# Before: May have missed data
GET /api/orders?filter=orderDate:gte+date(2025-11-01)

# After: Should include all data correctly
GET /api/orders?filter=orderDate:gte+date(2025-11-01)
```

**Step 3:** Verify time series charts
```bash
# Check that months/days group correctly
GET /api/stats?aggregate=revenue:sum(),chart:line(orderDate,month:2025)
```

#### Important Notes

1. **Configure Once**: Call `configurePipesTimezone()` only once at application startup
2. **Before First Request**: Must be configured before handling any requests
3. **Global Effect**: Affects all pipes globally (WherePipe, AggregatePipe)
4. **Default UTC**: If not configured, defaults to UTC (+00:00)
5. **Thread-Safe**: Uses singleton pattern for consistent behavior

#### Performance

- ✅ **Zero Performance Impact**: Timezone conversion is lightweight
- ✅ **No Memory Overhead**: Singleton pattern, single instance
- ✅ **No Database Changes**: Works with existing database timezone settings

#### TypeScript Support

Full TypeScript support with proper types:

```typescript
import { 
  configurePipesTimezone, 
  getPipesTimezone,
  TimezoneConfig,
  TimezoneService 
} from '@dwcahyo/nestjs-prisma-pipes';

// Type-safe configuration
const config: TimezoneConfig = {
  offset: '+07:00',
  name: 'Asia/Jakarta',
  offsetHours: 7, // Optional, auto-calculated
};

configurePipesTimezone(config);
```

#### Testing

```typescript
// timezone.service.spec.ts
import TimezoneService from './timezone.service';

describe('TimezoneService', () => {
  afterEach(() => {
    TimezoneService.reset();
  });

  it('should add timezone to date string', () => {
    TimezoneService.setTimezone({ offset: '+07:00' });
    const result = TimezoneService.addTimezoneToDateString('2025-11-01');
    expect(result).toBe('2025-11-01T00:00:00+07:00');
  });

  it('should convert UTC to local', () => {
    TimezoneService.setTimezone({ offset: '+07:00' });
    const utcDate = new Date('2025-11-01T00:00:00.000Z');
    const localDate = TimezoneService.utcToLocal(utcDate);
    expect(localDate.getUTCHours()).toBe(7);
  });
});
```

---

## [2.4.6] - 2025

### 🚀 Added - Manual Aggregation for Nested Relationships

#### Overview
Prisma's `groupBy` doesn't support relationship fields directly. This version introduces **automatic manual aggregation** that seamlessly handles relationship fields by fetching data with `include` and performing aggregation in-memory.

#### The Problem
```typescript
// ❌ This doesn't work with Prisma
groupBy: {
  by: ['marketingMasterCategory.category'] // Error: Can't group by relation
}
```

#### The Solution
```bash
# ✅ This now works automatically!
?aggregate=qty: sum(), groupBy: (marketingMasterCategory.category)
```

#### Features

**🔍 Auto-Detection**
- Automatically detects relationship fields (fields containing `.`)
- Seamlessly switches between Prisma native and manual aggregation
- No configuration needed

**🔄 Seamless Fallback**
```typescript
// Simple fields → Prisma native groupBy (faster)
?aggregate=qty: sum(), groupBy: (category)

// Relationship fields → Manual aggregation (automatic)
?aggregate=qty: sum(), groupBy: (marketingMasterCategory.category)
```

**🔗 Auto-Include**
- Automatically builds `include` objects for relationships
- Supports nested relationships
- Optimized field selection

**📊 Chart Compatible**
- Works with all chart types: bar, line, pie, area, donut
- Supports time series with relationships
- Stacked and grouped charts

**🎯 Type Safe**
- Full TypeScript support
- Proper type inference
- No type casting needed

**✨ Simple API**
```typescript
// Single method handles everything
const data = await AggregatePipe.execute(
  this.prisma.product,
  aggregate,
  filter
);

return AggregatePipe.toChartSeries(data, aggregate);
```

#### Processing Flow

```
1. Detect Relationship (field contains '.')
   ↓
2. Build Include Object (fetch related data)
   ↓
3. Fetch All Data with Relations
   ↓
4. Group Data by Composite Key (in-memory)
   ↓
5. Calculate Aggregates (sum, avg, min, max, count)
   ↓
6. Return Prisma-Compatible Format
```

#### Examples

**Simple Relationship:**
```bash
GET /products/stats?aggregate=qty: sum(), groupBy: (marketingMasterCategory.category)
```

**Multiple Relationships:**
```bash
GET /products/stats?aggregate=qty: sum(), groupBy: (warehouse.region, marketingMasterCategory.category)
```

**With Chart:**
```bash
GET /products/stats?aggregate=qty: sum(), recQty: sum(), groupBy: (marketingMasterCategory.category), chart: bar(marketingMasterCategory.category, horizontal)
```

**Time Series with Relationships:**
```bash
GET /orders/stats?aggregate=revenue: sum(), groupBy: (customer.segment, orderDate), chart: line(orderDate, month)
```

#### Service Implementation

```typescript
import { AggregatePipe } from '@dwcahyo/nestjs-prisma-pipes';

async stat(filter?: Pipes.Where, aggregate?: Pipes.Aggregate) {
  // Handles both simple and relationship aggregations automatically
  const data = await AggregatePipe.execute(
    this.prisma.product,
    aggregate,
    filter
  );

  return AggregatePipe.toChartSeries(data, aggregate);
}
```

#### Performance Considerations

| Aspect | Prisma groupBy | Manual Aggregation |
|--------|---------------|-------------------|
| **Speed** | ⚡ Faster (database-level) | 🔸 Slower (in-memory) |
| **Memory** | ✅ Minimal | ⚠️ Loads all data |
| **Relationships** | ❌ Not supported | ✅ Fully supported |
| **Flexibility** | 🔸 Limited | ✅ Full control |
| **Use Case** | Simple fields | Nested relationships |

**Best Practices:**
1. Use simple fields when possible (faster)
2. Add WHERE filters to reduce data volume
3. Add database indexes on relationship keys
4. Consider caching for frequently accessed aggregations
5. Use pagination for very large datasets

#### Migration from v2.4.2

**Before:**
```typescript
// Would fail with relationship fields
const data = await this.prisma.product.groupBy({
  where: filter,
  ...aggregate.prismaQuery, // Error!
});
```

**After:**
```typescript
// Works automatically
const data = await AggregatePipe.execute(
  this.prisma.product,
  aggregate,
  filter
);
```

---

### 🚀 Added - Year Parameter Support for Time Series

#### Overview
Added support for specifying exact years in time series charts to control the time range displayed.

#### Syntax
```bash
chart: line(dateField, interval:year)
chart: bar(dateField, month:year)
```

#### Features

**🎯 Exact Year Control**
```bash
# Show only Jan 2025 - Dec 2025
?aggregate=revenue: sum(), chart: line(orderDate, month:2025)
```

**📅 Year Range Control**
```bash
# Show 5 years ending 2025 (2021-2025)
?aggregate=sales: sum(), chart: line(saleDate, year:2025)
```

**🔄 Auto-Detection Fallback**
```bash
# Automatically detects from data if year not specified
?aggregate=revenue: sum(), chart: line(orderDate, month)
```

**📊 Consistent Labels**
```bash
# Ensures chart labels match the specified year
GET /orders/stats?aggregate=revenue: sum(), groupBy: (status), chart: line(orderDate, month:2025)

# Result: ["Jan 2025", "Feb 2025", ..., "Dec 2025"]
```

#### Behavior by Interval

| Interval | Without Year | With Year |
|----------|-------------|-----------|
| **month** | Auto-detects from data | Shows 12 months of specified year |
| **year** | Shows 5 years (current - 4 to current) | Shows 5 years (specified - 4 to specified) |
| **day** | Auto-detects from data | Shows all 365/366 days of specified year |

#### Use Cases

**Annual Reports:**
```bash
# Lock charts to specific fiscal year
?aggregate=sales: sum(), chart: line(saleDate, month:2024)
```

**Historical Comparison:**
```bash
# Compare specific years
?aggregate=orders: count(), chart: bar(orderDate, year:2025)
```

**Budget Planning:**
```bash
# Project data for upcoming year
?aggregate=forecast: sum(), chart: line(projectionDate, month:2026)
```

**YoY Analysis:**
```bash
# 2024 data
?aggregate=revenue: sum(), chart: line(date, month:2024)

# 2025 data (for comparison)
?aggregate=revenue: sum(), chart: line(date, month:2025)
```

#### Pattern Matching

```typescript
// Basic time series
"line(orderDate, month)"        // Auto-detect year

// With year parameter
"line(orderDate, month:2025)"   // Jan 2025 - Dec 2025
"bar(orderDate, year:2025)"     // 2021-2025
"area(orderDate, day:2024)"     // All days in 2024

// Combined with grouping
"line(orderDate, month:2025), groupBy: (status)"  // Multi-series
```

#### Priority Order

1. **Specified Year** (`month:2025`) - Highest priority
2. **Data Year Range** (auto-detected from data)
3. **Current Year** (fallback if no data)

#### Migration

No breaking changes! Existing queries work as before:

```bash
# Old behavior (still works)
?aggregate=qty: sum(), chart: line(orderDate, month)

# New behavior (optional enhancement)
?aggregate=qty: sum(), chart: line(orderDate, month:2025)
```

---

## [2.4.2] - 2025

### 🚀 Enhanced - Grouped Time Series Support

Added support for combining time series with categorical grouping, enabling multi-series time-based charts.

**Features:**
- Group time series data by additional categorical fields
- Automatic series generation for each group
- Stacked time series charts
- Compatible with all chart types

**Example:**
```bash
# Revenue by status per month
?aggregate=revenue: sum(), groupBy: (status), chart: line(orderDate, month)

# Sales by region with stacking
?aggregate=sales: sum(), groupBy: (region, category), chart: bar(date, month, stacked)
```

---

## [2.4.0] - 2024

### 🎨 Added - Chart Configuration

Added chart type support to aggregate queries.

**Features:**
- Bar, line, pie, area, and donut charts
- Time series support (day, month, year intervals)
- Stacked and horizontal orientations
- Automatic data transformation to chart format

**Examples:**
```bash
?aggregate=revenue: sum(), chart: bar(category)
?aggregate=orders: count(), chart: line(orderDate, month)
?aggregate=sales: sum(), chart: pie(region)
```

---

## [2.3.0] - 2024

### 🔢 Added - Aggregate Support

Added aggregate functions to pipes.

**Features:**
- sum, avg, min, max, count
- groupBy support
- Multiple aggregates in single query

**Examples:**
```bash
?aggregate=price: sum(), quantity: avg()
?aggregate=revenue: sum(), groupBy: (category)
```

---

## [2.2.0] - 2024

### 🔗 Added - Include Pipe

Added support for including relations.

**Features:**
- Single and multiple relations
- Nested relations
- Auto-include building

**Examples:**
```bash
?include=category
?include=category,reviews,warehouse
?include=category,reviews.user
```

---

## [2.1.0] - 2024

### 📝 Added - Select Pipe

Added support for field selection.

**Features:**
- Select specific fields
- Nested field selection
- Performance optimization

**Examples:**
```bash
?fields=id,name,price
?fields=id,name,category.name
```

---

## [2.0.0] - 2024

### 🔄 Added - OrderBy Pipe

Added support for sorting.

**Features:**
- Ascending and descending sort
- Multiple field sorting
- Nested relation sorting

**Examples:**
```bash
?sort=price
?sort=-price
?sort=category,-price,name
```

---

## [1.0.0] - 2024

### 🎉 Initial Release

**Features:**
- WherePipe for filtering
- Type casting (int, float, bool, date, array)
- Comparison operators
- String matching operators
- Array operators
- Multiple conditions
- Nested relations

**Examples:**
```bash
?filter=price:gte+int(100)
?filter=name:contains+banana
?filter=tags:in+array(electronics,gadgets)
?filter=category.name:electronics
```

---

## Version History

- **v2.5.0** - Timezone Configuration
- **v2.4.6** - Manual Aggregation for Relationships + Year Parameters
- **v2.4.2** - Grouped Time Series
- **v2.4.0** - Chart Configuration
- **v2.3.0** - Aggregate Functions
- **v2.2.0** - Include Pipe
- **v2.1.0** - Select Pipe
- **v2.0.0** - OrderBy Pipe
- **v1.0.0** - Initial Release (WherePipe)

---

**[Unreleased]** - Future Plans
- Advanced filtering (OR, NOT conditions)
- Custom aggregate functions
- Query caching
- Performance monitoring
- GraphQL adapter