# Schema Classification System - Quick Start Guide

## Overview
The Schema Classification System automatically detects CSV data types and applies appropriate duplicate detection. This guide will get you started in 5 minutes.

## Basic Usage

### 1. Automatic Classification (Default)
Upload a CSV file - the system automatically classifies it:

```typescript
// In UploadView.tsx - already integrated!
// Just upload a CSV and it works automatically
```

**What happens:**
- System analyzes your CSV
- Determines data type (Customer/Transaction/Inventory/Time-Series)
- Shows notification with result
- Applies appropriate duplicate detection

### 2. View Classifications
Go to **Settings** tab to see all stored classifications:
- View classification history
- Edit data types
- Delete classifications
- Export data

### 3. Create Custom Rules
Go to **Settings → Custom Rules** to create rules:

**Option A: Use a Template**
1. Click "Use Template"
2. Choose from 9 pre-built templates
3. Done! Rule is active immediately

**Option B: Create from Scratch**
1. Click "Create Rule"
2. Set name and description
3. Choose data type
4. Add conditions
5. Set priority
6. Save

### 4. Batch Process Files
```typescript
import { classifyBatch } from '@/lib/batch-classifier';

const files = [
  { fileName: 'file1.csv', rows: [...], columns: [...] },
  { fileName: 'file2.csv', rows: [...], columns: [...] }
];

const summary = classifyBatch(files, {
  useCustomRules: true,
  autoStore: true
});

console.log(`Processed ${summary.total} files`);
```

## Common Scenarios

### Scenario 1: CRM Contact Lists
**Problem:** Need to classify customer contact data

**Solution:**
1. Go to Custom Rules
2. Click "Use Template"
3. Select "CRM Contacts"
4. Upload your CSV
5. Automatic classification!

### Scenario 2: E-commerce Orders
**Problem:** Need to classify sales order data

**Solution:**
1. Go to Custom Rules
2. Click "Use Template"
3. Select "Sales Orders"
4. Upload your CSV
5. Automatic classification!

### Scenario 3: Custom Industry Data
**Problem:** Have unique data format

**Solution:**
1. Go to Custom Rules
2. Click "Create Rule"
3. Add conditions:
   - Column name contains "patient" → Customer
   - Column count > 5
4. Set high priority (90+)
5. Upload your CSV
6. Custom rule matches!

## Rule Conditions Explained

### Column Name Contains
Matches if column name includes text:
```
Column: "customer_email"
Condition: contains "email"
Result: ✅ Match
```

### Column Count
Matches based on number of columns:
```
Columns: 8
Condition: greater than 5
Result: ✅ Match
```

### Row Count
Matches based on number of rows:
```
Rows: 1000
Condition: greater than 100
Result: ✅ Match
```

### Uniqueness Ratio
Matches based on unique values:
```
Column: "id"
Unique: 100/100 = 1.0
Condition: greater than 0.9
Result: ✅ Match
```

## Tips & Tricks

### Tip 1: Use High Priority for Specific Rules
```
Priority 90+ = Evaluated first
Priority 50 = Default
Priority 10- = Evaluated last
```

### Tip 2: Combine Multiple Conditions
```
Rule: Healthcare Records
- Column contains "patient" AND
- Column contains "medical" AND
- Column count > 5
= Very specific match!
```

### Tip 3: Export Rules for Backup
```
1. Go to Custom Rules
2. Click "Export"
3. Save JSON file
4. Import on other machines
```

### Tip 4: Check Analytics
```
1. Go to Analytics tab
2. View classification trends
3. See which rules match most
4. Optimize your rules
```

## Troubleshooting

### Problem: Low Confidence Classification
**Solution:** Create a custom rule with specific conditions

### Problem: Wrong Data Type Detected
**Solution:** 
1. Edit classification in Settings
2. Or create custom rule for future uploads

### Problem: Custom Rule Not Matching
**Solution:**
1. Check rule is enabled
2. Verify conditions match your data
3. Check priority (higher = first)

### Problem: Batch Processing Slow
**Solution:** Reduce batch size in options:
```typescript
classifyBatchAsync(files, options, 5) // Smaller batches
```

## API Quick Reference

### Classification
```typescript
import { classifySchema } from '@/lib/schema-classifier';

const result = classifySchema(rows, columns, true); // true = use custom rules
```

### Custom Rules
```typescript
import { createRule, RuleConditionType, RuleOperator } from '@/lib/custom-rules';
import { DataType } from '@/lib/schema-classifier';

const rule = createRule(
  'My Rule',
  'Description',
  DataType.CUSTOMER,
  [
    {
      type: RuleConditionType.COLUMN_NAME_CONTAINS,
      operator: RuleOperator.CONTAINS,
      value: 'email'
    }
  ],
  50 // priority
);
```

### Batch Processing
```typescript
import { classifyBatch } from '@/lib/batch-classifier';

const summary = classifyBatch(files, {
  useCustomRules: true,
  autoStore: true,
  minConfidence: 70,
  trackAnalytics: true
});
```

## Data Types Explained

### Customer / Contact
**Characteristics:**
- High uniqueness in name/email/phone
- Personal information columns
- Contact details

**Detection Mode:** Aggressive (partial matching)

**Examples:**
- CRM contacts
- Customer lists
- User databases

### Transaction / Event
**Characteristics:**
- Transaction IDs (unique)
- Dates/timestamps
- Amounts/quantities
- Low uniqueness in customer/category

**Detection Mode:** Conservative (exact matching)

**Examples:**
- Sales orders
- Purchase history
- Event logs

### Inventory / Catalog
**Characteristics:**
- SKUs/Product IDs (unique)
- Product names
- Prices
- Low uniqueness in categories

**Detection Mode:** Conservative (exact matching)

**Examples:**
- Product catalogs
- Inventory lists
- Item databases

### Time-Series / Metrics
**Characteristics:**
- Timestamps (high uniqueness)
- Metric values
- Sensor readings
- Low uniqueness in metric names

**Detection Mode:** Very Conservative (timestamp + metric matching)

**Examples:**
- Server logs
- IoT sensor data
- Performance metrics

## Best Practices

### 1. Start with Templates
Use pre-built templates before creating custom rules

### 2. Test Your Rules
Upload sample data to verify rules work correctly

### 3. Use Descriptive Names
Name rules clearly: "Healthcare Patient Records" not "Rule 1"

### 4. Set Appropriate Priorities
- 90+: Very specific rules
- 50: General rules
- 10-: Fallback rules

### 5. Regular Maintenance
- Review analytics monthly
- Update rules based on usage
- Delete unused rules

### 6. Export Regularly
Backup your rules monthly

### 7. Document Custom Rules
Add clear descriptions for team members

## Support

### Documentation
- `SCHEMA-CLASSIFICATION-COMPLETE.md` - Full documentation
- `PHASE-9-SUMMARY.md` - Advanced features
- Inline code comments

### Testing
```bash
npm test                    # Run all tests
npm test custom-rules      # Test custom rules
npm test batch-classifier  # Test batch processing
```

### Type Checking
```bash
npx tsc --noEmit           # Check for TypeScript errors
```

## Next Steps

1. ✅ Upload your first CSV
2. ✅ Check the classification result
3. ✅ Create a custom rule
4. ✅ Try batch processing
5. ✅ View analytics

**You're ready to go! 🚀**

---

*For detailed documentation, see SCHEMA-CLASSIFICATION-COMPLETE.md*
