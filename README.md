# 🛠 @dwcahyo/nestjs-prisma-pipes

**NestJS + Prisma query pipes**  
Parse query strings (`where`, `orderBy`, `select`, `include`, `aggregate`) directly into **Prisma-ready objects**.  
No more manual parsing — just pass query params, and you're good to go 🚀

---

## 📜 Changelog

### [2.4.4] - 2025 🔥 NEW

#### 🚀 Added - Raw Query Support for Nested Relationships

##### The Problem
Prisma's `groupBy` doesn't support relationship fields directly:
```typescript
// ❌ This doesn't work with Prisma
groupBy: {
  by: ['marketingMasterCategory.category'] // Error: Can't group by relation
}
```

##### The Solution
**Automatic Raw SQL Query Generation** - When `AggregatePipe` detects relationship fields (containing `.`), it automatically switches to raw SQL mode!

```typescript
// ✅ This now works!
?aggregate=qty: sum(), groupBy: (marketingMasterCategory.category)
```

##### Features
- **🔍 Auto-Detection**: Automatically detects relationship fields (fields with `.`)
- **🔄 Seamless Fallback**: Uses standard Prisma for simple fields, raw SQL for relationships
- **🔗 Auto-JOIN**: Automatically generates JOIN statements for relationships
- **📊 Chart Compatible**: Works with all chart types and time series
- **🎯 Type Safe**: Full TypeScript support with proper types

##### How It Works

**1. Simple Fields (Standard Prisma)**
```url
?aggregate=qty: sum(), groupBy: (category)
```
→ Uses Prisma `groupBy` (faster, native)

**2. Relationship Fields (Raw SQL)**
```url
?aggregate=qty: sum(), groupBy: (marketingMasterCategory.category)
```
→ Auto-generates raw SQL with JOINs

**3. Mixed Fields (Raw SQL)**
```url
?aggregate=qty: sum(), groupBy: (marketingMasterCategory.category, warehouse.region)
```
→ Generates SQL with multiple JOINs

##### Configuration Required

**Update your Prisma schema:**
```prisma
// prisma/schema.prisma
model Product {
  id                          Int                      @id @default(autoincrement())
  qty                         Int
  recQty                      Int
  marketingMasterCategoryId   Int
  warehouseId                 Int
  
  // Define relations
  marketingMasterCategory     MarketingMasterCategory  @relation(fields: [marketingMasterCategoryId], references: [id])
  warehouse                   Warehouse                @relation(fields: [warehouseId], references: [id])
}

model MarketingMasterCategory {
  id        Int       @id @default(autoincrement())
  category  String
  products  Product[]
}

model Warehouse {
  id        Int       @id @default(autoincrement())
  region    String
  products  Product[]
}
```

**Note:** The pipe assumes foreign key naming convention: `{relationName}Id`

##### Service Layer Implementation

**Option 1: Generic Implementation (Recommended)**

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Pipes, AggregatePipe } from '@dwcahyo/nestjs-prisma-pipes';

