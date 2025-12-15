# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.5.0] - 2025-12-15

### 🔒 Added - Query Encryption & Security

Added comprehensive security layer with HMAC-signed query encryption.

#### What's New

**Backend Security:**
- ✅ Automatic query decryption in all pipes
- ✅ HMAC-SHA256 signature validation
- ✅ Timestamp-based query expiration
- ✅ Optional IP address whitelisting
- ✅ Configurable plaintext fallback mode
- ✅ Client IP extraction decorator

**Frontend Encryption:**
- ✅ Browser-compatible encryption (HTTP & HTTPS)
- ✅ Pure JavaScript SHA-256 fallback
- ✅ Web Crypto API support
- ✅ React hooks for secure queries
- ✅ URL builder utilities

#### Configuration

```typescript
// Backend - main.ts
import { configurePipesSecurity } from '@dwcahyo/nestjs-prisma-pipes';

configurePipesSecurity({
  enabled: true,
  secretKey: process.env.PIPES_SECRET_KEY, // Min 32 chars
  allowPlaintext: false,
  maxAge: 3600000, // 1 hour
  whitelistedIPs: ['192.168.1.100'], // Optional
});
```

```typescript
// Frontend
import { encodeClientPipeQuery } from '@dwcahyo/nestjs-prisma-pipes/frontend';

const encrypted = await encodeClientPipeQuery(
  'price:gte+int(100)',
  secretKey
);
```

#### Security Levels

**Level 1 - Disabled (Development):**
```env
PIPES_SECURITY_ENABLED=false
```

**Level 2 - Enabled with Fallback (Transition):**
```env
PIPES_SECURITY_ENABLED=true
PIPES_SECRET_KEY=your-secret-key
PIPES_ALLOW_PLAINTEXT=true
```

**Level 3 - Strict (Production):**
```env
PIPES_SECURITY_ENABLED=true
PIPES_SECRET_KEY=your-secret-key
PIPES_ALLOW_PLAINTEXT=false
PIPES_WHITELISTED_IPS=192.168.1.100,192.168.1.101
```

#### Affected Pipes

All pipes now support encryption:
- `WherePipe` - Filter queries
- `OrderByPipe` - Sort queries
- `SelectPipe` - Field selection
- `IncludePipe` - Relation inclusion
- `AggregatePipe` - Aggregation queries

#### Benefits

- 🛡️ **Tamper Protection** - Queries cannot be modified in transit
- ⏱️ **Replay Prevention** - Timestamp validation prevents replay attacks
- 🔐 **Data Integrity** - HMAC ensures query authenticity
- 🌐 **Universal** - Works on both HTTP and HTTPS
- 🚀 **Performance** - Minimal overhead (~5-10ms)
- 🔄 **Backward Compatible** - Existing code works without changes

#### Migration Guide

**Step 1 - Backend Setup:**
```typescript
// app.module.ts or main.ts
import { configurePipesSecurity } from '@dwcahyo/nestjs-prisma-pipes';

configurePipesSecurity({
  enabled: true,
  secretKey: process.env.PIPES_SECRET_KEY,
  allowPlaintext: true, // Allow transition period
});
```

**Step 2 - Frontend Setup:**
```typescript
// Frontend - setup encryption
import { encodeClientPipeQuery } from '@dwcahyo/nestjs-prisma-pipes/frontend';

const secretKey = import.meta.env.VITE_PIPES_SECRET_KEY;

// Encrypt before sending
const encryptedFilter = await encodeClientPipeQuery(
  'price:gte+int(100)',
  secretKey
);

fetch(`/api/products?filter=${encryptedFilter}`);
```

**Step 3 - Strict Mode (Production):**
```env
PIPES_ALLOW_PLAINTEXT=false
```

#### Breaking Changes

None! Security is opt-in and backward compatible.

#### Testing

Comprehensive test suite added:
- ✅ 45+ test cases for encryption/decryption
- ✅ Case sensitivity preservation tests
- ✅ Unicode and emoji support tests
- ✅ Performance benchmarks
- ✅ Edge case handling

