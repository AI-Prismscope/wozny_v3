# Duplicate Removal - How "Remove All Copies" Works

## Overview

The **"Remove All Copies"** button in the Duplicates panel intelligently detects and removes duplicate rows from your data, keeping only the **first occurrence** of each duplicate group.

## Where to Find It

1. Go to **Workshop** tab
2. Click **Duplicates** filter in the sidebar
3. Click **✨ Remove All Copies** button at the top

---

## How Duplicate Detection Works

### Two-Tier Detection System

**File**: `src/lib/data-quality.ts` → `findDuplicateGroups()`

The system uses a **two-tier approach** to find duplicates:

#### Tier 1: Exact Duplicates (100% Match)

Compares **all columns** across rows:

```typescript
// Creates a fingerprint by joining all column values
const finger = columns
  .map((c) => String(row[c] || "").trim().toLowerCase())
  .join("|");
```

**Example**:
```
Row 1: John Doe | john@email.com | 555-1234 | New York
Row 2: John Doe | john@email.com | 555-1234 | New York
```
**Result**: ✅ Exact duplicate (all columns match)

**Matching Logic**:
- Case-insensitive (`toLowerCase()`)
- Whitespace trimmed
- All columns must match

---

#### Tier 2: Partial Duplicates (Key Column Match)

Compares **key columns** only:

**Key Columns Detected**:
- Columns containing `"email"`
- Columns containing `"phone"`
- Columns containing `"name"` (but NOT `"last name"`)

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

**Example 1: Same Email**
```
Row 1: John Doe    | john@email.com | 555-1234 | New York
Row 2: John Smith  | john@email.com | 555-9999 | Chicago
```
**Result**: ✅ Partial duplicate (same email)

**Example 2: Same Phone**
```
Row 1: Alice Brown | alice@email.com | 555-1234 | Boston
Row 2: Alice Jones | alice2@email.com | 555-1234 | Boston
```
**Result**: ✅ Partial duplicate (same phone)

**Example 3: Same Name**
```
Row 1: Bob Wilson | bob@email.com | 555-1111 | Seattle
Row 2: Bob Wilson | bob2@email.com | 555-2222 | Portland
```
**Result**: ✅ Partial duplicate (same name)

---

### Duplicate Groups

The system organizes duplicates into **groups**:

```typescript
// Example output from findDuplicateGroups()
[
  [0, 5, 12],    // Rows 0, 5, 12 are duplicates
  [3, 8],        // Rows 3, 8 are duplicates
  [10, 15, 20]   // Rows 10, 15, 20 are duplicates
]
```

Each group contains the **row indices** of all duplicates.

---

## How Removal Works

### The Algorithm

**File**: `src/lib/store/useWoznyStore.ts` → `resolveDuplicates()`

```typescript
resolveDuplicates: () => {
  const rowsToDelete = new Set<number>();
  const duplicateGroups = findDuplicateGroups(state.rows, state.columns);

  duplicateGroups.forEach((group) => {
    // Keep the FIRST row (index 0), delete the rest
    for (let i = 1; i < group.length; i++) {
      rowsToDelete.add(group[i]);
    }
  });

  // Filter out all rows marked for deletion
  state.rows = state.rows.filter((_, idx) => !rowsToDelete.has(idx));
}
```

### Step-by-Step Process

#### Step 1: Detect Duplicate Groups
```javascript
const duplicateGroups = findDuplicateGroups(rows, columns);
// Result: [[0, 5, 12], [3, 8], [10, 15, 20]]
```

#### Step 2: Mark Copies for Deletion
```javascript
// For group [0, 5, 12]:
//   Keep row 0 (original)
//   Delete rows 5, 12 (copies)

// For group [3, 8]:
//   Keep row 3 (original)
//   Delete row 8 (copy)

// For group [10, 15, 20]:
//   Keep row 10 (original)
//   Delete rows 15, 20 (copies)

rowsToDelete = Set([5, 8, 12, 15, 20])
```

#### Step 3: Remove Marked Rows
```javascript
state.rows = state.rows.filter((_, idx) => !rowsToDelete.has(idx));
```

---

## Which Row is Kept?

### The "Original" Rule

**The FIRST occurrence in each duplicate group is kept.**