@Injectable()
export class BaseService<T> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string, // e.g., 'product'
  ) {}

  async stat(
    filter?: Pipes.Where,
    aggregate?: Pipes.Aggregate,
  ): Promise<Pipes.ChartSeries> {
    if (!aggregate) {
      throw new BadRequestException('Aggregate query is required');
    }

    try {
      // Check if raw query is needed for relationships
      if (aggregate.useRawQuery && aggregate.rawQueryBuilder) {
        // Execute raw SQL for relationship groupBy
        const { query, params } = aggregate.rawQueryBuilder(
          this.getTableName(this.modelName),
          filter
        );
        
        const rawData = await this.prisma.$queryRawUnsafe(query, ...params);
        
        // Transform raw SQL results to match Prisma groupBy format
        const transformedData = this.transformRawResults(rawData, aggregate);
        
        return AggregatePipe.toChartSeries(transformedData, aggregate);
      }

      // Standard Prisma query for simple fields
      const { by, _sum, _avg, _min, _max, _count } = aggregate.prismaQuery;
      const queryBase: any = { where: filter };

      if (_sum) queryBase._sum = _sum;
      if (_avg) queryBase._avg = _avg;
      if (_min) queryBase._min = _min;
      if (_max) queryBase._max = _max;
      if (_count !== undefined) queryBase._count = _count;

      const model = this.prisma[this.modelName];
      const dataPromise = aggregate.isGrouped && by
        ? model.groupBy({ ...queryBase, by })
        : model.aggregate(queryBase);

      return dataPromise.then(data => AggregatePipe.toChartSeries(data, aggregate));
    } catch (error) {
      console.error('Aggregate error:', error);
      throw new BadRequestException(`Failed to execute aggregate query: ${error.message}`);
    }
  }

  /**
   * Get database table name from model name
   * Adjust based on your naming convention
   */
  private getTableName(modelName: string): string {
    // Convert camelCase to PascalCase for table name
    return modelName.charAt(0).toUpperCase() + modelName.slice(1);
  }

  /**
   * Transform raw SQL results to Prisma groupBy format
   */
  private transformRawResults(rawData: any[], aggregate: Pipes.Aggregate): any[] {
    return rawData.map(row => {
      const transformed: any = {};
      
      // Map group fields (group_0, group_1, etc.)
      aggregate.groupBy.forEach((field, idx) => {
        const groupKey = `group_${idx}`;
        if (row[groupKey] !== undefined) {
          // For nested fields, create nested object
          if (field.includes('.')) {
            const parts = field.split('.');
            let current = transformed;
            
            for (let i = 0; i < parts.length - 1; i++) {
              if (!current[parts[i]]) {
                current[parts[i]] = {};
              }
              current = current[parts[i]];
            }
            current[parts[parts.length - 1]] = row[groupKey];
          } else {
            transformed[field] = row[groupKey];
          }
        }
      });
      
      // Map aggregate results (agg_sum_0, agg_avg_1, etc.)
      aggregate.aggregates.forEach((agg, idx) => {
        const { function: func, field } = agg;
        const aggKey = `agg_${func}_${idx}`;
        
        if (row[aggKey] !== undefined) {
          if (!transformed[`_${func}`]) {
            transformed[`_${func}`] = {};
          }
          transformed[`_${func}`][field] = parseFloat(row[aggKey]) || 0;
        }
      });
      
      return transformed;
    });
  }
}
```

**Option 2: Model-Specific Implementation**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { BaseService } from './base.service';

@Injectable()
export class ProductService extends BaseService<Product> {
  constructor(prisma: PrismaService) {
    super(prisma, 'product');
  }

  // Inherit stat() method from BaseService
  // Custom methods can be added here
}

@Injectable()
export class OrderService extends BaseService<Order> {
  constructor(prisma: PrismaService) {
    super(prisma, 'order');
  }
}
```

**Controller Usage:**

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { ProductService } from './product.service';
import { Pipes, WherePipe, AggregatePipe } from '@dwcahyo/nestjs-prisma-pipes';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get('stats')
  async getStats(
    @Query('where', WherePipe) where?: Pipes.Where,
    @Query('aggregate', AggregatePipe) aggregate?: Pipes.Aggregate
  ): Promise<Pipes.ChartSeries> {
    return this.productService.stat(where, aggregate);
  }
}
```

##### Real-World Examples

**Example 1: Sales by Category (Relationship)**
```bash
GET /products/stats?aggregate=qty: sum(), recQty: sum(), groupBy: (marketingMasterCategory.category), chart: bar(marketingMasterCategory.category, horizontal)
```

**What happens:**
1. Pipe detects `.` in `marketingMasterCategory.category`
2. Sets `useRawQuery: true`
3. Generates SQL:
```sql
SELECT 
  marketingMasterCategory.category as group_0,
  SUM(main.qty) as agg_sum_0,
  SUM(main.recQty) as agg_sum_1
