# Sorting Implementation - Current & Enhanced

## Current Implementation (Single-Column Sort)

### How It Works Now

**File**: `src/lib/services/sorting.ts`

The current sorting system supports **single-column sorting** with a 3-state toggle:

1. **Click once** → Sort Ascending (A→Z, 0→9, oldest→newest)
2. **Click twice** → Sort Descending (Z→A, 9→0, newest→oldest)
3. **Click third time** → Sort Off (restore original CSV order)

### State Management

**File**: `src/lib/store/useWoznyStore.ts`

```typescript
sortConfig: { columnId: string; direction: 'asc' | 'desc' } | null;
```

- Stores **one column** and **one direction**
- `null` means "no sort" (original order)

### Sorting Logic

The `sortRows()` function handles **type-aware sorting**:

#### 1. **Currency/Numeric Sorting**
```typescript
// Strips symbols: $1,000.50 → 1000.50
const cleanA = valA.replace(/[$,€£\s,]/g, '');
const numA = parseFloat(cleanA);
```

**Example**:
```
$1,234.56
$99.99
$5,000.00
```
Sorts correctly as: `$99.99 < $1,234.56 < $5,000.00`

#### 2. **Date Sorting**
```typescript
const dateA = Date.parse(valA);
const dateB = Date.parse(valB);
```

**Example**:
```
2024-01-15
2024-10-23
2023-12-01
```
Sorts chronologically: `2023-12-01 < 2024-01-15 < 2024-10-23`

#### 3. **Text Sorting**
```typescript
valA.localeCompare(valB, undefined, { 
    numeric: true,      // "Item 2" < "Item 10"
    sensitivity: 'base' // Case-insensitive
})
```

**Example**:
```
Apple
banana
Cherry
```
Sorts as: `Apple < banana < Cherry` (case-insensitive)

### Original Order Restoration

Each row has a hidden `__wozny_index` field:

```typescript
state.rows = data.map((row, i) => ({
    ...row,
    __wozny_index: String(i),
}));
```

When `sortConfig` is `null`, rows are sorted by this index to restore CSV order.

### UI Indicators

**File**: `src/shared/DataGrid.tsx`

- **Arrow Up** (↑) = Ascending
- **Arrow Down** (↓) = Descending
- **No arrow** = Not sorted

---

## Limitation: Single-Column Only

### Current Behavior

If you click:
1. **Customer Name** → Sorts by Customer Name
2. **Category** → **Replaces** sort, now sorts by Category only

**Problem**: You can't sort by Customer Name, then by Category within each name group.

---

## Enhanced Implementation: Multi-Column Sort

### Desired Behavior

**Example**: Sort by Customer Name (primary), then Category (secondary)

| Customer Name | Category | Product |
|--------------|----------|---------|
| Alice | Clothing | Shirt |
| Alice | Electronics | Phone |
| Bob | Clothing | Pants |
| Bob | Sports | Ball |

**Result**: Grouped by name, then sorted by category within each group.

### Implementation Plan

#### 1. Update State Structure

**File**: `src/lib/store/useWoznyStore.ts`

**Before** (single column):
```typescript
sortConfig: { columnId: string; direction: 'asc' | 'desc' } | null;
```

**After** (multiple columns):
```typescript
sortConfig: Array<{ columnId: string; direction: 'asc' | 'desc' }>;
```

#### 2. Update Sorting Logic

**File**: `src/lib/services/sorting.ts`

**Before** (single column):
```typescript
export const sortRows = (rows: RowData[], config: SortConfig | null): RowData[]
```

**After** (multiple columns):
```typescript
export const sortRows = (rows: RowData[], configs: SortConfig[]): RowData[]
```

**New Logic**:
```typescript
return [...rows].sort((a, b) => {
    // Try each sort config in order
    for (const config of configs) {
        const result = compareValues(a, b, config);
        if (result !== 0) return result; // Found a difference
    }
    return 0; // All columns equal
});
```

#### 3. Update UI Interaction

**File**: `src/shared/DataGrid.tsx`

**New Behavior**:

- **Click** → Add to sort (or toggle direction)
- **Shift+Click** → Add secondary sort
- **Click sorted column** → Toggle direction (asc → desc → remove)

**Visual Indicators**:
- Show **sort order number**: ① ② ③
- Show **arrow direction**: ↑ ↓

**Example**:
```
Customer Name ① ↑    Category ② ↑    Product
```

#### 4. Update Toggle Logic

**File**: `src/lib/store/useWoznyStore.ts`

**New `toggleSort` function**:
```typescript
toggleSort: (columnId: string, isShiftKey: boolean) => {
    set((state) => {
        const existing = state.sortConfig.find(c => c.columnId === columnId);
        
        if (isShiftKey) {
            // Add secondary sort
            if (existing) {
                // Toggle direction
                existing.direction = existing.direction === 'asc' ? 'desc' : 'asc';
            } else {
                // Add new sort
                state.sortConfig.push({ columnId, direction: 'asc' });
            }
        } else {
            // Replace all sorts (single-column mode)
            if (existing && state.sortConfig.length === 1) {
                // Toggle direction or remove
                if (existing.direction === 'asc') {
                    existing.direction = 'desc';
                } else {
                    state.sortConfig = [];
                }
            } else {
                // New single sort
                state.sortConfig = [{ columnId, direction: 'asc' }];
            }
        }
        
        state.rows = sortRows(state.rows, state.sortConfig);
    });
}
```

---

## User Experience

### Single-Column Mode (Default)

**Click column header**:
1. First click → Sort ascending
2. Second click → Sort descending
3. Third click → Remove sort (original order)

### Multi-Column Mode

**Shift+Click column header**:
- Adds column to sort chain
- Shows sort order: ① ② ③

**Example Workflow**:
1. Click "Customer Name" → Primary sort
2. Shift+Click "Category" → Secondary sort
3. Shift+Click "Date" → Tertiary sort

**Result**: Sorted by Name, then Category within each name, then Date within each category.

---

## Benefits

### 1. **Flexible Sorting**
- Single-column for simple cases
- Multi-column for complex analysis

### 2. **Type-Aware**
- Currency: `$99 < $1,000`
- Dates: `2023-01-01 < 2024-01-01`
- Text: Case-insensitive, natural ordering

### 3. **Stable Restoration**
- Original CSV order preserved
- Can always return to initial state

### 4. **Visual Feedback**
- Sort order numbers (① ② ③)
- Direction arrows (↑ ↓)
- Clear indication of active sorts

---

## Implementation Status

- ✅ **Current**: Single-column sort working
- 🔄 **Next**: Multi-column sort implementation
- 📋 **Files to modify**:
  - `src/lib/services/sorting.ts` (sorting logic)
  - `src/lib/store/useWoznyStore.ts` (state management)
  - `src/shared/DataGrid.tsx` (UI interaction)

---

## Technical Details

### Sort Stability

JavaScript's `Array.sort()` is **stable** (as of ES2019), meaning:
- Equal elements maintain their relative order
- Perfect for multi-column sorting

### Performance

- **Complexity**: O(n log n) per sort
- **Optimization**: Only re-sort when config changes
- **Virtualization**: Only renders visible rows (TanStack Virtual)

### Edge Cases Handled

1. **Missing values**: Sorted to end
2. **Mixed types**: Falls back to string comparison
3. **Empty strings**: Treated as missing
4. **Special characters**: Handled by `localeCompare`

---

## Next Steps

1. Implement multi-column sort logic
2. Update UI to show sort order
3. Add Shift+Click detection
4. Test with real data
5. Update documentation
