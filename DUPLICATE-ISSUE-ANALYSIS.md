# Duplicate Detection Issue - Category Data Analysis

## The Problem

Your data contains **transactional/category data** where:
- Each row is a unique transaction
- Multiple customers can have the same category (e.g., "Clothing")
- Multiple customers can have the same product (e.g., "T-shirt")
- **This is NOT duplicate data** - it's normal business data

However, **everything is being highlighted as a duplicate**. Let's trace why.

---

## Your Data Structure

```
ID   | Customer Name    | Category      | Product     | Quantity | Price  | Date       | City          | Payment Method
1000 | Jill Hurst       | Clothing      | T-shirt     | 2        | 629.87 | 2024-04-23 | Los Angeles   | Cash
1001 | Erica Jones      | Clothing      | Headphones  | 3        | 551.21 | 2025-04-01 | San Francisco | Debit Card
1002 | Jean Maxwell     | Home & Garden | Smartphone  | 3        | 1330.00| 2025-04-02 | New York      | Credit Card
1003 | Elizabeth Short  | Sports        | Missing     | 2        | 378.91 | 2023-12-26 | Chicago       | Debit Card
1004 | Taylor Perkins   | Toys          | Headphones  | 2        | 109.28 | 2025-04-18 | Houston       | Paypal
1005 | Bradley Chung    | Electronics   | Jeans       | 5        | 1396.73| 2024-10-26 | San Francisco | Paypal
1006 | David Valencia   | Clothing      | Laptop      | 3        | 1064.84| 2024-06-07 | Chi-town      | Debit Card
1007 | Jason Bond       | Toys          | T-shirt     | 5        | 213.13 | 2025-06-04 | San Francisco | Debit Card
1008 | Ryan Moore       | Clothing      | Jeans       | 5        | 1156.75| 2025-04-09 | Houston       | Cash
```

**Key Observation**: 
- "Clothing" appears 4 times (rows 1000, 1001, 1006, 1008)
- "Toys" appears 2 times (rows 1004, 1007)
- "San Francisco" appears 3 times (rows 1001, 1005, 1007)
- **But these are NOT duplicates** - they're different transactions

---

## Root Cause Analysis

### Step 1: Column Detection

The duplicate detection looks for **key columns**:

```typescript
const keyCols = columns.filter((c) => {
  const lo = c.toLowerCase();
  return (
    lo.includes("email") ||
    lo.includes("phone") ||
    (lo.includes("name") && !lo.includes("last"))
  );
});
```

**Your columns**:
- ✅ **"Customer Name"** → Contains "name" → **Detected as key column**
- ❌ "Category" → Not detected
- ❌ "Product" → Not detected
- ❌ "City" → Not detected

**Result**: Only "Customer Name" is treated as a key column.

---

### Step 2: Exact Duplicate Check

```typescript
const finger = columns
  .map((c) => String(row[c] || "").trim().toLowerCase())
  .join("|");
```

**Example fingerprints**:
```
Row 1000: "1000|jill hurst|clothing|t-shirt|2|629.87|2024-04-23|los angeles|cash|0"
Row 1001: "1001|erica jones|clothing|headphones|3|551.21|2025-04-01|san francisco|debit card|0"
```

**Result**: ❌ No exact duplicates (every row has unique ID, customer, etc.)

---

### Step 3: Partial Duplicate Check (THE PROBLEM)

For each key column ("Customer Name"), the code checks if multiple rows share the same value:

```typescript
keyCols.forEach((keyCol) => {
  const keyMap = new Map<string, number[]>();
  rows.forEach((row, idx) => {
    const val = String(row[keyCol] || "").trim().toLowerCase();
    if (!val || val.length < 3) return;
    
    if (!keyMap.has(val)) keyMap.set(val, []);
    keyMap.get(val)!.push(idx);
  });
  
  keyMap.forEach((indices) => {
    if (indices.length > 1) {
      groups.push(indices);  // ← DUPLICATE GROUP CREATED
    }
  });
});
```

