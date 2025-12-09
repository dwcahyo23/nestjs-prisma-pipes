# Field Reference & Timezone Documentation

---

## 🔗 Field-to-Field Comparison (FIELD_REFERENCE.md)

Compare fields within queries using the `field()` syntax with scope support.

### Overview

Field references enable:
- ✅ Same-table field comparison
- ✅ Cross-table comparison with `$parent` scope
- ✅ Root-level comparison with `$root` scope
- ✅ Type-safe field resolution
- ✅ Validation utilities

### Basic Syntax

```
field(fieldName)           # Same table
field($parent.fieldName)   # Parent table (1 level up)
field($root.fieldName)     # Root table (top level)
```

### Setup

```typescript
import { 
  convertWhereClause,
  createFieldRefConverter,
  validateFieldReferences 
} from '@dwcahyo/nestjs-prisma-pipes';

@Injectable()
export class ProductService {
  async findAll(where?: Pipes.Where) {
    // Convert field references
    const resolved = convertWhereClause(where, this.prisma, 'product');
    return this.prisma.product.findMany({ where: resolved });
  }
}
```

### Examples

#### Same Table Comparison

```bash
# Products where quantity < minimum stock
GET /products?filter=qty:lte+field(minStock)

# Orders where shipping cost > product cost
GET /orders?filter=shippingCost:gt+field(productCost)

# Users where balance >= credit limit
GET /users?filter=balance:gte+field(creditLimit)
```

**Service:**
```typescript
const resolved = convertWhereClause(where, this.prisma, 'product');
// Output: { qty: { lte: prisma.product.fields.minStock } }
```

#### Parent Scope Comparison

For many-to-many pivot tables with timestamps:

```bash
# Workorders where user had machine BEFORE workorder date
GET /workorders?filter=mesin.some.userMesin.some.createdAt:lte+field($parent.createdAt)
```

**Explanation:**
- `$parent.createdAt` refers to `workorder.createdAt`
- Ensures `userMesin.createdAt <= workorder.createdAt`
- User only gets workorders for machines they had at the time

**Service:**
```typescript
const resolved = convertWhereClause(where, this.prisma, 'workorder');
// Output:
// {
//   mesin: {
//     some: {
//       userMesin: {
//         some: {
//           createdAt: {
//             lte: prisma.workorder.fields.createdAt
//           }
//         }
//       }
//     }
//   }
// }
```

#### Root Scope Comparison

For deeply nested queries:

```bash
# Order items where price <= order's max budget
GET /orders?filter=items.some.price:lte+field($root.maxBudget)
```

**Explanation:**
- `$root.maxBudget` refers to `order.maxBudget` (top-level)
- Useful when nesting is 3+ levels deep

### API Functions

#### convertWhereClause()

Main function for converting field references:

```typescript
function convertWhereClause(
  whereClause: any,
  prisma: PrismaClient,
  modelName: string,
  options?: {
    debug?: boolean;
    strict?: boolean;
  }
): any
```

**Example:**
```typescript
const resolved = convertWhereClause(
  where,
  this.prisma,
  'product',
  { debug: true } // Enable logging
);
```

#### createFieldRefConverter()

Create reusable converter for better performance:

```typescript
@Injectable()
export class ProductService {
  private convertWhere = createFieldRefConverter(this.prisma, 'product');

  async findAll(where?: Pipes.Where) {
    const resolved = this.convertWhere(where);
    return this.prisma.product.findMany({ where: resolved });
  }
}
```

#### validateFieldReferences()

Validate before executing query:

```typescript
const validation = validateFieldReferences(where, this.prisma, 'product');

if (!validation.valid) {
  throw new BadRequestException(validation.errors);
}

const resolved = convertWhereClause(where, this.prisma, 'product');
```

### Use Case: Many-to-Many Pivot Filter

**Problem:** User gets workorders for machines they didn't have at the time.

**Solution:**

```typescript
// Schema
model Workorder {
  id        String   @id
  createdAt DateTime
  mesin     Mesin[]
}

model Mesin {
  id        String
  userMesin UserMesin[]
}

model UserMesin {
  id        String
  mesinId   String
  userId    String
  createdAt DateTime  // When user got machine
  deletedAt DateTime?
}

// Service
@Injectable()
export class WorkorderService {
  async findByUser(userId: string, where?: Pipes.Where) {
    const baseWhere = {
      mesin: {
        some: {
          userMesin: {
            some: {
              userId,
              createdAt: {
                lte: { _ref: 'createdAt', _isFieldRef: true, _scope: 'parent' }
              },
              deletedAt: null,
            },
          },
        },
      },
    };

    const resolved = convertWhereClause(
      { ...baseWhere, ...where },
      this.prisma,
      'workorder'
    );

    return this.prisma.workorder.findMany({ where: resolved });
  }
}
```

**Query:**
```bash
GET /workorders?userId=user123
```

**Result:** Only workorders where user had the machine before/on workorder date.

### Best Practices

1. **Always convert in service layer**
   ```typescript
   // ✅ Good
   const resolved = convertWhereClause(where, this.prisma, 'product');
   
   // ❌ Bad - Won't work
   return this.prisma.product.findMany({ where });
   ```

2. **Use reusable converters**
   ```typescript
   // ✅ Good - Create once
   private convert = createFieldRefConverter(this.prisma, 'product');
   
   // ❌ Bad - Create every time
   convertWhereClause(where, this.prisma, 'product');
   ```

3. **Validate in production**
   ```typescript
   if (process.env.NODE_ENV === 'production') {
     const validation = validateFieldReferences(where, prisma, 'product');
     if (!validation.valid) {
       throw new BadRequestException(validation.errors);
     }
   }
   ```

---

## Related Documentation

- [📖 WherePipe - Filtering](./WHERE_PIPE.md)
- [📖 AggregatePipe - Aggregations](./AGGREGATE_PIPE.md)
- [📖 Best Practices](./BEST_PRACTICES.md)
- [📖 API Reference](./API.md)

---

[⬅️ Back to Main Documentation](../README.md)