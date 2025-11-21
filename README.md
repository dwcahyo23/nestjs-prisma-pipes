# 🛠 @dwcahyo/nestjs-prisma-pipes

**NestJS + Prisma query pipes**  
Parse query strings (`where`, `orderBy`, `select`, `include`, `aggregate`) directly into **Prisma-ready objects**.  
No more manual parsing — just pass query params, and you're good to go 🚀

---

## 📜 Changelog

### [2.4.5] - 2025 🎉 NEW - Table Mapping Support

#### 🚀 Added - Flexible Table Mapping for Raw Queries

##### The Problem
When your Prisma model names don't match database table names (e.g., `MarketingMasterCategory` model → `market_master_category` table), raw SQL queries fail:

```typescript
// ❌ This fails when model name ≠ table name
?aggregate=qty: sum(), groupBy: (marketingMasterCategory.category)
// Error: Table 'MarketingMasterCategory' doesn't exist
```

##### The Solution
**Three Ways to Map Models to Tables:**

1. **Auto-Mapping** via Prisma DMMF (Recommended)
2. **Explicit Mapping** via `groupByMapping` parameter
3. **Hybrid Approach** (Auto + Manual override)

---

#### 🎯 Method 1: Auto-Mapping (Recommended)

##### Setup Prisma DMMF Provider

**Step 1: Create Mapping Provider**

```typescript
// src/utils/prisma-mapping.provider.ts
import { Prisma } from '@prisma/client';
import { MappingProvider } from '@dwcahyo/nestjs-prisma-pipes';

export class PrismaMappingProvider implements MappingProvider {
  private tableNameCache: Map<string, string>;
  private fieldMappingCache: Map<string, Map<string, string>>;

  constructor() {
    this.tableNameCache = new Map();
    this.fieldMappingCache = new Map();
    this.initializeCache();
  }

  private initializeCache() {
    try {
      const dmmf = Prisma.dmmf;

      // Map model names to database table names
      for (const model of dmmf.datamodel.models) {
        const tableName = model.dbName || model.name;
        this.tableNameCache.set(model.name, tableName);

        // Map field names to column names
        const fieldMap = new Map<string, string>();
        for (const field of model.fields) {
          const columnName = field.dbName || field.name;
          fieldMap.set(field.name, columnName);
        }
        this.fieldMappingCache.set(model.name, fieldMap);
      }

      console.log('✅ Prisma DMMF mapping initialized');
    } catch (error) {
      console.warn('⚠️ Failed to initialize Prisma DMMF mapping:', error);
    }
  }

  getTableName(modelName: string): string {
    return this.tableNameCache.get(modelName) || modelName;
  }

  getColumnName(modelName: string, fieldName: string): string {
    const fieldMap = this.fieldMappingCache.get(modelName);
    return fieldMap?.get(fieldName) || fieldName;
  }
}
```

**Step 2: Register as Provider**

```typescript
// src/app.module.ts
import { Module, Global } from '@nestjs/common';
import { PrismaMappingProvider } from './utils/prisma-mapping.provider';

@Global()
@Module({
  providers: [
    {
      provide: 'MAPPING_PROVIDER',
      useClass: PrismaMappingProvider,
    },
  ],
  exports: ['MAPPING_PROVIDER'],
})
export class AppModule {}
```

**Step 3: Use in Controller**

```typescript
// src/products/products.controller.ts
import { Controller, Get, Query, Inject } from '@nestjs/common';
import { AggregatePipe, MappingProvider, Pipes } from '@dwcahyo/nestjs-prisma-pipes';

@Controller('products')
export class ProductsController {
  constructor(
    @Inject('MAPPING_PROVIDER') private mappingProvider: MappingProvider,
    private prisma: PrismaService
  ) {}

  @Get('stats')
  async getStats(
    @Query('aggregate') aggregateStr: string,
    @Query('where', WherePipe) where?: Pipes.Where,
  ) {
    // Inject mapping provider into pipe
    const pipe = new AggregatePipe('Product', this.mappingProvider);
    const aggregate = pipe.transform(aggregateStr);

    if (!aggregate) {
      throw new BadRequestException('Invalid aggregate query');
    }

    // Handle raw query with auto-mapping
    if (aggregate.useRawQuery && aggregate.rawQueryBuilder) {
      const { query, params } = aggregate.rawQueryBuilder('Product', where);
      const rawData = await this.prisma.$queryRawUnsafe(query, ...params);
      const transformedData = this.transformRawResults(rawData, aggregate);
      return AggregatePipe.toChartSeries(transformedData, aggregate);
    }

    // Standard Prisma query
    return this.prisma.product.groupBy({
      where,
      ...aggregate.prismaQuery,
    }).then(data => AggregatePipe.toChartSeries(data, aggregate));
  }
}
```