**Your data - Customer Name values**:
```
"jill hurst"       → [1000]           ← Only 1 occurrence, NOT a duplicate
"erica jones"      → [1001]           ← Only 1 occurrence, NOT a duplicate
"jean maxwell"     → [1002]           ← Only 1 occurrence, NOT a duplicate
"elizabeth short"  → [1003]           ← Only 1 occurrence, NOT a duplicate
...
```

**Expected Result**: ❌ No partial duplicates (each customer appears only once)

---

## Why Everything is Highlighted

### Theory 1: You Have Actual Duplicates

If your data has rows where the **same customer** appears multiple times:

```
Row 1000: Jill Hurst | Clothing | T-shirt
Row 1050: Jill Hurst | Electronics | Laptop  ← Same customer, different purchase
```

**Result**: Both rows would be flagged as partial duplicates (same "Customer Name").

**This is CORRECT behavior for customer deduplication**, but **WRONG for transaction data**.

---

### Theory 2: Display Bug - All Rows Marked

Looking at the issue creation code:

```typescript
duplicateGroups.forEach((group) => {
  group.forEach((idx, i) => {
    issues.push({
      rowId: idx,
      column: columns[0],
      issueType: "DUPLICATE",
      suggestion: i === 0 ? "Original" : "Duplicate Row",
    });
  });
});
```

**If there's a bug where ALL rows are in one giant group**:
```
duplicateGroups = [[0, 1, 2, 3, 4, 5, 6, 7, 8, ...]]  ← All rows in one group
```

**Result**: Every row would be highlighted as a duplicate.

**Possible causes**:
1. Empty key column values causing all rows to match
2. Bug in the grouping logic
3. All rows actually have the same customer name

---

### Theory 3: Category Column Misidentified

If your "Category" column is somehow being treated as a key column:

```
"clothing" → [1000, 1001, 1006, 1008]  ← 4 rows with "Clothing"
"toys"     → [1004, 1007]              ← 2 rows with "Toys"
```

**Result**: All rows with the same category would be flagged as duplicates.

**But this shouldn't happen** because "Category" doesn't contain "email", "phone", or "name".

---

## What You Should See (Correct Behavior)

### For Transaction Data

**Expected**: ✅ **No duplicates** (unless you have exact duplicate transactions)

Each row is a unique transaction:
- Different customer
- Different date
- Different price
- Different ID

**Only flag as duplicate if**:
- ALL columns match exactly (exact duplicate)
- Same customer + same product + same date + same price (likely data entry error)

---

### For Customer Data

**Expected**: ✅ **Partial duplicates** for same customer

If you have:
```
Row 1: John Doe | john@email.com | 555-1234
Row 2: John Doe | john2@email.com | 555-5678  ← Same name, different contact
```

**Result**: Both flagged as partial duplicates (same "Customer Name").

---

## Debugging Steps

### Step 1: Check Your Actual Data

**Question**: Do you have the same customer appearing multiple times?

**Example**:
```
Row 1000: Jill Hurst | Clothing | T-shirt
Row 1050: Jill Hurst | Electronics | Laptop
```

