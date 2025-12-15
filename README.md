# 🛠 @dwcahyo/nestjs-prisma-pipes

**Transform URL query strings into Prisma queries with zero manual parsing.**

Built for modern NestJS APIs with type-safe filtering, aggregations, timezone support, and **secure query encryption**.

---

## ✨ Features

- 🔍 **WherePipe** - Advanced filtering with 20+ operators
- 📊 **AggregatePipe** - Aggregations with chart generation
- 🔄 **OrderByPipe** - Multi-field sorting
- 📋 **SelectPipe** - Dynamic field selection
- 🔗 **IncludePipe** - Smart relation loading
- 🌍 **Timezone Support** - Global timezone configuration
- 🔒 **Security** - Query encryption with HMAC signatures (NEW in v2.5.0)
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

### 2. Configure Security (Optional but Recommended)

```typescript
// main.ts
import { configurePipesSecurity, configurePipesTimezone } from '@dwcahyo/nestjs-prisma-pipes';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configure query encryption (NEW in v2.5.0)
  configurePipesSecurity({
    enabled: true,
    secretKey: process.env.PIPES_SECRET_KEY, // Min 32 characters
    allowPlaintext: false,
    maxAge: 3600000, // 1 hour
  });
  
  // Configure timezone
  configurePipesTimezone({
    offset: '+07:00',
    name: 'Asia/Jakarta',
  });
  
  await app.listen(3000);
}
```

### 3. Make Requests

```bash
# Filter by price (queries will be auto-encrypted if security enabled)
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

### 🔒 Query Security (NEW in v2.5.0)

Protect your API queries with HMAC-signed encryption:

```typescript
// Backend automatically decrypts and validates
@Get()
async findAll(
  @Query('filter', WherePipe) where?: Pipes.Where,
  @ClientIp() clientIp?: string, // Optional IP validation
) {
  return this.prisma.product.findMany({ where });
}
```

```typescript
// Frontend automatically encrypts queries
import { encodeClientPipeQuery } from '@dwcahyo/nestjs-prisma-pipes/frontend';

const encrypted = await encodeClientPipeQuery(
  'price:gte+int(100)',
  process.env.VITE_PIPES_SECRET_KEY
);

fetch(`/api/products?filter=${encrypted}`);
```

**Benefits:**
- ✅ Prevent query tampering
- ✅ HMAC signature validation
- ✅ Timestamp-based expiration
- ✅ Optional IP whitelisting
- ✅ Works on HTTP and HTTPS

**[📖 Full Security Documentation](./docs/SECURITY.md)**

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
| **Security** | Query encryption & HMAC validation | [📖 Docs](./docs/SECURITY.md) |
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

### Secure E-Commerce API

```typescript
// Backend
@Get()
async search(
  @Query('filter', WherePipe) where?: Pipes.Where,
  @Query('sort', OrderByPipe) orderBy?: Pipes.Order,
  @ClientIp() clientIp?: string,
) {
  return this.prisma.product.findMany({
    where,
    orderBy,
    include: { category: true },
  });
}
```

```typescript
// Frontend
import { buildSecureUrl } from '@dwcahyo/nestjs-prisma-pipes/frontend';

const url = await buildSecureUrl(
  '/api/products',
  {
    filter: 'price:gte+int(100)',
    sort: '-createdAt',
  },
  secretKey
);

const response = await fetch(url);
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
import { configurePipesSecurity } from '@dwcahyo/nestjs-prisma-pipes';

describe('ProductController', () => {
  let wherePipe: WherePipe;

  beforeEach(async () => {
    // Configure security for tests
    configurePipesSecurity({
      enabled: true,
      secretKey: 'test-secret-key-min-32-characters-long',
      allowPlaintext: false,
    });

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
| **2.5.0** | 🔒 Security | Query encryption with HMAC |
| **2.4.14** | 🐛 Bug Fixes | Time series & nested display |
| **2.4.11** | 🔗 Many-to-Many | Pivot table aggregation |
| **2.4.10** | 🌍 Timezone | Global timezone config |
| **2.4.6** | 📊 Relationships | Nested field grouping |
| **2.4.0** | 📈 Charts | 5 chart types |
| **2.3.0** | 🔢 Aggregates | sum, avg, min, max, count |
| **2.0.0** | 🔄 Sorting | OrderByPipe |
| **1.0.0** | 🔍 Filtering | WherePipe |

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