# 🛠 @dwcahyo/nestjs-prisma-pipes

**Transform URL query strings into Prisma queries with zero manual parsing.**

Built for modern NestJS APIs with type-safe filtering, aggregations, and timezone support.

---

## ✨ Features

- 🔍 **WherePipe** - Advanced filtering with 20+ operators
- 📊 **AggregatePipe** - Aggregations with chart generation
- 🔄 **OrderByPipe** - Multi-field sorting
- 📋 **SelectPipe** - Dynamic field selection
- 🔗 **IncludePipe** - Smart relation loading
- 🌍 **Timezone Support** - Global timezone configuration
- 🎯 **Type Safe** - Full TypeScript support
- 🚀 **Zero Config** - Works out of the box

---

## 📦 Installation

```bash
npm install @dwcahyo/nestjs-prisma-pipes
```

---

## 🚀 Quick Start

### 1. Basic Setup

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { WherePipe, OrderByPipe, Pipes } from '@dwcahyo/nestjs-prisma-pipes';

@Controller('products')
export class ProductController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(
    @Query('filter', WherePipe) where?: Pipes.Where,
    @Query('sort', OrderByPipe) orderBy?: Pipes.Order,
  ) {
    return this.prisma.product.findMany({ where, orderBy });
  }
}
```

### 2. Make Requests

```bash
# Filter by price
GET /products?filter=price:gte+int(100),price:lte+int(500)

# Sort by price
GET /products?sort=-price

# Select fields
GET /products?fields=id,name,price

# Include relations
GET /products?include=category,reviews

# Combine filters
GET /products?filter=category.name:electronics&sort=-price&include=category
```

---

## 📖 Core Features

### 🔍 Filtering (WherePipe)

```bash
# Basic comparison
?filter=price:gte+int(100)

# Date filtering (timezone-aware)
?filter=createdAt:gte+date(2025-01-01)

# Text search
?filter=name:contains+laptop

# Array operations
?filter=tags:in+array(electronics,gadgets)

# Nested relations
?filter=category.name:electronics,warehouse.region:asia

# Field-to-field comparison
?filter=qty:lte+field(minStock)
```

**[📖 Full Documentation](./docs/WHERE_PIPE.md)**

### 📊 Aggregations (AggregatePipe)

```bash
# Simple aggregation
?aggregate=revenue:sum()

# With grouping
?aggregate=revenue:sum(),groupBy:(category)

# Chart generation
?aggregate=revenue:sum(),chart:line(orderDate,month:2025)

# Many-to-many pivot tables
?aggregate=s:avg(),groupBy:(leaders.leaderNik),chart:radar(leaders.leaderNik)
```

**[📖 Full Documentation](./docs/AGGREGATE_PIPE.md)**

### 🔄 Sorting (OrderByPipe)

```bash
# Ascending
?sort=price

# Descending
?sort=-price

# Multiple fields
?sort=category,-price,name

# Nested relations
?sort=category.name,-stock
```

**[📖 Full Documentation](./docs/ORDER_BY_SELECT_INCLUDE_PIPE.md)**

### 📋 Field Selection (SelectPipe)

```bash
# Select fields
?fields=id,name,price

# Nested selection
?fields=id,name,category.name
```

**[📖 Full Documentation](./docs/ORDER_BY_SELECT_INCLUDE_PIPE.md)**

### 🔗 Include Relations (IncludePipe)

```bash
# Single relation
?include=category

# Multiple relations
?include=category,reviews,warehouse

# Nested relations
?include=category,reviews.user
```

**[📖 Full Documentation](./docs/ORDER_BY_SELECT_INCLUDE_PIPE.md)**

---

## 🌍 Timezone Configuration

Configure once in `main.ts`:

```typescript
import { configurePipesTimezone } from '@dwcahyo/nestjs-prisma-pipes';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configure global timezone
  configurePipesTimezone({
    offset: '+07:00',
    name: 'Asia/Jakarta',
  });
  
  await app.listen(3000);
}
```

**Benefits:**
- ✅ Date filters respect your timezone
- ✅ Time series grouping is accurate
- ✅ No manual timezone conversion

**[📖 Full Documentation](./docs/TIMEZONE.md)**

---

## 🎯 Field-to-Field Comparison

Compare fields within your data:

```typescript
import { convertWhereClause } from '@dwcahyo/nestjs-prisma-pipes';