If YES → This is **correct behavior** (partial duplicate detection working)
If NO → This is a **bug** (shouldn't be flagged)

---

### Step 2: Check Duplicate Groups

Add console logging to see what groups are detected:

```typescript
const duplicateGroups = findDuplicateGroups(rows, columns);
console.log("Duplicate groups:", duplicateGroups);
```

**Expected output for your data** (if no duplicates):
```
Duplicate groups: []  ← Empty array
```

**If you see**:
```
Duplicate groups: [[0, 1, 2, 3, 4, 5, 6, 7, 8]]  ← All rows in one group
```

**Then there's a bug** in the detection logic.

---

### Step 3: Check Key Columns

Add logging to see which columns are detected as key columns:

```typescript
const keyCols = columns.filter((c) => {
  const lo = c.toLowerCase();
  return (
    lo.includes("email") ||
    lo.includes("phone") ||
    (lo.includes("name") && !lo.includes("last"))
  );
});
console.log("Key columns:", keyCols);
```

**Expected output**:
```
Key columns: ["Customer Name"]
```

**If you see**:
```
Key columns: ["Customer Name", "Category", "Product"]
```

**Then the detection logic is wrong** (Category/Product shouldn't be key columns).

---

## The Fix

### Option 1: Disable Partial Duplicate Detection for Transaction Data

**Change**: Only use exact duplicate detection

```typescript
export const findDuplicateGroups = (
  rows: RowData[],
  columns: string[],
  enablePartialMatching: boolean = true  // ← Add flag
): number[][] => {
  const groups: number[][] = [];
  const processedRows = new Set<number>();

  // 1. Exact Duplicates (always enabled)
  const exactMap = new Map<string, number[]>();
  rows.forEach((row, idx) => {
    const finger = columns
      .map((c) => String(row[c] || "").trim().toLowerCase())
      .join("|");
    if (!exactMap.has(finger)) exactMap.set(finger, []);
    exactMap.get(finger)!.push(idx);
  });

  exactMap.forEach((indices) => {
    if (indices.length > 1) {
      groups.push(indices);
      indices.forEach((i) => processedRows.add(i));
    }
  });

  // 2. Partial Duplicates (optional)
  if (enablePartialMatching) {
    // ... existing partial duplicate logic
  }

  return groups;
};
```

**Usage**:
```typescript
// For transaction data
const duplicateGroups = findDuplicateGroups(rows, columns, false);

// For customer data
const duplicateGroups = findDuplicateGroups(rows, columns, true);
```

---

### Option 2: Improve Key Column Detection

**Change**: Be more specific about what constitutes a "name" column

```typescript
const keyCols = columns.filter((c) => {
  const lo = c.toLowerCase();
  
  // Email and phone are always key columns
  if (lo.includes("email") || lo.includes("phone")) return true;
  
  // Only treat as name column if it's specifically a person's name
  if (lo === "name" || 
      lo === "customer name" || 
      lo === "full name" ||
      lo === "contact name") {
    return true;
  }
  
  return false;
});
```

**Result**: "Category", "Product Name", "Company Name" won't be treated as key columns.

---

### Option 3: Add Data Type Detection

**Change**: Detect if data is transactional vs. customer data

```typescript
const isTransactionalData = (columns: string[]): boolean => {
  const transactionalIndicators = [
    "transaction", "order", "purchase", "sale", "invoice",
    "quantity", "qty", "amount", "total", "date", "timestamp"
  ];
  
  const hasTransactionalColumns = columns.some(col => 
    transactionalIndicators.some(indicator => 
      col.toLowerCase().includes(indicator)
    )
  );
  
  return hasTransactionalColumns;
};

// Usage
if (isTransactionalData(columns)) {
  // Only use exact duplicate detection
  return findExactDuplicates(rows, columns);
} else {
  // Use both exact and partial duplicate detection
  return findDuplicateGroups(rows, columns);
}
```

---

## Immediate Workaround

### For Your Current Data

If you want to remove **only exact duplicates**:

1. **Don't use "Remove All Copies"** (it will remove partial duplicates too)
2. **Manually review** the duplicate list
3. **Only delete rows** where ALL columns match exactly

### Check for Exact Duplicates Manually

Look for rows where:
- Same Customer Name
- Same Category
- Same Product
- Same Quantity
- Same Price
- Same Date
- Same City
- Same Payment Method

**If all columns match** → True duplicate (safe to delete)
**If only some columns match** → Not a duplicate (keep both)

---

## Summary

### Current Behavior
- ✅ Exact duplicate detection works correctly
- ⚠️ Partial duplicate detection is designed for **customer data**
- ❌ Partial duplicate detection is **wrong for transaction data**

### Your Data Type
- **Transaction data** (each row is a unique purchase)
- Multiple customers can have the same category/product
- **Should only flag exact duplicates**

### Why Everything is Highlighted
1. **Theory 1**: Same customer appears multiple times (correct behavior)
2. **Theory 2**: Bug causing all rows to be grouped together
3. **Theory 3**: Category column misidentified as key column

### Recommended Fix
- Add a flag to disable partial duplicate detection
- Or improve key column detection to exclude "Category", "Product Name", etc.
- Or add data type detection (transactional vs. customer)

### Next Steps
1. Check if you have the same customer appearing multiple times
2. Add console logging to see what duplicate groups are detected
3. Decide if you want to disable partial duplicate detection for this data type
