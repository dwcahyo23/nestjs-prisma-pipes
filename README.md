# 🛠 @dwcahyo/nestjs-prisma-pipes

**NestJS + Prisma query pipes**  
Parse query strings (`where`, `orderBy`, `select`, `include`, `aggregate`) directly into **Prisma-ready objects**.  
No more manual parsing — just pass query params, and you're good to go 🚀

---

## 📦 Installation

```bash
npm install @dwcahyo/nestjs-prisma-pipes
```

---

## 🌍 Timezone Configuration

By default, all date operations use **UTC timezone**. To configure a different timezone for your application:

### Quick Setup

Configure timezone once at application startup:

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configurePipesTimezone } from '@dwcahyo/nestjs-prisma-pipes';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Configure timezone for all pipes
  configurePipesTimezone({
    offset: '+07:00',
    name: 'Asia/Jakarta',
  });

  await app.listen(3000);
  console.log('✅ Pipes timezone configured: Asia/Jakarta (+07:00)');
}
bootstrap();
```

### Supported Timezones

You can use any timezone offset:

```typescript
// Jakarta, Indonesia (WIB)
configurePipesTimezone({ offset: '+07:00', name: 'Asia/Jakarta' });

// New York, USA (EST)
configurePipesTimezone({ offset: '-05:00', name: 'America/New_York' });

// India (IST)
configurePipesTimezone({ offset: '+05:30', name: 'Asia/Kolkata' });

// London, UK (GMT)
configurePipesTimezone({ offset: '+00:00', name: 'Europe/London' });

// Tokyo, Japan (JST)
configurePipesTimezone({ offset: '+09:00', name: 'Asia/Tokyo' });
```

### Environment Variable Configuration

```env
# .env
TIMEZONE_OFFSET=+07:00
TIMEZONE_NAME=Asia/Jakarta
```

```typescript
// main.ts
import { ConfigService } from '@nestjs/config';
import { configurePipesTimezone } from '@dwcahyo/nestjs-prisma-pipes';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  configurePipesTimezone({
    offset: configService.get<string>('TIMEZONE_OFFSET', '+07:00'),
    name: configService.get<string>('TIMEZONE_NAME', 'Asia/Jakarta'),
  });

  await app.listen(3000);
}
bootstrap();
```

### How Timezone Works

When timezone is configured, all date operations automatically respect the configured timezone:

#### 1. **WherePipe** - Date Filtering

```bash
# Without timezone configuration (UTC)
GET /api/orders?filter=createdAt:gte+date(2025-11-01)
# Interprets as: 2025-11-01T00:00:00.000Z (UTC midnight)
# Misses data at 2025-11-01 00:11:36+07 (becomes 2025-10-31T17:11:36Z)

# With timezone configuration (+07:00)
GET /api/orders?filter=createdAt:gte+date(2025-11-01)
# Interprets as: 2025-11-01T00:00:00+07:00 (Jakarta midnight)
# Correctly includes data at 2025-11-01 00:11:36+07 ✅
```

#### 2. **AggregatePipe** - Time Series Grouping

```bash
# Groups by month respecting Jakarta timezone
GET /api/orders/stats?aggregate=revenue:sum(),chart:line(orderDate,month:2025)

# Data at 2025-01-31 23:30:00+07 → Grouped as "Jan 2025"
# Instead of "Feb 2025" if using UTC
```

### API Reference

```typescript
import { 
  configurePipesTimezone, 
  getPipesTimezone,
  TimezoneConfig 
} from '@dwcahyo/nestjs-prisma-pipes';

// Configure timezone
configurePipesTimezone({
  offset: '+07:00',
  name: 'Asia/Jakarta'
});

// Get current timezone configuration
const timezone = getPipesTimezone();
console.log(timezone);
// { offset: '+07:00', name: 'Asia/Jakarta', offsetHours: 7 }
```

### TypeScript Types

```typescript
interface TimezoneConfig {
  offset: string;      // Timezone offset (e.g., '+07:00')
  name: string;        // Timezone name (e.g., 'Asia/Jakarta')
  offsetHours: number; // Calculated offset in hours (e.g., 7)
}
```

### Check Current Timezone (Optional)

Create a system endpoint to verify timezone configuration:

```typescript
// system.controller.ts
import { Controller, Get } from '@nestjs/common';
import { getPipesTimezone } from '@dwcahyo/nestjs-prisma-pipes';