FROM Product as main
LEFT JOIN MarketingMasterCategory as marketingMasterCategory 
  ON main.marketingMasterCategoryId = marketingMasterCategory.id
GROUP BY marketingMasterCategory.category
ORDER BY marketingMasterCategory.category
```

**Example 2: Regional Performance Over Time**
```bash
GET /products/stats?aggregate=qty: sum(), groupBy: (warehouse.region, createdAt), chart: line(createdAt, month)
```

**Generated SQL:**
```sql
SELECT 
  warehouse.region as group_0,
  main.createdAt as group_1,
  SUM(main.qty) as agg_sum_0
FROM Product as main
LEFT JOIN Warehouse as warehouse 
  ON main.warehouseId = warehouse.id
GROUP BY warehouse.region, main.createdAt
ORDER BY warehouse.region, main.createdAt
```

**Example 3: Multi-Level Relationships**
```bash
GET /orders/stats?aggregate=revenue: sum(), groupBy: (customer.company.industry, orderDate), chart: area(orderDate, month, stacked)
```

##### TypeScript Types

```typescript
export namespace Pipes {
  export interface Aggregate {
    prismaQuery: {
      by?: string[];
      _sum?: Record<string, true>;
      _avg?: Record<string, true>;
      _min?: Record<string, true>;
      _max?: Record<string, true>;
      _count?: true | Record<string, true>;
    } | null; // null when useRawQuery is true
    aggregates: AggregateSpec[];
    groupBy: string[];
    isGrouped: boolean;
    chartConfig?: ChartConfig;
    