**See detailed documentation:** 
- [Security Guide](./docs/SECURITY.md)
- [Migration Guide](./docs/MIGRATION_V2.5.md)
- [API Reference](./docs/API.md#security)

---

## [2.4.14] - 2025-12-01

### 🐛 Bug Fixes

**BUG 1 - Time Series Year Display:**
- **Problem:** generateTimeSeriesLabelsEnhanced used `new Date().getFullYear()` instead of year from actual data
- **Solution:** extractYearRangeFromData now properly extracts year from "Dec 2025" format and passes it to generateTimeSeriesLabelsEnhanced
- **Impact:** Time series charts now show correct year labels

**BUG 2 - Nested Relationship Categories:**
- **Problem:** getNestedValue returns object `{ mcCode: "BF-08414" }` which becomes "null" when converted to string
- **Solution:** New extractDisplayValue() function that:
  1. Checks common display fields (mcCode, code, name, id, nik, title)
  2. Returns the first non-null field value
  3. Falls back to JSON.stringify if no display field found
- **Impact:** Chart categories now display meaningful values instead of "null"

#### Testing Examples

```bash
# Query 1 - Should show "Jan 2025", "Feb 2025", etc. (NOT 2024)
GET /analytics?aggregate=s:avg(),chart:line(date,month)

# Query 2 - Should show "BF-08414", "BF-08301", etc. (NOT "null")
GET /performance?aggregate=output:sum(),groupBy:(machine.mcCode),chart:bar(machine.mcCode)
```

---

## [2.4.11] - 2025-11-15

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
GET /performance?aggregate=s:avg(),groupBy:(leaders.leaderNik),chart:radar(leaders.leaderNik)
```

**Production by Machine:**
```bash
GET /performance?aggregate=output:sum(),groupBy:(machines.mcCode),chart:bar(machines.mcCode)
```

**See detailed documentation:** [AggregatePipe.md - Many-to-Many Section](./docs/AGGREGATE_PIPE.md#many-to-many-pivot-table-grouping)

---

## [2.4.10] - 2025-11-01

### 🌍 Added - Timezone Configuration Support

Added global timezone configuration for all date operations.

#### Configuration
```typescript
import { configurePipesTimezone } from '@dwcahyo/nestjs-prisma-pipes';

configurePipesTimezone({
  offset: '+07:00',
  name: 'Asia/Jakarta',
});
```

#### Benefits
- Date boundaries align with local business hours
- Time series charts group correctly by local time
- Consistent behavior across all pipes

**See detailed documentation:** [Timezone Configuration](./docs/TIMEZONE.md)

---

## [2.4.6] - 2025-10-15

### 🚀 Added - Manual Aggregation for Nested Relationships

Added automatic support for relationship fields in groupBy.

#### Examples
```bash
GET /products?aggregate=qty:sum(),groupBy:(category.name)
GET /products?aggregate=qty:sum(),groupBy:(warehouse.region,category.name)
```

---

## [2.4.0] - 2025-09-01

### 🎨 Added - Chart Configuration

Added chart type support with 5 chart types: bar, line, pie, area, donut.

---

## [2.3.0] - 2025-08-01

### 🔢 Added - Aggregate Support

Added aggregate functions: sum, avg, min, max, count with groupBy support.

---

## [2.2.0] - 2025-07-01

### 🔗 Added - Include Pipe

Added support for including relations.

---

## [2.1.0] - 2025-06-01

### 📝 Added - Select Pipe

Added support for field selection.

---

## [2.0.0] - 2025-05-01

### 🔄 Added - OrderBy Pipe

Added support for sorting with multiple fields.

---

## [1.0.0] - 2025-04-01

### 🎉 Initial Release

Core filtering features with WherePipe.

---

## Version Summary

| Version | Feature | Description |
|---------|---------|-------------|
| **2.5.0** | 🔒 Security | Query encryption with HMAC |
| **2.4.14** | 🐛 Bug Fixes | Time series & nested display |
| **2.4.11** | 🔗 Many-to-Many | Pivot table aggregation |
| **2.4.10** | 🌍 Timezone | Global timezone config |
| **2.4.6** | 📊 Relationships | Nested field grouping |
| **2.4.0** | 📈 Charts | 5 chart types |
| **2.3.0** | 🔢 Aggregates | sum, avg, min, max, count |
| **2.2.0** | 🔗 Include | Relation loading |
| **2.1.0** | 📋 Select | Field selection |
| **2.0.0** | 🔄 OrderBy | Sorting |
| **1.0.0** | 🔍 WherePipe | Core filtering |

---

**Documentation:**
- [Security Guide](./docs/SECURITY.md)
- [AggregatePipe Documentation](./docs/AGGREGATE_PIPE.md)
- [WherePipe Documentation](./docs/WHERE_PIPE.md)
- [Timezone Configuration](./docs/TIMEZONE.md)