**Query Example:**
```bash
# Auto-maps: marketingMasterCategory → market_master_category
GET /products/stats?aggregate=qty: sum(), groupBy: (marketingMasterCategory.category)
```

**Generated SQL:**
```sql
SELECT 
  market_master_category.category as group_0,
  SUM(main.qty) as agg_sum_0
FROM Product as main
LEFT JOIN market_master_category as marketingMasterCategory 
  ON main.marketing_master_category_id = marketingMasterCategory.id
GROUP BY market_master_category.category
```

---

#### 🎯 Method 2: Explicit Mapping

Use `groupByMapping` parameter to manually specify table names:

**Query Example:**
```bash
GET /products/stats?aggregate=qty: sum(), groupBy: (marketingMasterCategory.category), groupByMapping: (market_master_category.category)
```

**Multiple Fields:**
```bash
GET /products/stats?aggregate=qty: sum(), recQty: avg(), groupBy: (category, warehouse.region, createdAt), groupByMapping: (product_category, warehouses.region_name, created_at)
```

**How It Works:**
- `groupBy` fields are mapped 1:1 with `groupByMapping` fields
- First field in `groupBy` → First field in `groupByMapping`
- Second field in `groupBy` → Second field in `groupByMapping`
- And so on...

**Advantages:**
- ✅ No setup required
- ✅ Works without Prisma in library
- ✅ Explicit control over mapping
- ✅ Override auto-mapping when needed

**Disadvantages:**
- ❌ Verbose query strings
- ❌ Manual maintenance
- ❌ Error-prone

---

#### 🎯 Method 3: Hybrid Approach

Combine auto-mapping with manual overrides:

```typescript
// Use auto-mapping by default
const pipe = new AggregatePipe('Product', mappingProvider);

// Override specific fields in query
GET /products/stats?aggregate=qty: sum(), groupBy: (marketingMasterCategory.category, specialField), groupByMapping: (market_master_category.category, custom_special_field)
```

**Priority:**
1. `groupByMapping` (highest)
2. `MappingProvider` (auto)
3. Identity mapping (fallback)

---

#### 📋 Prisma Schema Setup

**Option A: Use @map directive (Recommended)**

```prisma
// prisma/schema.prisma
model MarketingMasterCategory {
  id        Int       @id @default(autoincrement())
  category  String
  products  Product[]
  
  @@map("market_master_category")  // ← Maps model to table
}

model Product {
  id                          Int                      @id @default(autoincrement())
  qty                         Int
  marketingMasterCategoryId   Int                      @map("marketing_master_category_id")
  
  marketingMasterCategory     MarketingMasterCategory  @relation(fields: [marketingMasterCategoryId], references: [id])
  
  @@map("products")
}
```

**Option B: Match model names to table names**

```prisma
// If your tables use PascalCase
model MarketingMasterCategory {
  id        Int       @id @default(autoincrement())
  category  String
  // No @map needed if table name is "MarketingMasterCategory"
}
```

---

#### 🔄 Migration Guide v2.4.4 → v2.4.5

**Before (v2.4.4):**
```typescript
// Only worked when model name = table name
@Get('stats')
async getStats(
  @Query('aggregate', AggregatePipe) aggregate?: Pipes.Aggregate
) {
  // Would fail if model name ≠ table name
}
```

**After (v2.4.5):**

**Option 1: With Auto-Mapping**
```typescript
import { MappingProvider, AggregatePipe } from '@dwcahyo/nestjs-prisma-pipes';

@Get('stats')
async getStats(
  @Query('aggregate') aggregateStr: string,
  @Inject('MAPPING_PROVIDER') mappingProvider?: MappingProvider
) {
  const pipe = new AggregatePipe('Product', mappingProvider);
  const aggregate = pipe.transform(aggregateStr);
  // Now works regardless of table names
}
```

**Option 2: With Explicit Mapping**
```typescript
// No code changes needed!
// Just add groupByMapping to query string
GET /products/stats?aggregate=qty: sum(), groupBy: (marketingMasterCategory.category), groupByMapping: (market_master_category.category)
```

---

#### 🏗️ Service Layer Best Practices

**Generic Service with Mapping:**

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { AggregatePipe, MappingProvider, Pipes } from '@dwcahyo/nestjs-prisma-pipes';
import { PrismaService } from './prisma.service';