    // NEW in v2.4.3
    useRawQuery?: boolean;
    rawQueryBuilder?: (tableName: string, whereClause?: any) => {
      query: string;
      params: any[];
    };
  }
}
```

##### Migration Guide

**Before (v2.4.2 and earlier):**
```typescript
// This would fail with relationship fields
async stat(filter?: Pipes.Where, aggregate?: Pipes.Aggregate) {
  return this.prisma.product.groupBy({
    where: filter,
    ...aggregate.prismaQuery, // Error if groupBy has relationship
  });
}
```

**After (v2.4.3):**
```typescript
// Now handles both simple and relationship fields
async stat(filter?: Pipes.Where, aggregate?: Pipes.Aggregate) {
  if (aggregate.useRawQuery) {
    // Use raw SQL for relationships
    const { query, params } = aggregate.rawQueryBuilder('Product', filter);
    const rawData = await this.prisma.$queryRawUnsafe(query, ...params);
    const transformedData = this.transformRawResults(rawData, aggregate);
    return AggregatePipe.toChartSeries(transformedData, aggregate);
  }
  
  // Use standard Prisma for simple fields
  return this.prisma.product.groupBy({
    where: filter,
    ...aggregate.prismaQuery,
  }).then(data => AggregatePipe.toChartSeries(data, aggregate));
}
```

##### Performance Considerations

**Raw SQL vs Prisma groupBy:**

| Aspect | Prisma groupBy | Raw SQL |
|--------|---------------|---------|
| **Speed** | ⚡ Faster (native) | 🔸 Slightly slower |
| **Type Safety** | ✅ Full | ⚠️ Partial |
| **Relationships** | ❌ Not supported | ✅ Supported |
| **Flexibility** | 🔸 Limited | ✅ Full |
| **When to use** | Simple fields | Nested relationships |

**Best Practices:**
1. Use simple fields when possible (faster)
2. Use relationships only when needed
3. Add indexes on JOIN columns for better performance
4. Consider caching for frequently accessed aggregations

##### Limitations & Notes

1. **Foreign Key Convention**: Assumes `{relationName}Id` naming
2. **Database Support**: Currently optimized for PostgreSQL/MySQL
3. **Complex WHERE**: Basic WHERE support in raw SQL mode
4. **Nested Relations**: Supports one level deep (e.g., `category.subcategory`)
5. **Type Coercion**: Numeric values auto-converted from strings

##### Troubleshooting

**Issue 1: "Cannot read properties of null (reading 'by')"**
```typescript
// Problem: Trying to access prismaQuery when useRawQuery is true
if (aggregate.useRawQuery) {
  // Use rawQueryBuilder instead of prismaQuery
}
```

**Issue 2: "Table not found"**
```typescript
// Solution: Check getTableName() method matches your schema
private getTableName(modelName: string): string {
  // Ensure this matches your Prisma model name
  return modelName.charAt(0).toUpperCase() + modelName.slice(1);
}
```

**Issue 3: "Column not found in JOIN"**
```typescript
// Solution: Verify foreign key names match convention
// Expected: {relationName}Id
// Example: marketingMasterCategoryId, warehouseId
```

##### Testing

```typescript
// aggregate.pipe.spec.ts
describe('AggregatePipe - Raw Query', () => {
  it('should detect relationship and use raw query', () => {
    const result = pipe.transform(
      'qty: sum(), groupBy: (marketingMasterCategory.category)'
    );
    
    expect(result?.useRawQuery).toBe(true);
    expect(result?.rawQueryBuilder).toBeDefined();
  });
  
  it('should generate correct SQL', () => {
    const result = pipe.transform(
      'qty: sum(), groupBy: (marketingMasterCategory.category)'
    );
    
    const { query } = result.rawQueryBuilder('Product');
    expect(query).toContain('LEFT JOIN MarketingMasterCategory');
    expect(query).toContain('GROUP BY marketingMasterCategory.category');
  });
});
```

---

### [2.4.2] - 2025

#### 🚀 Enhanced - Grouped Time Series Support
(previous content...)

---

## 📦 Installation

```bash
npm install --save @dwcahyo/nestjs-prisma-pipes
```

---

## 🚀 Quick Start

(previous Quick Start content...)

---

## 5️⃣ AggregatePipe

⭐ **NEW in v2.4.0** - Powerful aggregations with chart-ready transformations!  
🚀 **ENHANCED in v2.4.1** - Grouped time series support!  
🔥 **NEW in v2.4.3** - Raw SQL support for relationship groupBy!

Parse aggregate queries and transform results into chart-ready format with automatic time series support, flexible grouping, and **relationship support via raw SQL**.

### 🎯 Features

- ✅ All aggregate functions: `sum()`, `avg()`, `min()`, `max()`, `count()`
- ✅ Time series: `day`, `month`, `year` intervals
- ✅ Chart types: `bar`, `line`, `pie`, `area`, `donut`
- ✅ Flexible groupBy with **nested relationships** 🔥 NEW
- ✅ Auto-detection: Simple fields vs relationships
- ✅ Seamless fallback: Prisma → Raw SQL
- ✅ Auto-JOIN generation for relationships
- ✅ Full TypeScript support

### 🔄 How It Works

**Automatic Mode Selection:**

```typescript
// Simple field → Prisma groupBy (faster)
?aggregate=qty: sum(), groupBy: (category)

// Relationship → Raw SQL (automatic)
?aggregate=qty: sum(), groupBy: (marketingMasterCategory.category)
```

**Detection Logic:**
- Contains `.` → Raw SQL with JOINs
- No `.` → Standard Prisma groupBy

### 🧩 Examples with Relationships

#### Basic Relationship GroupBy
```url
?aggregate=qty: sum(), recQty: sum(), groupBy: (marketingMasterCategory.category)
```

**Service automatically:**
1. Detects relationship field
2. Generates SQL with JOIN
3. Transforms results
4. Returns chart-ready data

#### Multiple Relationships
```url
?aggregate=qty: sum(), groupBy: (marketingMasterCategory.category, warehouse.region)
```

#### Relationship + Time Series
```url
?aggregate=revenue: sum(), groupBy: (customer.company.industry, orderDate), chart: line(orderDate, month)
```

(Rest of AggregatePipe documentation continues...)

---

## 📝 License

MIT

---

**✨ v2.4.3 makes relationship aggregations as easy as simple fields - just write your query, the pipe handles the complexity!**

[↑ Back to top](#-table-of-contents)