@Get('low-stock')
async getLowStock(@Query('filter', WherePipe) where?: Pipes.Where) {
  const resolved = convertWhereClause(where, this.prisma, 'product');
  return this.prisma.product.findMany({ where: resolved });
}
```

```bash
# Products where quantity is less than minimum stock
GET /products/low-stock?filter=qty:lte+field(minStock)
```

**[📖 Full Documentation](./docs/FIELD_REFERENCE.md)**

---

## 📚 Complete Documentation

| Topic | Description | Link |
|-------|-------------|------|
| **WherePipe** | Filtering with 20+ operators | [📖 Docs](./docs/WHERE_PIPE.md) |
| **AggregatePipe** | Aggregations & charts | [📖 Docs](./docs/AGGREGATE_PIPE.md) |
| **OrderBy/Select/Include** | Sorting, selection, relations | [📖 Docs](./docs/ORDER_BY_SELECT_INCLUDE_PIPE.md) |
| **Timezone** | Global timezone config | [📖 Docs](./docs/TIMEZONE.md) |
| **Field References** | Field-to-field comparison | [📖 Docs](./docs/FIELD_REFERENCE.md) |
| **API Reference** | Complete API docs | [📖 Docs](./docs/API.md) |
| **Best Practices** | Tips & patterns | [📖 Docs](./docs/BEST_PRACTICES.md) |
| **Changelog** | Version history | [📖 Docs](./CHANGELOG.md) |

---

## 💡 Common Use Cases

### E-Commerce Product Search

```typescript
@Get()
async search(
  @Query('filter', WherePipe) where?: Pipes.Where,
  @Query('sort', OrderByPipe) orderBy?: Pipes.Order,
) {
  return this.prisma.product.findMany({
    where,
    orderBy,
    include: { category: true },
  });
}
```

```bash
GET /products?filter=price:gte+int(100),category.name:electronics&sort=-createdAt
```

### Analytics Dashboard

```typescript
@Get('revenue')
async getRevenue(
  @Query('filter', WherePipe) where?: Pipes.Where,
  @Query('aggregate', AggregatePipe) aggregate?: Pipes.Aggregate,
) {
  const data = await AggregatePipe.execute(this.prisma.order, aggregate, where);
  return AggregatePipe.toChartSeries(data, aggregate);
}
```

```bash
GET /analytics/revenue?aggregate=total:sum(),chart:line(orderDate,month:2025)
```

### Inventory Management

```typescript
@Get('low-stock')
async getLowStock(@Query('filter', WherePipe) where?: Pipes.Where) {
  const resolved = convertWhereClause(where, this.prisma, 'product');
  return this.prisma.product.findMany({ where: resolved });
}
```

```bash
GET /inventory/low-stock?filter=qty:lte+field(minStock)
```

---

## 🔧 TypeScript Support

Full type safety out of the box:

```typescript
import { Pipes } from '@dwcahyo/nestjs-prisma-pipes';

// Type-safe parameters
async findAll(
  where?: Pipes.Where,
  orderBy?: Pipes.Order,
  select?: Pipes.Select,
  include?: Pipes.Include,
): Promise<Product[]> {
  return this.prisma.product.findMany({
    where,
    orderBy,
    select,
    include,
  });
}
```

---

## 🧪 Testing

```typescript
import { Test } from '@nestjs/testing';
import { WherePipe } from '@dwcahyo/nestjs-prisma-pipes';

describe('ProductController', () => {
  let wherePipe: WherePipe;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [WherePipe],
    }).compile();

    wherePipe = module.get(WherePipe);
  });

  it('should parse filter correctly', () => {
    const result = wherePipe.transform('price:gte+int(100)');
    expect(result).toEqual({ price: { gte: 100 } });
  });
});
```

**[📖 Testing Guide](./docs/TESTING.md)**

---

## 📝 Version History

| Version | Feature | Details |
|---------|---------|---------|
| **2.4.11** | Many-to-Many | Pivot table aggregation |
| **2.4.10** | Timezone | Global timezone config |
| **2.4.6** | Relationships | Nested field grouping |
| **2.4.0** | Charts | 5 chart types |
| **2.3.0** | Aggregates | sum, avg, min, max, count |
| **2.0.0** | Sorting | OrderByPipe |
| **1.0.0** | Filtering | WherePipe |

**[📖 Full Changelog](./CHANGELOG.md)**

---

## 🤝 Contributing

Contributions welcome! Please read our [Contributing Guidelines](./CONTRIBUTING.md).

---

## 📄 License

MIT © [dwcahyo](https://github.com/dwcahyo)

---

## 🔗 Links

- [GitHub](https://github.com/dwcahyo/nestjs-prisma-pipes)
- [npm](https://www.npmjs.com/package/@dwcahyo/nestjs-prisma-pipes)
- [Issues](https://github.com/dwcahyo/nestjs-prisma-pipes/issues)
- [Discussions](https://github.com/dwcahyo/nestjs-prisma-pipes/discussions)

---

**Made with ❤️ for the NestJS community**