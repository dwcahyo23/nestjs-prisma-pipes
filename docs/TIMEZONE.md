## 🌍 Timezone Configuration (TIMEZONE.md)

Global timezone support for all date operations.

### Overview

Timezone configuration ensures:
- ✅ Date filters respect your timezone
- ✅ Time series grouping is accurate
- ✅ Consistent date handling across all pipes
- ✅ No manual timezone conversion needed

### Quick Setup

Configure once at application startup:

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { configurePipesTimezone } from '@dwcahyo/nestjs-prisma-pipes';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure timezone
  configurePipesTimezone({
    offset: '+07:00',
    name: 'Asia/Jakarta',
  });

  await app.listen(3000);
}
bootstrap();
```

### Supported Timezones

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

### Environment Variables

```env
# .env
TIMEZONE_OFFSET=+07:00
TIMEZONE_NAME=Asia/Jakarta
```

```typescript
// main.ts
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  configurePipesTimezone({
    offset: config.get('TIMEZONE_OFFSET', '+07:00'),
    name: config.get('TIMEZONE_NAME', 'Asia/Jakarta'),
  });

  await app.listen(3000);
}
```

### How It Works

#### WherePipe - Date Filtering

```bash
# Without timezone (UTC)
GET /orders?filter=createdAt:gte+date(2025-11-01)
# Interprets as: 2025-11-01T00:00:00.000Z
# Misses data at 2025-11-01 00:11:36+07 ❌

# With timezone (+07:00)
GET /orders?filter=createdAt:gte+date(2025-11-01)
# Interprets as: 2025-11-01T00:00:00+07:00
# Correctly includes data at 2025-11-01 00:11:36+07 ✅
```

#### AggregatePipe - Time Series

```bash
# Monthly grouping respects timezone
GET /analytics/revenue?aggregate=revenue:sum(),chart:line(orderDate,month:2025)

# Data at 2025-01-31 23:30:00+07 → "Jan 2025" ✅
# Without timezone → "Feb 2025" (UTC) ❌
```

### API Reference

```typescript
import { 
  configurePipesTimezone,
  getPipesTimezone,
  type TimezoneConfig 
} from '@dwcahyo/nestjs-prisma-pipes';

// Configure
configurePipesTimezone({
  offset: '+07:00',
  name: 'Asia/Jakarta'
});

// Get current config
const timezone = getPipesTimezone();
console.log(timezone);
// {
//   offset: '+07:00',
//   name: 'Asia/Jakarta',
//   offsetHours: 7
// }
```

### Type Definition

```typescript
interface TimezoneConfig {
  offset: string;      // e.g., '+07:00'
  name: string;        // e.g., 'Asia/Jakarta'
  offsetHours: number; // e.g., 7 (auto-calculated)
}
```

### Verify Configuration

Create an endpoint to check timezone:

```typescript
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

### Common Issues

#### Issue 1: Date Filter Incorrect

**Problem:** Dates stored as `2025-11-01 00:11:36+07` not matching filter.

**Solution:**
```typescript
// Configure timezone to match your database
configurePipesTimezone({ offset: '+07:00' });
```

#### Issue 2: Time Series Wrong Month

**Problem:** Data grouped in wrong month.

**Solution:**
```typescript
// Set timezone and specify year
configurePipesTimezone({ offset: '+07:00' });

// Query with explicit year
GET /analytics?aggregate=revenue:sum(),chart:line(orderDate,month:2025)
```

#### Issue 3: Mixed Timezone Data

**Problem:** Database has mixed timezones.

**Solution:**
```typescript
// Store all dates in UTC, configure display timezone
// Or normalize timezone in database
```

### Best Practices

1. **Configure once at startup**
   ```typescript
   // ✅ Good - Once in main.ts
   configurePipesTimezone({ offset: '+07:00' });
   
   // ❌ Bad - Multiple times
   configurePipesTimezone({ offset: '+07:00' });
   configurePipesTimezone({ offset: '+08:00' }); // Overwrites!
   ```

2. **Match database timezone**
   ```typescript
   // If DB stores dates in Jakarta time (+07:00)
   configurePipesTimezone({ offset: '+07:00' });
   ```

3. **Use environment variables**
   ```typescript
   // ✅ Good - Configurable per environment
   configurePipesTimezone({
     offset: process.env.TIMEZONE_OFFSET || '+07:00',
     name: process.env.TIMEZONE_NAME || 'Asia/Jakarta',
   });
   ```

4. **Test with different timezones**
   ```typescript
   // Test edge cases around midnight
   GET /orders?filter=createdAt:gte+date(2025-11-01)
   
   // Verify month boundaries for time series
   GET /analytics?aggregate=revenue:sum(),chart:line(orderDate,month:2025)
   ```

### Important Notes

- **Global Effect:** Affects all pipes globally
- **Thread-Safe:** Uses singleton pattern
- **Default UTC:** If not configured, defaults to UTC (+00:00)
- **One-Time Setup:** Call only once at startup
- **Before Requests:** Must configure before handling any requests

---

## Related Documentation

- [📖 WherePipe - Filtering](./WHERE_PIPE.md)
- [📖 AggregatePipe - Aggregations](./AGGREGATE_PIPE.md)
- [📖 Best Practices](./BEST_PRACTICES.md)
- [📖 API Reference](./API.md)

---

[⬅️ Back to Main Documentation](../README.md)