@Controller('system')
export class SystemController {
  @Get('timezone')
  getTimezone() {
    const timezone = getPipesTimezone();
    return {
      configured: timezone.offset !== '+00:00',
      ...timezone,
    };
  }
}
```

```bash
GET /api/system/timezone

# Response:
{
  "configured": true,
  "offset": "+07:00",
  "name": "Asia/Jakarta",
  "offsetHours": 7
}
```

### Important Notes

1. **Configure Once**: Call `configurePipesTimezone()` only once at application startup
2. **Before First Request**: Configure timezone before handling any requests
3. **Global Effect**: Timezone configuration affects all pipes globally
4. **Thread-Safe**: Uses singleton pattern for consistent behavior
5. **Default UTC**: If not configured, defaults to UTC (+00:00)

### Common Issues & Solutions

**Issue 1: Date filter not working correctly**
```typescript
// Problem: Dates stored as 2025-11-01 00:11:36+07 not matching gte filter
// Solution: Configure timezone to match your database
configurePipesTimezone({ offset: '+07:00' });
```

**Issue 2: Time series grouping incorrect**
```typescript
// Problem: Data grouped in wrong month/day
// Solution: Set timezone to match your users' location
configurePipesTimezone({ offset: '+07:00', name: 'Asia/Jakarta' });
```

**Issue 3: Mixed timezone data**
```typescript
// Problem: Database has mixed timezones
// Solution: Normalize timezone in database or use UTC
// Recommended: Store all dates in UTC, configure display timezone
```

---

## 🚀 Quick Start

### Basic Setup

```typescript
// app.controller.ts
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

### Example Requests

```bash
# Filter products
GET /products?filter=price:gte+int(100),category:electronics

# Sort by price descending
GET /products?sort=-price

# Select specific fields
GET /products?fields=id,name,price

# Include relations
GET /products?include=category,reviews

# Combine all
GET /products?filter=price:gte+int(100)&sort=-price&fields=id,name,price&include=category
```

---

## 📚 Available Pipes

### 1. WherePipe - Filtering

Parse filter strings into Prisma `where` clauses.

**Syntax:**
```
field: operator value
```

**Operators:**
- `lt`, `lte`, `gt`, `gte` - Comparison
- `equals`, `not` - Equality
- `contains`, `startsWith`, `endsWith` - String matching
- `in` - Array membership
- `has`, `hasEvery`, `hasSome` - Array operations

**Type Casting:**
```bash
# Integer
?filter=price:gte+int(100)

# Float
?filter=discount:lt+float(0.5)

# Boolean
?filter=active:equals+bool(true)

# Date (with timezone support!)
?filter=createdAt:gte+date(2025-11-01)

# Array
?filter=tags:in+array(electronics,gadgets)
```

**Multiple Conditions:**
```bash
# AND (comma-separated)
?filter=price:gte+int(100),category:electronics

# Date ranges (with timezone!)
?filter=createdAt:gte+date(2025-11-01),createdAt:lte+date(2025-11-30)

# Nested relations
?filter=category.name:electronics,warehouse.region:asia
```

### 2. OrderByPipe - Sorting

Parse sort strings into Prisma `orderBy` clauses.

**Syntax:**
```bash
# Ascending (default)
?sort=price

# Descending
?sort=-price

# Multiple fields
?sort=category,-price,name

# Nested relations
?sort=category.name,-warehouse.stock
```

### 3. SelectPipe - Field Selection

Parse field selection strings.

**Syntax:**
```bash
# Select specific fields
?fields=id,name,price

# Nested relations
?fields=id,name,category.name,category.slug

# Exclude fields (not supported, use select)
```

### 4. IncludePipe - Relation Inclusion

Parse include strings for loading relations.

**Syntax:**
```bash
# Include single relation
?include=category

# Include multiple relations
?include=category,reviews,warehouse

# Nested relations
?include=category,reviews.user,warehouse.location
```

### 5. AggregatePipe - Aggregations & Charts

Parse aggregate queries with chart configurations.

**Basic Aggregation:**
```bash
# Single aggregate
?aggregate=price:sum()

# Multiple aggregates
?aggregate=price:sum(),quantity:avg(),orders:count()

# With groupBy
?aggregate=price:sum(),groupBy:(category)

# With chart
?aggregate=revenue:sum(),chart:bar(category)
```

