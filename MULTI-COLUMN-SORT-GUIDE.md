# Multi-Column Sorting - User Guide

## Overview

You can now sort by **multiple columns** simultaneously! This allows you to organize your data with primary, secondary, and tertiary sort orders.

## How to Use

### Single-Column Sort (Default)

**Click a column header** to sort by that column:

1. **First click** → Sort Ascending (A→Z, 0→9, oldest→newest)
2. **Second click** → Sort Descending (Z→A, 9→0, newest→oldest)
3. **Third click** → Clear sort (restore original CSV order)

**Visual Indicator**:
- ↑ = Ascending
- ↓ = Descending
- No arrow = Not sorted

---

### Multi-Column Sort (New!)

**Hold Shift + Click** column headers to add multiple sort levels:

#### Example: Sort by Customer Name, then Category

1. **Click "Customer Name"** → Primary sort (①)
2. **Shift+Click "Category"** → Secondary sort (②)
3. **Shift+Click "Date"** → Tertiary sort (③)

**Result**: Data is grouped by Customer Name, then sorted by Category within each customer, then by Date within each category.

**Visual Indicators**:
- **Numbers** (① ② ③) = Sort order
- **Arrows** (↑ ↓) = Direction
- **Blue color** = Active sort

---

## Examples

### Example 1: Customer Analysis

**Goal**: Group customers, then sort by purchase date

**Steps**:
1. Click "Customer Name" → ① ↑
2. Shift+Click "Date" → ② ↑

**Result**:
```
Customer Name ① ↑    Date ② ↑         Product
Alice                2024-01-15       Shirt
Alice                2024-03-20       Shoes
Bob                  2024-02-10       Laptop
Bob                  2024-04-05       Mouse
```

---

### Example 2: Category & Price Analysis

**Goal**: Group by category, then sort by price (highest first)

**Steps**:
1. Click "Category" → ① ↑
2. Shift+Click "Price" → ② ↑
3. Click "Price" again → ② ↓ (toggle to descending)

**Result**:
```
Category ① ↑    Price ② ↓    Product
Clothing        $129.99      Jacket
Clothing        $49.99       Shirt
Electronics     $999.99      Laptop
Electronics     $29.99       Mouse
```

---

### Example 3: Complex Multi-Level Sort

**Goal**: Sort by City, then Category, then Customer Name

**Steps**:
1. Click "City" → ① ↑
2. Shift+Click "Category" → ② ↑
3. Shift+Click "Customer Name" → ③ ↑

**Result**:
```
City ① ↑        Category ② ↑    Customer Name ③ ↑
Chicago         Clothing        Alice
Chicago         Clothing        Bob
Chicago         Sports          Charlie
New York        Clothing        David
New York        Electronics     Eve
```

---

## Modifying Multi-Column Sorts

### Add a Column
**Shift+Click** any unsorted column header

### Change Direction
**Shift+Click** an already-sorted column to toggle: asc → desc → remove

### Remove a Column
**Shift+Click** a sorted column twice (asc → desc → removed)

### Start Over (Single-Column)
**Click** (without Shift) any column to clear all sorts and start fresh

---

## Type-Aware Sorting

The sorting engine automatically detects data types:

### 1. Currency/Numbers
Strips symbols and sorts numerically:
```
$99.99
$1,234.56
$5,000.00
```
Sorts as: `$99.99 < $1,234.56 < $5,000.00` ✅

### 2. Dates
Parses dates and sorts chronologically:
```
2024-01-15
2024-10-23
2023-12-01
```
Sorts as: `2023-12-01 < 2024-01-15 < 2024-10-23` ✅

### 3. Text
Case-insensitive, natural ordering:
```
Item 2
Item 10
Item 100
```
Sorts as: `Item 2 < Item 10 < Item 100` ✅ (not `Item 10 < Item 100 < Item 2`)

---

## Tips & Tricks

### Tip 1: Start with the Most Important Column
Click your primary sort column first, then Shift+Click secondary columns.

### Tip 2: Use Descending for "Top N" Analysis
- Sort by "Revenue" descending to see highest earners first
- Sort by "Date" descending to see most recent first

### Tip 3: Combine with Filters
- Use multi-column sort to organize data
- Then use "Ask Wozny" to filter specific groups

### Tip 4: Restore Original Order
Click the sorted column 3 times (asc → desc → off) to restore CSV order.

---

## Visual Reference

### Single-Column Sort
```
Customer Name ↑    Category    Product
```
Only Customer Name is sorted.

### Multi-Column Sort
```
Customer Name ① ↑    Category ② ↑    Product
```
Sorted by Customer Name first, then Category within each customer.

### Three-Level Sort
```
City ① ↑    Category ② ↑    Customer Name ③ ↑
```
Sorted by City, then Category within each city, then Customer Name within each category.

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Single-column sort | **Click** column header |
| Add to multi-sort | **Shift+Click** column header |
| Toggle direction | **Click** or **Shift+Click** again |
| Remove sort | Click/Shift+Click until removed |
| Clear all sorts | **Click** (no Shift) any column |

---

## Technical Details

### Sort Stability
- Equal values maintain their original order
- Multi-column sorts are stable across all levels

### Performance
- Optimized for large datasets
- Only visible rows are rendered (virtualization)
- Sorting happens instantly

### Missing Values
- Missing values always sort to the end
- Applies to all sort levels

---

## Troubleshooting

### Q: I Shift+Clicked but it replaced my sort instead of adding to it
**A**: Make sure you're holding Shift **before** clicking. Try again.

### Q: How do I remove a column from the middle of the sort chain?
**A**: Shift+Click that column twice to cycle through: asc → desc → removed

### Q: Can I reorder the sort priority?
**A**: Not directly. Clear all sorts (click without Shift) and rebuild in the desired order.

### Q: The sort order numbers disappeared
**A**: Numbers only show when you have 2+ columns sorted. Single-column sorts show only the arrow.

---

## Summary

✅ **Single-column**: Click to sort one column  
✅ **Multi-column**: Shift+Click to add sort levels  
✅ **Type-aware**: Handles currency, dates, and text intelligently  
✅ **Visual feedback**: Numbers (① ② ③) and arrows (↑ ↓)  
✅ **Flexible**: Add, remove, or reorder sorts easily  

**Try it now**: Click "Customer Name", then Shift+Click "Category"!