This is determined by:
1. **CSV order** (the row that appeared first in your uploaded file)
2. **Current sort order** (if you've sorted the data)

### Example

**Original CSV**:
```
Row 0: John Doe | john@email.com | 555-1234
Row 5: John Doe | john@email.com | 555-1234  ← Duplicate
Row 12: John Doe | john@email.com | 555-1234 ← Duplicate
```

**After "Remove All Copies"**:
```
Row 0: John Doe | john@email.com | 555-1234  ✅ Kept (first occurrence)
```
Rows 5 and 12 are deleted.

---

## Important Behaviors

### 1. **Keeps First, Deletes Rest**

In each duplicate group:
- **Row at index 0** → ✅ Kept (original)
- **All other rows** → ❌ Deleted (copies)

### 2. **Respects Current Sort Order**

If you've sorted your data before clicking "Remove All Copies":
- The **first row in the sorted order** is kept
- This might not be the first row from the original CSV

**Example**:
```
Original CSV order:
Row 5: John Doe (added 2024-03-01)
Row 2: John Doe (added 2024-01-15)  ← Earlier date

After sorting by Date (ascending):
Row 2: John Doe (2024-01-15)  ← Now first
Row 5: John Doe (2024-03-01)

After "Remove All Copies":
Row 2: John Doe (2024-01-15)  ✅ Kept (first in sorted order)
```

### 3. **Processes All Tiers**

Both exact and partial duplicates are removed in a single operation.

### 4. **Prevents Double-Counting**

```typescript
const processedRows = new Set<number>();
// Ensures a row isn't counted in multiple duplicate groups
```

If a row matches multiple criteria (e.g., same email AND same phone), it's only processed once.

---

## Visual Indicators

### Before Removal

In the **Duplicates** panel, duplicate rows are highlighted:

- **Blue background** = Duplicate row
- **"Original"** label = First occurrence (will be kept)
- **"Duplicate Row"** label = Copy (will be deleted)

### After Removal

- Duplicate count drops to 0
- Only original rows remain
- Blue highlighting disappears

---

## Examples

### Example 1: Exact Duplicates

**Before**:
```
ID | Customer Name | Email           | Phone
1  | Alice Brown   | alice@email.com | 555-1234
2  | Bob Smith     | bob@email.com   | 555-5678
3  | Alice Brown   | alice@email.com | 555-1234  ← Exact duplicate
4  | Charlie Davis | charlie@email.com | 555-9999
5  | Alice Brown   | alice@email.com | 555-1234  ← Exact duplicate
```

**After "Remove All Copies"**:
```
ID | Customer Name | Email           | Phone
1  | Alice Brown   | alice@email.com | 555-1234  ✅ Kept
2  | Bob Smith     | bob@email.com   | 555-5678
4  | Charlie Davis | charlie@email.com | 555-9999
```
Rows 3 and 5 deleted (copies of row 1).

---

### Example 2: Partial Duplicates (Same Email)

**Before**:
```
ID | Customer Name | Email           | Phone
1  | Alice Brown   | alice@email.com | 555-1234
2  | Alice Smith   | alice@email.com | 555-9999  ← Same email
3  | Bob Jones     | bob@email.com   | 555-5678
```

**After "Remove All Copies"**:
```
ID | Customer Name | Email           | Phone
1  | Alice Brown   | alice@email.com | 555-1234  ✅ Kept
3  | Bob Jones     | bob@email.com   | 555-5678
```
Row 2 deleted (same email as row 1, even though name and phone differ).

---

### Example 3: Partial Duplicates (Same Phone)

**Before**:
```
ID | Customer Name | Email           | Phone
1  | Alice Brown   | alice@email.com | 555-1234
2  | Bob Smith     | bob@email.com   | 555-5678
3  | Charlie Davis | charlie@email.com | 555-1234  ← Same phone
```

**After "Remove All Copies"**:
```
ID | Customer Name | Email           | Phone
1  | Alice Brown   | alice@email.com | 555-1234  ✅ Kept
2  | Bob Smith     | bob@email.com   | 555-5678
```
Row 3 deleted (same phone as row 1).

---

### Example 4: Mixed Duplicates

**Before**:
```
ID | Customer Name | Email           | Phone
1  | Alice Brown   | alice@email.com | 555-1234
2  | Alice Brown   | alice@email.com | 555-1234  ← Exact duplicate
3  | Alice Smith   | alice@email.com | 555-9999  ← Same email
4  | Bob Jones     | bob@email.com   | 555-1234  ← Same phone
5  | Charlie Davis | charlie@email.com | 555-5678
```

**Duplicate Groups Detected**:
- Group 1: [1, 2] (exact match)
- Group 2: [1, 3] (same email) → But row 1 already processed
- Group 3: [1, 4] (same phone) → But row 1 already processed

**After "Remove All Copies"**:
```
ID | Customer Name | Email           | Phone
1  | Alice Brown   | alice@email.com | 555-1234  ✅ Kept (original)
5  | Charlie Davis | charlie@email.com | 555-5678
```
Rows 2, 3, 4 deleted (all related to row 1).

---

## Edge Cases

### Case 1: No Key Columns

If your data has **no email, phone, or name columns**:
- Only **exact duplicates** are detected
- Partial duplicate detection is skipped

### Case 2: Empty Values

Empty or missing values are handled:
```typescript
if (!val || val.length < 3) return; // Skip empty/short values
```

Rows with empty key columns won't be considered partial duplicates.

### Case 3: Case Sensitivity

All comparisons are **case-insensitive**:
```
"ALICE@EMAIL.COM" === "alice@email.com"  ✅ Match
"John Doe" === "john doe"                ✅ Match
```

### Case 4: Whitespace

Leading/trailing whitespace is ignored:
```
"  Alice  " === "Alice"  ✅ Match
```

---

## Performance

### Efficiency
- **Exact duplicates**: O(n) using hash map
- **Partial duplicates**: O(n × k) where k = number of key columns
- **Removal**: O(n) single pass filter

### Large Datasets
- Handles thousands of rows efficiently
- Uses Set for O(1) lookup during deletion

---

## Undo Capability

⚠️ **Important**: There is **no undo** for "Remove All Copies".

**Recommendation**: 
- Export your data before removing duplicates
- Or reload from the original CSV if needed

---

## Summary

### Detection Logic
1. ✅ **Exact duplicates**: All columns match
2. ✅ **Partial duplicates**: Email, phone, or name matches

### Removal Logic
1. ✅ **Keep first occurrence** in each duplicate group
2. ✅ **Delete all copies** (subsequent occurrences)
3. ✅ **Respects current sort order**

### Key Points
- First row in each group is the "original"
- All other rows in the group are "copies"
- Both exact and partial duplicates are removed
- No undo available

### Files Involved
- **Detection**: `src/lib/data-quality.ts` → `findDuplicateGroups()`
- **Removal**: `src/lib/store/useWoznyStore.ts` → `resolveDuplicates()`
- **UI**: `src/features/workshop/views/WorkshopView.tsx`

**Try it**: Go to Workshop → Duplicates → Click "✨ Remove All Copies"!