**Time Series Charts:**
```bash
# Monthly revenue (with year parameter!)
?aggregate=revenue:sum(),chart:line(orderDate,month:2025)

# Daily orders for specific year
?aggregate=orders:count(),chart:area(orderDate,day:2024)

# Yearly trend (5 years ending 2025)
?aggregate=sales:sum(),chart:line(saleDate,year:2025)
```

**Grouped Time Series:**
```bash
# Revenue by status per month in 2025
?aggregate=revenue:sum(),groupBy:(status),chart:line(orderDate,month:2025)

# Sales by region and category
?aggregate=sales:sum(),groupBy:(region,category),chart:bar(region,stacked)
```

**Chart Types:**
- `bar` - Bar chart
- `line` - Line chart
- `area` - Area chart
- `pie` - Pie chart
- `donut` - Donut chart

**Chart Options:**
- `stacked` - Stack series
- `horizontal` - Horizontal orientation

See [CHANGELOG.md](./CHANGELOG.md) for detailed aggregate features including manual aggregation for relationships.

---

## 🔧 Advanced Usage

### Service Layer Pattern

```typescript
// base.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Pipes, AggregatePipe } from '@dwcahyo/nestjs-prisma-pipes';

@Injectable()
export class BaseService<T> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string,
  ) {}

  async findAll(
    where?: Pipes.Where,
    orderBy?: Pipes.Order,
    select?: Pipes.Select,
    include?: Pipes.Include,
    take?: number,
    skip?: number,
  ) {
    return this.prisma[this.modelName].findMany({
      where,
      orderBy,
      select,
      include,
      take,
      skip,
    });
  }

  async stat(
    filter?: Pipes.Where,
    aggregate?: Pipes.Aggregate,
  ): Promise<Pipes.ChartSeries> {
    if (!aggregate) {
      throw new BadRequestException('Aggregate query is required');
    }

    try {
      const model = this.prisma[this.modelName];
      
      // Handles both simple and relationship aggregations
      const data = await AggregatePipe.execute(model, aggregate, filter);
      return AggregatePipe.toChartSeries(data, aggregate);
    } catch (error) {
      throw new BadRequestException(
        `Failed to execute aggregate query: ${error.message}`
      );
    }
  }
}

// product.service.ts
@Injectable()
export class ProductService extends BaseService<Product> {
  constructor(prisma: PrismaService) {
    super(prisma, 'product');
  }
}
```

### Field-to-Field Comparison

Compare values between fields:

```bash
# Products where quantity is less than received quantity
?filter=qty:lte+field(recQty)

# Orders where shipping cost exceeds product cost
?filter=shippingCost:gt+field(productCost)

# Users where balance is greater than credit limit
?filter=balance:gte+field(creditLimit)
```

**Service implementation:**
```typescript
import { convertFieldReferences, createFieldRefConverter } from '@dwcahyo/nestjs-prisma-pipes';

async findAll(where?: Pipes.Where) {
  // Convert field references to Prisma format
  const whereWithRefs = convertFieldReferences(
    where,
    createFieldRefConverter('product') // Your model name
  );

  return this.prisma.product.findMany({ where: whereWithRefs });
}
```

---

## 📖 Real-World Examples

### Example 1: E-Commerce Product Listing

```typescript
@Controller('products')
export class ProductController {
  @Get()
  async getProducts(
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
      include: {
        category: true,
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }
}
```

**Request:**
```bash
GET /products?filter=price:gte+int(100),price:lte+int(500),category.name:electronics&sort=-createdAt&page=1&limit=20
```

### Example 2: Sales Analytics Dashboard

```typescript
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly orderService: OrderService) {}

  @Get('revenue')
  async getRevenue(
    @Query('filter', WherePipe) where?: Pipes.Where,
    @Query('aggregate', AggregatePipe) aggregate?: Pipes.Aggregate,
  ): Promise<Pipes.ChartSeries> {
    return this.orderService.stat(where, aggregate);
  }
}
```