@Injectable()
export class BaseService<T> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string,
    @Inject('MAPPING_PROVIDER') protected readonly mappingProvider?: MappingProvider
  ) {}

  async stat(
    aggregateStr: string,
    filter?: Pipes.Where,
  ): Promise<Pipes.ChartSeries> {
    // Create pipe with mapping provider
    const pipe = new AggregatePipe(
      this.getModelName(), 
      this.mappingProvider
    );
    
    const aggregate = pipe.transform(aggregateStr);

    if (!aggregate) {
      throw new BadRequestException('Invalid aggregate query');
    }

    if (aggregate.useRawQuery && aggregate.rawQueryBuilder) {
      // Use raw SQL with auto-mapping
      const { query, params } = aggregate.rawQueryBuilder(
        this.getModelName(),
        filter
      );
      
      const rawData = await this.prisma.$queryRawUnsafe(query, ...params);
      const transformedData = this.transformRawResults(rawData, aggregate);
      
      return AggregatePipe.toChartSeries(transformedData, aggregate);
    }

    // Standard Prisma query
    const model = this.prisma[this.modelName];
    return model.groupBy({
      where: filter,
      ...aggregate.prismaQuery,
    }).then(data => AggregatePipe.toChartSeries(data, aggregate));
  }

  protected getModelName(): string {
    // Convert to PascalCase if needed
    return this.modelName.charAt(0).toUpperCase() + this.modelName.slice(1);
  }

  protected transformRawResults(rawData: any[], aggregate: Pipes.Aggregate): any[] {
    return rawData.map(row => {
      const transformed: any = {};
      
      // Map group fields
      aggregate.groupBy.forEach((field, idx) => {
        const groupKey = `group_${idx}`;
        if (row[groupKey] !== undefined) {
          if (field.includes('.')) {
            const parts = field.split('.');
            let current = transformed;
            
            for (let i = 0; i < parts.length - 1; i++) {
              if (!current[parts[i]]) current[parts[i]] = {};
              current = current[parts[i]];
            }
            current[parts[parts.length - 1]] = row[groupKey];
          } else {
            transformed[field] = row[groupKey];
          }
        }
      });
      
      // Map aggregate results
      aggregate.aggregates.forEach((agg, idx) => {
        const { function: func, field } = agg;
        const aggKey = `agg_${func}_${idx}`;
        
        if (row[aggKey] !== undefined) {
          if (!transformed[`_${func}`]) transformed[`_${func}`] = {};
          transformed[`_${func}`][field] = parseFloat(row[aggKey]) || 0;
        }
      });
      
      return transformed;
    });
  }
}
```

**Usage:**
```typescript
@Injectable()
export class ProductService extends BaseService<Product> {
  constructor(
    prisma: PrismaService,
    @Inject('MAPPING_PROVIDER') mappingProvider: MappingProvider
  ) {
    super(prisma, 'product', mappingProvider);
  }
}
```

---

#### 🧪 Testing

```typescript
describe('AggregatePipe - Table Mapping', () => {
  let mappingProvider: MappingProvider;
  let pipe: AggregatePipe;

  beforeEach(() => {
    mappingProvider = {
      getTableName: (name) => name === 'MarketingMasterCategory' 
        ? 'market_master_category' 
        : name,
      getColumnName: (model, field) => field,
    };
    
    pipe = new AggregatePipe('Product', mappingProvider);
  });

  it('should use auto-mapping', () => {
    const result = pipe.transform(
      'qty: sum(), groupBy: (marketingMasterCategory.category)'
    );
    
    const { query } = result!.rawQueryBuilder!('Product');
    expect(query).toContain('market_master_category');
  });

  it('should use explicit mapping', () => {
    const result = pipe.transform(
      'qty: sum(), groupBy: (category), groupByMapping: (custom_category)'
    );
    
    const { query } = result!.rawQueryBuilder!('Product');
    expect(query).toContain('custom_category');
  });

  it('should prioritize explicit over auto', () => {
    const result = pipe.transform(
      'qty: sum(), groupBy: (marketingMasterCategory.category), groupByMapping: (override_table.override_col)'
    );
    
    const { query } = result!.rawQueryBuilder!('Product');
    expect(query).toContain('override_table.override_col');
    expect(query).not.toContain('market_master_category');
  });
});
```

---

#### 📊 Real-World Examples

**Example 1: E-Commerce Dashboard**
```bash
# Auto-mapped query
GET /products/stats?aggregate=revenue: sum(), quantity: count(), groupBy: (productCategory.name, warehouse.location), chart: bar(productCategory.name, horizontal)
```

**Example 2: Supply Chain Analytics**
```bash
# Mixed: auto-map category, explicit-map warehouse
GET /inventory/stats?aggregate=stock: sum(), groupBy: (productCategory.name, warehouse.region), groupByMapping: (product_categories.category_name, wh_locations.region_code), chart: pie
```

**Example 3: Time Series with Relationships**
```bash
# Sales trend per category over time
GET /sales/stats?aggregate=amount: sum(), groupBy: (productCategory.name, orderDate), chart: line(orderDate, month)
```

---

#### ⚡ Performance Tips

1. **Add Indexes:**
```sql
-- Index foreign keys used in JOINs
CREATE INDEX idx_product_category_id ON products(marketing_master_category_id);
CREATE INDEX idx_product_warehouse_id ON products(warehouse_id);

