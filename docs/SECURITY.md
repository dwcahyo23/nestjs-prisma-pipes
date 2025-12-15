# 🔒 Security Guide

Complete guide for securing your API queries with HMAC-signed encryption.

---

## 📖 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Backend Configuration](#backend-configuration)
- [Frontend Integration](#frontend-integration)
- [Security Levels](#security-levels)
- [How It Works](#how-it-works)
- [Best Practices](#best-practices)
- [Migration Guide](#migration-guide)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)

---

## Overview

The security feature protects your API queries from tampering using:

- **HMAC-SHA256** signatures for authenticity
- **Timestamp validation** to prevent replay attacks
- **Base64 URL-safe encoding** for transport
- **Optional IP whitelisting** for additional security
- **Automatic encryption/decryption** in all pipes

### Benefits

✅ **Tamper Protection** - Queries cannot be modified in transit  
✅ **Replay Prevention** - Timestamps prevent replay attacks  
✅ **Data Integrity** - HMAC ensures query authenticity  
✅ **Universal Support** - Works on HTTP and HTTPS  
✅ **Minimal Overhead** - ~5-10ms performance impact  
✅ **Backward Compatible** - Existing code works without changes  

---

## Quick Start

### 1. Generate Secret Key

```bash
# Method 1: OpenSSL (Recommended)
openssl rand -base64 48

# Method 2: Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

# Output example:
# YXBjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY3ODkwYWJjZGVm
```

**Requirements:**
- Minimum 32 characters
- Recommended 48-64 characters
- Use cryptographically secure random generation
- Same key on backend and frontend

### 2. Backend Setup

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { configurePipesSecurity } from '@dwcahyo/nestjs-prisma-pipes';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure security
  configurePipesSecurity({
    enabled: true,
    secretKey: process.env.PIPES_SECRET_KEY,
    allowPlaintext: false,
    maxAge: 3600000, // 1 hour
  });

  await app.listen(3000);
}
bootstrap();
```

```env
# .env
PIPES_SECRET_KEY=YXBjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY3ODkwYWJjZGVm
```

### 3. Frontend Setup

```typescript
// Frontend
import { encodeClientPipeQuery } from '@dwcahyo/nestjs-prisma-pipes/frontend';

const secretKey = import.meta.env.VITE_PIPES_SECRET_KEY;

// Encrypt query
const encrypted = await encodeClientPipeQuery(
  'price:gte+int(100)',
  secretKey
);

// Make request
fetch(`/api/products?filter=${encrypted}`);
```

```env
# .env.local
VITE_PIPES_SECRET_KEY=YXBjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY3ODkwYWJjZGVm
```

---

## Backend Configuration

### Basic Configuration

```typescript
import { configurePipesSecurity } from '@dwcahyo/nestjs-prisma-pipes';

configurePipesSecurity({
  enabled: true,
  secretKey: process.env.PIPES_SECRET_KEY,
  allowPlaintext: false,
  maxAge: 3600000,
});
```

### Configuration Options

```typescript
interface PipesSecurityConfig {
  enabled: boolean;           // Enable/disable security
  secretKey: string;          // HMAC secret key (min 32 chars)
  allowPlaintext?: boolean;   // Allow plaintext fallback (default: true)
  maxAge?: number;            // Query expiration in ms (default: 3600000)
  whitelistedIPs?: string[];  // IP whitelist (optional)
}
```

### Configuration Examples

#### Development Mode
```typescript
configurePipesSecurity({
  enabled: false,
  secretKey: '',
  allowPlaintext: true,
});
```

#### Transition Mode
```typescript
configurePipesSecurity({
  enabled: true,
  secretKey: process.env.PIPES_SECRET_KEY,
  allowPlaintext: true, // Accept both encrypted and plaintext
  maxAge: 3600000,
});
```

#### Production Mode
```typescript
configurePipesSecurity({
  enabled: true,
  secretKey: process.env.PIPES_SECRET_KEY,
  allowPlaintext: false, // Only encrypted queries
  maxAge: 1800000, // 30 minutes
  whitelistedIPs: ['192.168.1.100', '192.168.1.101'],
});
```

### Get Current Configuration

```typescript
import { getPipesSecurityConfig } from '@dwcahyo/nestjs-prisma-pipes';

const config = getPipesSecurityConfig();
console.log('Security enabled:', config.enabled);
```

### Reset Configuration

```typescript
import { resetPipesSecurityConfig } from '@dwcahyo/nestjs-prisma-pipes';

// Useful for testing
resetPipesSecurityConfig();
```

---

## Frontend Integration

### Browser Encryption

```typescript
import { encodeClientPipeQuery } from '@dwcahyo/nestjs-prisma-pipes/frontend';

const secretKey = import.meta.env.VITE_PIPES_SECRET_KEY;

// Encrypt single query
const encrypted = await encodeClientPipeQuery(
  'price:gte+int(100)',
  secretKey
);

// Use in fetch
const response = await fetch(`/api/products?filter=${encrypted}`);
```

### URL Builder Utility

```typescript
import { buildSecureUrl } from '@dwcahyo/nestjs-prisma-pipes/frontend';

const url = await buildSecureUrl(
  '/api/products',
  {
    filter: 'price:gte+int(100)',
    sort: '-createdAt',
    fields: 'id,name,price',
  },
  secretKey
);

const response = await fetch(url);
```

### Secure Encoder Helper

```typescript
import { createSecureEncoder } from '@dwcahyo/nestjs-prisma-pipes/frontend';

const encoder = createSecureEncoder(secretKey);

// Encode multiple queries
const encryptedFilter = await encoder.encode('price:gte+int(100)');
const encryptedSort = await encoder.encode('price:desc');

// Build URL
const url = await encoder.buildUrl('/api/products', {
  filter: 'price:gte+int(100)',
  sort: '-price',
});
```

### React Integration

```typescript
import { useSecureQuery } from '@dwcahyo/nestjs-prisma-pipes/frontend';

function ProductList() {
  const { data, loading, error } = useSecureQuery(
    '/api/products',
    {
      filter: 'price:gte+int(100)',
      sort: '-createdAt',
    },
    secretKey
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.data.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  );
}
```

### RTK Query Integration

```typescript
// services/SecureApiService.ts
import { encodeClientPipeQuery } from '@dwcahyo/nestjs-prisma-pipes/frontend';

const SecureApiService = {
  async fetchData(config, paramsConfig) {
    // Encrypt specific params
    if (paramsConfig?.enableEncryption) {
      const encryptParams = paramsConfig.encryptParams || [
        'filter', 'orderBy', 'select', 'include', 'aggregate'
      ];

      for (const [key, value] of Object.entries(config.params)) {
        if (encryptParams.includes(key) && value) {
          const encrypted = await encodeClientPipeQuery(
            String(value),
            paramsConfig.secretKey
          );
          config.params[key] = encrypted;
        }
      }
    }

    return BaseService(config);
  }
};
```

---

## Security Levels

### Level 1: Disabled (Development)

```env
PIPES_SECURITY_ENABLED=false
```

**Characteristics:**
- All queries in plaintext
- No encryption/decryption overhead
- Easy debugging
- **Use for:** Local development only

### Level 2: Enabled with Fallback (Transition)

```env
PIPES_SECURITY_ENABLED=true
PIPES_SECRET_KEY=your-secret-key
PIPES_ALLOW_PLAINTEXT=true
```

**Characteristics:**
- Accepts both encrypted and plaintext
- Logs warnings for plaintext usage
- Zero breaking changes
- **Use for:** Migration period

### Level 3: Strict (Production)

```env
PIPES_SECURITY_ENABLED=true
PIPES_SECRET_KEY=your-secret-key
PIPES_ALLOW_PLAINTEXT=false
PIPES_WHITELISTED_IPS=192.168.1.100,192.168.1.101
```

**Characteristics:**
- Only encrypted queries allowed
- Rejects plaintext with 400 error
- Optional IP whitelist
- **Use for:** Production environment

---

## How It Works

### Encryption Flow

```
1. Frontend: "price:gte+int(100)"
   ↓
2. Encode to Base64 URL-safe
   ↓
3. Generate HMAC-SHA256 signature
   ↓
4. Create payload: { data, signature, timestamp }
   ↓
5. Encode payload to Base64 URL-safe
   ↓
6. Send: "eyJkYXRhIjoiY0..."
```

### Decryption Flow

```
1. Backend receives: "eyJkYXRhIjoiY0..."
   ↓
2. Decode Base64 → get payload
   ↓
3. Extract: data, signature, timestamp
   ↓
4. Validate timestamp (not expired)
   ↓
5. Verify HMAC signature
   ↓
6. Decode data → "price:gte+int(100)"
   ↓
7. Parse with appropriate pipe
```

### Security Checks

```typescript
// 1. Timestamp validation
const age = Date.now() - payload.timestamp;
if (age > maxAge) {
  throw new Error('Query expired');
}

// 2. IP validation (optional)
if (whitelistedIPs.length > 0) {
  if (!whitelistedIPs.includes(clientIp)) {
    throw new Error('IP not whitelisted');
  }
}

// 3. HMAC verification
const expectedSignature = generateHmac(payload.data, secretKey);
if (payload.signature !== expectedSignature) {
  throw new Error('Invalid signature');
}
```

---

## Best Practices

### 1. Secret Key Management

✅ **DO:**
- Use 48-64 character keys
- Generate with cryptographically secure methods
- Store in environment variables
- Rotate keys periodically
- Use different keys for different environments

❌ **DON'T:**
- Hardcode keys in source code
- Use weak/short keys
- Share keys publicly
- Reuse keys across projects

### 2. Expiration Times

```typescript
// Recommended expiration times
configurePipesSecurity({
  maxAge: 900000,   // 15 minutes - API calls
  maxAge: 1800000,  // 30 minutes - User sessions
  maxAge: 3600000,  // 1 hour - Admin dashboards
});
```

### 3. IP Whitelisting

```typescript
// Use for internal APIs
configurePipesSecurity({
  whitelistedIPs: [
    '192.168.1.100',  // Office network
    '10.0.0.50',      // VPN
  ],
});
```

### 4. Error Handling

```typescript
// Backend - provide meaningful errors
try {
  const where = wherePipe.transform(encryptedQuery, metadata);
} catch (error) {
  if (error.message.includes('expired')) {
    throw new BadRequestException('Query expired. Please refresh.');
  }
  if (error.message.includes('signature')) {
    throw new UnauthorizedException('Invalid query signature.');
  }
  throw new BadRequestException('Invalid query format.');
}
```

### 5. Monitoring

```typescript
// Log security events
configurePipesSecurity({
  enabled: true,
  secretKey: process.env.PIPES_SECRET_KEY,
  allowPlaintext: true,
});

// Backend logs:
// ✅ filter query validated and decoded
// ⚠️ Using plaintext filter query (fallback)
// ❌ filter query validation failed: signature invalid
```

---

## Migration Guide

### Step 1: Prepare (Week 1)

```typescript
// Enable with plaintext fallback
configurePipesSecurity({
  enabled: true,
  secretKey: process.env.PIPES_SECRET_KEY,
  allowPlaintext: true, // ✅ Both modes work
});
```

**Tasks:**
- Generate secret key
- Add to environment variables
- Deploy backend changes
- Monitor logs for plaintext usage

### Step 2: Frontend Update (Week 2-3)

```typescript
// Update frontend code gradually
import { encodeClientPipeQuery } from '@dwcahyo/nestjs-prisma-pipes/frontend';

// Before
fetch(`/api/products?filter=price:gte+int(100)`);

// After
const encrypted = await encodeClientPipeQuery('price:gte+int(100)', secretKey);
fetch(`/api/products?filter=${encrypted}`);
```

**Tasks:**
- Update API calls to use encryption
- Test each feature thoroughly
- Deploy frontend changes in stages
- Monitor error rates

### Step 3: Strict Mode (Week 4)

```typescript
// Disable plaintext fallback
configurePipesSecurity({
  enabled: true,
  secretKey: process.env.PIPES_SECRET_KEY,
  allowPlaintext: false, // ❌ Only encrypted
});
```

**Tasks:**
- Verify all clients use encryption
- Enable strict mode
- Monitor for 400 errors
- Rollback plan ready

---

## Troubleshooting

### Issue 1: "Invalid or expired query"

**Cause:** Query timestamp exceeded `maxAge`

**Solution:**
```typescript
// Increase maxAge or generate fresh queries
configurePipesSecurity({
  maxAge: 3600000, // Increase from 30min to 1 hour
});
```

### Issue 2: "IP not whitelisted"

**Cause:** Client IP not in whitelist

**Solution:**
```typescript
// Check actual client IP
console.log('Client IP:', clientIp);

// Add to whitelist
configurePipesSecurity({
  whitelistedIPs: ['192.168.1.100', clientIp],
});
```

### Issue 3: "Invalid HMAC signature"

**Cause:** Frontend and backend use different keys

**Solution:**
```bash
# Verify keys match exactly
echo $PIPES_SECRET_KEY                 # Backend
echo $VITE_PIPES_SECRET_KEY           # Frontend

# Keys must be identical
```

### Issue 4: Case sensitivity lost

**Cause:** Encoding bug (fixed in v2.5.0)

**Solution:**
```bash
# Update to latest version
npm install @dwcahyo/nestjs-prisma-pipes@latest
```

### Issue 5: Unicode characters corrupted

**Cause:** Incorrect UTF-8 handling

**Solution:**
```typescript
// Use proper encoding (included in v2.5.0)
import { encodeClientPipeQuery } from '@dwcahyo/nestjs-prisma-pipes/frontend';

// Automatically handles Unicode
const encrypted = await encodeClientPipeQuery('名前:contains+田中', secretKey);
```

---

## API Reference

### Backend APIs

#### configurePipesSecurity

```typescript
function configurePipesSecurity(config: PipesSecurityConfig): void;

interface PipesSecurityConfig {
  enabled: boolean;
  secretKey: string;
  allowPlaintext?: boolean;
  maxAge?: number;
  whitelistedIPs?: string[];
}
```

#### getPipesSecurityConfig

```typescript
function getPipesSecurityConfig(): Readonly<PipesSecurityConfig>;
```

#### resetPipesSecurityConfig

```typescript
function resetPipesSecurityConfig(): void;
```

#### ClientIp Decorator

```typescript
import { ClientIp } from '@dwcahyo/nestjs-prisma-pipes';

@Get()
async findAll(
  @Query('filter', WherePipe) where?: Pipes.Where,
  @ClientIp() clientIp?: string,
) {
  // Use clientIp for validation
}
```

### Frontend APIs

#### encodeClientPipeQuery

```typescript
function encodeClientPipeQuery(
  query: string,
  secretKey: string
): Promise<string>;
```

#### buildSecureUrl

```typescript
function buildSecureUrl(
  baseUrl: string,
  params: Record<string, string | undefined>,
  secretKey: string
): Promise<string>;
```

#### createSecureEncoder

```typescript
function createSecureEncoder(secretKey: string): {
  encode: (query: string) => Promise<string>;
  buildUrl: (baseUrl: string, params: Record<string, string | undefined>) => Promise<string>;
};
```

#### useSecureQuery (React Hook)

```typescript
function useSecureQuery<T>(
  endpoint: string,
  params: Record<string, string | undefined>,
  secretKey: string,
  options?: RequestInit & { retries?: number }
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
};
```

---

## Performance

### Benchmarks

```
Operation                Time
─────────────────────────────────
Encode (browser)        ~5ms
Decode (backend)        ~3ms
HMAC generation         ~2ms
Total overhead          ~10ms
```

### Optimization Tips

1. **Cache encrypted queries** if queries are repeated
2. **Batch requests** when possible
3. **Use shorter maxAge** to reduce payload size
4. **Monitor encryption overhead** in production

---

## Security Considerations

### What This Protects Against

✅ Query tampering  
✅ Replay attacks (with timestamp)  
✅ Man-in-the-middle modifications  
✅ Unauthorized access (with IP whitelist)  

### What This Does NOT Protect Against

❌ SSL/TLS attacks (use HTTPS)  
❌ XSS attacks (sanitize inputs)  
❌ CSRF attacks (use CSRF tokens)  
❌ DoS attacks (use rate limiting)  

### Complementary Security

```typescript
// Use with other security measures
app.use(helmet());
app.use(csrf());
app.useGlobalGuards(new ThrottlerGuard());
```

---

## Related Documentation

- [API Reference](./API.md)
- [Testing Guide](./TESTING.md)
- [Best Practices](./BEST_PRACTICES.md)
- [Changelog](../CHANGELOG.md)

---

**Need Help?** [Open an issue](https://github.com/dwcahyo/nestjs-prisma-pipes/issues)