**Requests:**
```bash
# Monthly revenue for 2025
GET /analytics/revenue?aggregate=total:sum(),chart:line(orderDate,month:2025)

# Revenue by status (stacked)
GET /analytics/revenue?aggregate=total:sum(),groupBy:(status),chart:bar(status,stacked)

# Regional performance with relationships
GET /analytics/revenue?aggregate=total:sum(),groupBy:(warehouse.region),chart:pie(warehouse.region)

# Annual report with year lock
GET /analytics/revenue?aggregate=total:sum(),groupBy:(quarter),chart:bar(orderDate,month:2025)&filter=orderDate:gte+date(2025-01-01),orderDate:lte+date(2025-12-31)
```

### Example 3: Inventory Management

```typescript
@Get('low-stock')
async getLowStock(
  @Query('filter', WherePipe) where?: Pipes.Where,
) {
  // Products where quantity is less than minimum stock level
  const lowStockWhere = {
    ...where,
    qty: { lte: this.prisma.product.fields.minStock }, // Field reference
  };

  return this.prisma.product.findMany({
    where: lowStockWhere,
    include: { warehouse: true },
    orderBy: { qty: 'asc' },
  });
}
```

**Request:**
```bash
# Low stock items in Asia region
GET /inventory/low-stock?filter=warehouse.region:asia,qty:lte+field(minStock)
```

---

## 🎯 Best Practices

### 1. Timezone Configuration
```typescript
// ✅ DO: Configure once at startup
configurePipesTimezone({ offset: '+07:00' });

// ❌ DON'T: Configure multiple times or per-request
```

### 2. Use Type-Safe Queries
```typescript
// ✅ DO: Use Pipes namespace
async findAll(where?: Pipes.Where): Promise<Product[]> {
  return this.prisma.product.findMany({ where });
}

// ❌ DON'T: Use 'any'
async findAll(where?: any) { }
```

### 3. Validate Query Parameters
```typescript
// ✅ DO: Add validation
@Get()
async findAll(
  @Query('filter', WherePipe) where?: Pipes.Where,
  @Query('page', ParseIntPipe) page = 1,
  @Query('limit', ParseIntPipe) limit = 20,
) {
  if (limit > 100) throw new BadRequestException('Limit too large');
  // ...
}
```

### 4. Handle Aggregation Errors
```typescript
// ✅ DO: Wrap in try-catch
try {
  const data = await AggregatePipe.execute(model, aggregate, filter);
  return AggregatePipe.toChartSeries(data, aggregate);
} catch (error) {
  throw new BadRequestException(`Aggregation failed: ${error.message}`);
}
```

### 5. Optimize Large Aggregations
```typescript
// ✅ DO: Use filters to reduce data
?filter=createdAt:gte+date(2025-01-01)&aggregate=qty:sum(),groupBy:(category)

// ✅ DO: Add database indexes
@@index([categoryId])
@@index([createdAt])
```

---

## 🔍 Troubleshooting

### Issue 1: Date Filter Not Working

**Problem:**
```bash
# Data at 2025-11-01 00:11:36+07 not matching filter
GET /api/orders?filter=orderDate:gte+date(2025-11-01)
```

**Solution:**
```typescript
// Configure timezone to match database
configurePipesTimezone({ offset: '+07:00' });
```

### Issue 2: Relationship Aggregation Fails

**Problem:**
```bash
# Error: Cannot group by relationship
GET /api/products/stats?aggregate=qty:sum(),groupBy:(category.name)
```

**Solution:**
```typescript
// Use AggregatePipe.execute (handles relationships automatically)
const data = await AggregatePipe.execute(
  this.prisma.product,
  aggregate,
  filter
);
```

### Issue 3: Time Series Shows Wrong Months

**Problem:**
```bash
# Chart shows wrong month labels
GET /api/sales?aggregate=revenue:sum(),chart:line(saleDate,month)
```

**Solution:**
```typescript
// 1. Configure timezone
configurePipesTimezone({ offset: '+07:00' });

// 2. Or specify year explicitly
GET /api/sales?aggregate=revenue:sum(),chart:line(saleDate,month:2025)
```

---

## 📄 License

MIT

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📚 Documentation

- [Changelog](./CHANGELOG.md) - Detailed version history
- [API Reference](./docs/API.md) - Complete API documentation
- [Examples](./examples) - More code examples

---

## 💬 Support

- GitHub Issues: [Report a bug](https://github.com/dwcahyo/nestjs-prisma-pipes/issues)
- Discussions: [Ask questions](https://github.com/dwcahyo/nestjs-prisma-pipes/discussions)

---

**Made with ❤️ for the NestJS community**