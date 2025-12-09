# 🛠 @dwcahyo/nestjs-prisma-pipes

**NestJS + Prisma query pipes**  
Transform query strings into Prisma-ready objects with zero manual parsing.  
Built for modern APIs with type-safe, timezone-aware, field-to-field comparison support.

[![npm version](https://badge.fury.io/js/%40dwcahyo%2Fnestjs-prisma-pipes.svg)](https://www.npmjs.com/package/@dwcahyo/nestjs-prisma-pipes)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ✨ Features

- 🔍 **WherePipe** - Advanced filtering with field-to-field comparison
- 📊 **AggregatePipe** - Powerful aggregations with chart support
- 🔄 **OrderByPipe** - Multi-level sorting with relations
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

```bash
yarn add @dwcahyo/nestjs-prisma-pipes
```

```bash
pnpm add @dwcahyo/nestjs-prisma-pipes
```

---

## 🚀 Quick Start

### 1. Configure Timezone (Optional but Recommended)

Configure timezone once at application startup:

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { configurePipesTimezone } from '@dwcahyo/nestjs-prisma-pipes';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure timezone for all date operations
  configurePipesTimezone({
    offset: '+07:00',
    name: 'Asia/Jakarta',
  });

  await app.listen(3000);
}
bootstrap();
```

### 2. Use in Your Controller

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { 
  WherePipe, 
  OrderByPipe, 
  SelectPipe, 
  IncludePipe,
  Pipes 
} from '@dwcahyo/nestjs-prisma-pipes';

@Controller('products')
export class ProductController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(
    @Query('filter', WherePipe) where?: Pipes.Where,
    @Query('sort', OrderByPipe) orderBy?: Pipes.Order,
    @Query('fields', SelectPipe) select?: Pipes.Select,
    @Query('include', IncludePipe) include?: Pipes.Include,
  ) {
    return this.prisma.product.findMany({
      where,
      orderBy,
      select,
      include,
    });
  }
}
```

### 3. Make Requests

```bash
# Filter products by price range
GET /products?filter=price:gte+int(100),price:lte+int(500)

# Sort by price descending
GET /products?sort=-price

# Select specific fields
GET /products?fields=id,name,price

# Include relations
GET /products?include=category,reviews

# Combine everything
GET /products?filter=price:gte+int(100)&sort=-price&fields=id,name,price&include=category
```

---

## 📚 Documentation

### Core Pipes

| Pipe | Description | Documentation |
|------|-------------|---------------|
| **WherePipe** | Advanced filtering with operators, types, and field references | [📖 View Docs](./docs/WHERE_PIPE.md) |
| **AggregatePipe** | Aggregations, grouping, and chart generation | [📖 View Docs](./docs/AGGREGATE_PIPE.md) |
| **OrderByPipe** | Multi-level sorting with nested relations | [📖 View Docs](./docs/ORDER_BY_SELECT_INCLUDE_PIPE.md) |
| **SelectPipe** | Dynamic field selection | [📖 View Docs](./docs/ORDER_BY_SELECT_INCLUDE_PIPE.md) |
| **IncludePipe** | Smart relation loading | [📖 View Docs](./docs/ORDER_BY_SELECT_INCLUDE_PIPE.md) |

### Features

| Feature | Description | Documentation |
|---------|-------------|---------------|
| **Timezone Configuration** | Global timezone support for date operations | [📖 View Docs](./docs/TIMEZONE.md) |
| **Field References** | Field-to-field comparison in filters | [📖 View Docs](./docs/FIELD_REFERENCE.md) |

### Additional Resources

- [🔧 API Reference](./docs/API.md)
- [📝 Changelog](./CHANGELOG.md)
- [🎯 Best Practices](./docs/BEST_PRACTICES.md)
- [🧪 Testing Guide](./docs/TESTING.md)
- [💡 Examples](./examples)

---

## 🎯 Common Use Cases

### E-Commerce Product Search

```typescript
@Controller('products')
export class ProductController {
  @Get()
  async search(
    @Query('filter', WherePipe) where?: Pipes.Where,
    @Query('sort', OrderByPipe) orderBy?: Pipes.Order,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const skip = (page - 1) * limit;

    return this.prisma.product.findMany({
      where,
      orderBy,
      take: limit,
      skip,
      include: { category: true },
    });
  }
}
```

**Request:**
```bash
GET /products?filter=price:gte+int(100),category.name:electronics&sort=-createdAt&page=1
```

### Sales Analytics Dashboard

```typescript
@Controller('analytics')
export class AnalyticsController {
  @Get('revenue')
  async getRevenue(
    @Query('filter', WherePipe) where?: Pipes.Where,
    @Query('aggregate', AggregatePipe) aggregate?: Pipes.Aggregate,
  ) {
    const model = this.prisma.order;
    const data = await AggregatePipe.execute(model, aggregate, where);
    return AggregatePipe.toChartSeries(data, aggregate);
  }
}
```

**Request:**
```bash
GET /analytics/revenue?aggregate=total:sum(),chart:line(orderDate,month:2025)
```

### Inventory Management with Field Comparison

```typescript
@Get('low-stock')
async getLowStock(@Query('filter', WherePipe) where?: Pipes.Where) {
  // Convert field references
  const resolved = convertWhereClause(where, this.prisma, 'product');
  
  return this.prisma.product.findMany({
    where: resolved,
    orderBy: { qty: 'asc' },
  });
}
```

**Request:**
```bash
# Products where quantity is less than minimum stock
GET /inventory/low-stock?filter=qty:lte+field(minStock)
```

---

## 🔑 Key Features

### 1. Advanced Filtering (WherePipe)

```bash
# Type casting
?filter=price:gte+int(100)

# Date ranges (timezone-aware!)
?filter=createdAt:gte+date(2025-01-01),createdAt:lte+date(2025-12-31)

# Field-to-field comparison
?filter=qty:lte+field(recQty)

# Nested relations
?filter=category.name:electronics,warehouse.region:asia

# Array operations
?filter=tags:in+array(electronics,gadgets)
```

[📖 Read Full WherePipe Documentation](./docs/WHERE_PIPE.md)

### 2. Powerful Aggregations (AggregatePipe)

```bash
# Simple aggregation
?aggregate=price:sum()

# With grouping
?aggregate=revenue:sum(),groupBy:(category)

# Chart generation
?aggregate=revenue:sum(),chart:line(orderDate,month:2025)

# Multi-series charts
?aggregate=revenue:sum(),groupBy:(status),chart:bar(status,stacked)
```

[📖 Read Full AggregatePipe Documentation](./docs/AGGREGATE_PIPE.md)

### 3. Flexible Sorting (OrderByPipe)

```bash
# Single field ascending
?sort=price

# Multiple fields
?sort=category,-price,name

# Nested relations
?sort=category.name,-warehouse.stock
```

[📖 Read Full OrderByPipe Documentation](./docs/ORDER_BY_SELECT_INCLUDE_PIPE.md)

### 4. Dynamic Field Selection (SelectPipe)

```bash
# Select specific fields
?fields=id,name,price

# Nested selection
?fields=id,name,category.name,category.slug
```

[📖 Read Full SelectPipe Documentation](./docs/ORDER_BY_SELECT_INCLUDE_PIPE.md)

### 5. Smart Relation Loading (IncludePipe)

```bash
# Single relation
?include=category

# Multiple relations
?include=category,reviews,warehouse

# Nested relations
?include=category,reviews.user
```

[📖 Read Full IncludePipe Documentation](./docs/ORDER_BY_SELECT_INCLUDE_PIPE.md)

---

## 🌍 Timezone Support

Configure once, use everywhere:

```typescript
import { configurePipesTimezone } from '@dwcahyo/nestjs-prisma-pipes';

configurePipesTimezone({
  offset: '+07:00',
  name: 'Asia/Jakarta',
});
```

**Benefits:**
- ✅ Date filters respect your timezone
- ✅ Time series grouping is accurate
- ✅ No more timezone confusion
- ✅ Works globally across all pipes

[📖 Read Full Timezone Documentation](./docs/TIMEZONE.md)

---

## 🎯 Field-to-Field Comparison

NEW feature for comparing fields within your data:

```typescript
import { convertWhereClause } from '@dwcahyo/nestjs-prisma-pipes';

async findAll(where?: Pipes.Where) {
  // Resolve field references
  const resolved = convertWhereClause(where, this.prisma, 'product');
  
  return this.prisma.product.findMany({ where: resolved });
}
```

**Use cases:**
- Products where `qty < minStock`
- Orders where `shippingCost > productCost`
- Users where `balance >= creditLimit`
- Workorders with machine assignment timeline

[📖 Read Full Field Reference Documentation](./docs/FIELD_REFERENCE.md)

---

## 🔧 API Reference

### Exports

```typescript
// Pipes
export {
  WherePipe,
  OrderByPipe,
  SelectPipe,
  IncludePipe,
  AggregatePipe,
}

// Helpers
export {
  convertWhereClause,
  createFieldRefConverter,
  validateFieldReferences,
  configurePipesTimezone,
  getPipesTimezone,
}

// Types
export type {
  Pipes,
  Where,
  OrderBy,
  Select,
  Include,
  Aggregate,
  FieldReference,
  // ... and more
}
```

[📖 View Complete API Reference](./docs/API.md)

---

## 🎓 Examples

### Basic CRUD Controller

```typescript
@Controller('users')
export class UserController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(
    @Query('filter', WherePipe) where?: Pipes.Where,
    @Query('sort', OrderByPipe) orderBy?: Pipes.Order,
  ) {
    return this.prisma.user.findMany({ where, orderBy });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
```

### Service Layer Pattern

```typescript
@Injectable()
export abstract class BaseService<T> {
  protected abstract modelName: string;

  constructor(protected prisma: PrismaService) {}

  async findMany(where?: Pipes.Where, orderBy?: Pipes.Order) {
    const resolved = convertWhereClause(where, this.prisma, this.modelName);
    return this.prisma[this.modelName].findMany({ 
      where: resolved, 
      orderBy 
    });
  }
}

@Injectable()
export class ProductService extends BaseService<Product> {
  protected modelName = 'product';
}
```

[📖 View More Examples](./examples)

---

## 🧪 Testing

```typescript
import { Test } from '@nestjs/testing';
import { WherePipe } from '@dwcahyo/nestjs-prisma-pipes';

describe('ProductController', () => {
  let controller: ProductController;
  let wherePipe: WherePipe;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [PrismaService, WherePipe],
    }).compile();

    controller = module.get(ProductController);
    wherePipe = module.get(WherePipe);
  });

  it('should parse filter query', () => {
    const where = wherePipe.transform('price:gte+int(100)');
    expect(where).toEqual({ price: { gte: 100 } });
  });
});
```

[📖 Read Full Testing Guide](./docs/TESTING.md)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

[📖 View Contributing Guidelines](./CONTRIBUTING.md)

---

## 📄 License

MIT © [dwcahyo](https://github.com/dwcahyo)

---

## 🔗 Links

- [GitHub Repository](https://github.com/dwcahyo/nestjs-prisma-pipes)
- [npm Package](https://www.npmjs.com/package/@dwcahyo/nestjs-prisma-pipes)
- [Issue Tracker](https://github.com/dwcahyo/nestjs-prisma-pipes/issues)
- [Discussions](https://github.com/dwcahyo/nestjs-prisma-pipes/discussions)

---

## 💬 Support

Need help? Have questions?

- 📖 [Documentation](./docs)
- 💬 [GitHub Discussions](https://github.com/dwcahyo/nestjs-prisma-pipes/discussions)
- 🐛 [Issue Tracker](https://github.com/dwcahyo/nestjs-prisma-pipes/issues)

---

**Made with ❤️ for the NestJS community**