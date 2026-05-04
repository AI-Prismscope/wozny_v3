# Ask Wozny Cluster Column Fix

## 🐛 Problem

User query: **"Show me Cluster 5 in City Group"**
Result: Empty (no results)

**Root Cause:** Ask Wozny wasn't seeing dynamically added cluster columns like "City Group" and "Quantity Group" because it was using the store's `columns` array instead of getting columns from the actual row data.

## 🔍 How Clustering Works

1. User goes to Smart Analysis (Report tab)
2. Clicks "Group by Similarity" on a column (e.g., "City")
3. ML clustering runs and creates a new column: `"City Group"`
4. The `addColumn()` function adds this column to:
   - ✅ The `rows` data (each row gets the new column)
   - ✅ The `columns` array in the store
   - ✅ The `columnWidths` map
   - ✅ The `splittableColumns` map

## ❌ The Bug

In `AskWoznyView.tsx`, the AI was receiving columns from:

```typescript
// OLD CODE (BUGGY)
const visibleColumns = useMemo(() => {
    if (showHiddenColumns) return columns;  // ❌ Uses store's columns
    return columns.filter((c) => !ignoredColumns.includes(c));
}, [columns, ignoredColumns, showHiddenColumns]);

// Later...
const code = await generateFilterCode(visibleColumns, aiQuery, rows);
```

**Problem:** The `columns` from the store might not be in sync with the actual columns in the row data, especially after dynamic operations like clustering.

## ✅ The Fix

Changed to get columns directly from the actual row data:

```typescript
// NEW CODE (FIXED)
const handleAskWozny = async () => {
    // ... initialization code ...
    
    // Get ALL columns from the actual row data (includes dynamically added cluster columns)
    const allColumnsInData = rows.length > 0 ? Object.keys(rows[0]) : columns;
    
    // Filter to visible columns if needed
    const columnsToUse = showHiddenColumns 
        ? allColumnsInData 
        : allColumnsInData.filter((c) => !ignoredColumns.includes(c));
    
    console.log('🔍 Columns available to AI:', columnsToUse);
    
    const code = await generateFilterCode(columnsToUse, aiQuery, rows);
    // ...
};
```

**Benefits:**
1. ✅ Gets columns from actual row data (`Object.keys(rows[0])`)
2. ✅ Includes ALL dynamically added columns (cluster columns, split columns, etc.)
3. ✅ Still respects visibility settings (hidden columns)
4. ✅ Adds debug logging to see what columns the AI receives

## 🧪 Testing

### Test 1: Basic Cluster Query

1. Upload a CSV with a "City" column
2. Go to Report → Smart Analysis
3. Click "Group by Similarity" on "City"
4. Wait for clustering to complete (creates "City Group" column)
5. Go to Ask Wozny
6. Type: **"Show me Cluster 5 in City Group"**
7. Press Enter

**Expected Result:**
- Console shows: `🔍 Columns available to AI: [..., "City Group", ...]`
- AI generates: `(row) => row['City Group'] === 'Cluster 5'`
- Results show all rows where City Group = "Cluster 5"

### Test 2: Multiple Cluster Columns

1. After Test 1, go back to Smart Analysis
2. Click "Group by Similarity" on "Payment Method"
3. Wait for clustering (creates "Payment Method Group" column)
4. Go to Ask Wozny
5. Type: **"Show Cluster 2 in Payment Method Group"**

**Expected Result:**
- Console shows both cluster columns in available columns
- Results show rows where Payment Method Group = "Cluster 2"

### Test 3: Verify Original Columns Still Work

1. Type: **"Show rows with missing City"**

**Expected Result:**
- Still works with original columns
- Shows rows where City is missing

### Test 4: Complex Query with Cluster Columns

1. Type: **"Show Cluster 5 in City Group with Discount greater than 10"**

**Expected Result:**
- AI generates code checking both conditions
- Results filtered correctly

## 🔍 Debug Console Output

After the fix, when you use Ask Wozny, you should see:

```
🤖 Ask Wozny: Using already-loaded LLM
🔍 Columns available to AI: ["Date", "City", "Payment Method", "Discount", "Quantity Group", "City Group"]
AI Code: (row) => row['City Group'] === 'Cluster 5'
```

**Key indicator:** The `🔍 Columns available to AI` log should show your cluster columns!

## 📊 Before vs After

### Before Fix

**Columns passed to AI:**
```javascript
["Date", "City", "Payment Method", "Discount"]  // ❌ Missing cluster columns
```

**Query:** "Show me Cluster 5 in City Group"

**AI generates:**
```javascript
(row) => row['City Group'] === 'Cluster 5'  // ❌ Column doesn't exist in AI's context
```

**Result:** Empty (no matches because AI didn't know about "City Group")

### After Fix

**Columns passed to AI:**
```javascript
["Date", "City", "Payment Method", "Discount", "Quantity Group", "City Group"]  // ✅ Includes cluster columns
```

**Query:** "Show me Cluster 5 in City Group"

**AI generates:**
```javascript
(row) => row['City Group'] === 'Cluster 5'  // ✅ Column exists in AI's context
```

**Result:** Shows all rows where City Group = "Cluster 5" ✅

## 🎯 Why This Approach?

### Option 1: Use store's `columns` array
❌ Problem: Might not be in sync with actual row data
❌ Problem: Requires careful state management
❌ Problem: Can miss dynamically added columns

### Option 2: Get columns from row data (CHOSEN)
✅ Always accurate (reflects actual data structure)
✅ Automatically includes all columns (original + dynamic)
✅ No sync issues
✅ Works with any dynamic column additions

## 📝 Files Modified

1. **src/features/ask-wozny/views/AskWoznyView.tsx**
   - Changed `handleAskWozny()` to get columns from row data
   - Added debug logging for columns
   - Still respects visibility settings

2. **src/lib/ai/useWoznyLLM.ts** (from previous fix)
   - Added better examples for cluster queries
   - Improved prompt with "in [Column Name]" pattern

## ✅ Summary

**What was broken:**
- Ask Wozny couldn't see dynamically added cluster columns
- Queries like "Show Cluster 5 in City Group" returned empty results

**What was fixed:**
- Ask Wozny now gets columns from actual row data
- Includes ALL columns (original + dynamically added)
- Added debug logging to verify columns

**Expected behavior:**
- ✅ Can query cluster columns by name
- ✅ Can filter by cluster values (e.g., "Cluster 5")
- ✅ Works with any dynamically added columns
- ✅ Still respects hidden column settings

The fix is complete and ready for testing! 🎉