-- Index group by columns
CREATE INDEX idx_category_name ON market_master_category(category);
```

2. **Use Auto-Mapping:**
   - Faster development
   - Less error-prone
   - Auto-updates with schema changes

3. **Cache Mapping Provider:**
   - Initialize once at startup
   - Register as singleton provider
   - Reuse across all services

4. **Profile Queries:**
```typescript
const startTime = Date.now();
const result = await this.stat(aggregateStr, filter);
console.log(`Query took ${Date.now() - startTime}ms`);
```

---

#### 🐛 Troubleshooting

**Issue 1: "Table doesn't exist"**
```typescript
// Check mapping provider is injected
constructor(
  @Inject('MAPPING_PROVIDER') private mappingProvider: MappingProvider // ← Must inject
) {}
```

**Issue 2: "Column not found"**
```typescript
// Verify @map directives in schema
model Product {
  categoryId Int @map("category_id") // ← Must match DB column
}
```

**Issue 3: "Cannot read getTableName"**
```typescript
// MappingProvider not registered
// Check app.module.ts has provider configuration
```

**Issue 4: "Explicit mapping not working"**
```typescript
// Ensure format is correct
groupBy: (field1, field2),
groupByMapping: (table1.col1, table2.col2) // Same order!
```

---

### [2.4.4] - 2025 🔥 Raw Query Support

(Previous changelog content...)

---

## 📦 Installation

```bash
npm install @dwcahyo/nestjs-prisma-pipes
```

---

## 🚀 Feature Comparison

| Feature | v2.4.3 | v2.4.4 | v2.4.5 |
|---------|--------|--------|--------|
| Basic Aggregation | ✅ | ✅ | ✅ |
| Relationship GroupBy | ❌ | ✅ | ✅ |
| Raw SQL Support | ❌ | ✅ | ✅ |
| Auto-Detection | ❌ | ✅ | ✅ |
| **Table Mapping** | ❌ | ❌ | ✅ 🎉 |
| **MappingProvider** | ❌ | ❌ | ✅ 🎉 |
| **Explicit Mapping** | ❌ | ❌ | ✅ 🎉 |
| Prisma DMMF Integration | ❌ | ❌ | ✅ 🎉 |

---

## 📝 API Reference

### MappingProvider Interface

```typescript
export interface MappingProvider {
  /**
   * Get database table name from model name
   * @param modelName - Prisma model name (e.g., 'MarketingMasterCategory')
   * @returns Database table name (e.g., 'market_master_category')
   */
  getTableName(modelName: string): string;
  
  /**
   * Get database column name from model field name
   * @param modelName - Prisma model name
   * @param fieldName - Model field name
   * @returns Database column name
   */
  getColumnName(modelName: string, fieldName: string): string;
}
```

### AggregatePipe Constructor

```typescript
class AggregatePipe {
  constructor(
    modelName: string,              // Prisma model name
    mappingProvider?: MappingProvider // Optional: for auto-mapping
  )
}
```

### Query Parameters

```typescript
// Aggregate query format
aggregate=field1: function(), field2: function(), groupBy: (fields), groupByMapping: (table.column), chart: type

// Parameters:
// - field: Model field name
// - function: sum | avg | min | max | count
// - groupBy: Comma-separated fields in parentheses
// - groupByMapping: Corresponding table.column names
// - chart: Chart configuration
```

---

## 📄 License

MIT

---

**✨ v2.4.5 makes table mapping effortless - works with any Prisma schema!**

Made with ❤️ by [dwcahyo](https://github.com/dwcahyo23)

[↑ Back to top](#-dwcahyonestjs-prisma-pipes)