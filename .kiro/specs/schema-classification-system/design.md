# Design Document

## Overview

The Schema Classification System is a multi-component feature that automatically analyzes uploaded CSV data to determine its type (Customer, Transaction, Inventory, or Time-Series) and applies appropriate duplicate detection logic. The system uses a hybrid confidence-based approach to balance automation with user control.

**Important:** This is a fully client-side, internal system. No external APIs, no network calls, no API keys required. All classification logic runs locally in the browser using pattern matching and statistical analysis.

## Architecture

### System Boundaries

**What's Internal (Built by Us):**
- ✅ Schema classification logic (pattern matching, scoring)
- ✅ Column name analysis
- ✅ Data pattern analysis (uniqueness ratios, cardinality)
- ✅ Duplicate detection with multiple modes
- ✅ Classification storage (browser localStorage)
- ✅ UI components (notification, dialog)
- ✅ State management (Zustand store)

**What's External (Dependencies):**
- Browser APIs only: localStorage, Set, Map (built into all modern browsers)
- No external API calls
- No cloud services
- No API keys required
- No network requests for classification

**Technology Stack:**
- TypeScript (type safety)
- React (UI components)
- Zustand (state management - already in your project)
- Browser localStorage (persistence)
- Pure JavaScript for classification logic

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Upload Flow                           │
│  (UploadView.tsx → useWoznyStore.setCsvData)                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Schema Classifier                           │
│  • Column Name Analyzer                                      │
│  • Data Pattern Analyzer                                     │
│  • Confidence Calculator                                     │
│  • Classification Decision Engine                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├─── High Confidence (>80%) ───┐
                     │                               │
                     └─── Low Confidence (≤80%) ────┤
                                                     │
                     ┌───────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    UI Components                             │
│  • ClassificationNotification (auto-applied)                 │
│  • ClassificationConfirmDialog (user confirmation)           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Classification Store                            │
│  • Persist decisions to localStorage                         │
│  • Retrieve previous classifications                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            Adaptive Duplicate Detector                       │
│  • Aggressive Mode (Customer)                                │
│  • Conservative Mode (Transaction/Inventory)                 │
│  • Very Conservative Mode (Time-Series)                      │
└─────────────────────────────────────────────────────────────┘
```

## Data Structures

### DataType Enum

```typescript
enum DataType {
  CUSTOMER = 'customer',
  TRANSACTION = 'transaction',
  INVENTORY = 'inventory',
  TIME_SERIES = 'time-series'
}
```

### DuplicateDetectionMode Enum

```typescript
enum DuplicateDetectionMode {
  AGGRESSIVE = 'aggressive',      // Partial matching on key columns
  CONSERVATIVE = 'conservative',  // Exact matching only
  VERY_CONSERVATIVE = 'very-conservative' // Exact matching on timestamp + metric
}
```

### ClassificationResult Interface

```typescript
interface ClassificationResult {
  dataType: DataType;
  confidence: number; // 0-100
  indicators: ColumnIndicator[];
  detectionMode: DuplicateDetectionMode;
  timestamp: number;
  source: 'auto' | 'user-confirmed' | 'stored';
}
```

### ColumnIndicator Interface

```typescript
interface ColumnIndicator {
  columnName: string;
  pattern: string;
  dataType: DataType;
  score: number;
}
```

### StoredClassification Interface

```typescript
interface StoredClassification {
  fileName: string;
  dataType: DataType;
  confidence: number;
  timestamp: number;
  userConfirmed: boolean;
}
```

### ClassificationScore Interface

```typescript
interface ClassificationScore {
  dataType: DataType;
  columnNameScore: number;
  dataPatternScore: number;
  totalScore: number;
  confidence: number;
}
```

## Component Specifications

### 1. Schema Classifier (`src/lib/schema-classifier.ts`)

**Purpose:** Analyzes CSV data and determines the most likely data type using local pattern matching and statistical analysis.

**Note:** This is an internal module - all functions are implemented within your codebase. No external API calls or services are used.

**Public API (5 functions exported for use by other parts of your app):**

```typescript
// Main classification function - analyzes CSV data and returns data type
export function classifySchema(
  rows: Record<string, string>[],
  columns: string[]
): ClassificationResult;

// Retrieves previously stored classification from browser localStorage
export function getStoredClassification(
  fileName: string
): StoredClassification | null;

// Saves classification decision to browser localStorage for future use
export function storeClassification(
  fileName: string,
  result: ClassificationResult,
  userConfirmed: boolean
): void;

// Removes stored classification for a specific file
export function clearStoredClassification(fileName: string): void;

// Removes all stored classifications (reset)
export function clearAllStoredClassifications(): void;
```

**Internal Functions (private helper functions used only within schema-classifier.ts):**

```typescript
// Column name analysis - examines column headers to identify data type
function analyzeColumnNames(columns: string[]): ClassificationScore[];

// Normalizes column names for consistent pattern matching
function normalizeColumnName(name: string): string;

// Checks if a column name matches any pattern in the list
function matchColumnPattern(
  normalizedName: string,
  patterns: string[]
): boolean;

// Data pattern analysis - examines actual data values to identify data type
function analyzeDataPatterns(
  rows: Record<string, string>[],
  columns: string[]
): ClassificationScore[];

// Calculates uniqueness ratio (unique values / total rows) for a column
function calculateUniquenessRatio(
  rows: Record<string, string>[],
  column: string
): number;

// Scoring and decision - combines analysis results to make final classification
function combineScores(
  columnScores: ClassificationScore[],
  patternScores: ClassificationScore[]
): ClassificationScore[];

// Selects the data type with highest score
function selectBestClassification(
  scores: ClassificationScore[]
): ClassificationResult;

// Maps data type to appropriate duplicate detection mode
function mapDataTypeToDetectionMode(
  dataType: DataType
): DuplicateDetectionMode;
```

**Column Pattern Definitions:**

```typescript
const COLUMN_PATTERNS: Record<DataType, string[]> = {
  [DataType.CUSTOMER]: [
    'first_name', 'last_name', 'full_name', 'name',
    'email', 'phone', 'mobile', 'telephone',
    'address', 'street', 'city', 'state', 'zip',
    'contact', 'customer_name'
  ],
  [DataType.TRANSACTION]: [
    'date', 'order_date', 'transaction_date',
    'order_id', 'transaction_id', 'invoice_id', 'receipt_id',
    'quantity', 'qty', 'amount', 'total', 'price',
    'customer_name', 'customer', 'buyer',
    'invoice', 'order', 'sale'
  ],
  [DataType.INVENTORY]: [
    'sku', 'product_id', 'item_id', 'product_code',
    'category', 'product_category', 'type',
    'price', 'cost', 'retail_price',
    'stock', 'quantity', 'inventory', 'on_hand',
    'product_name', 'item_name', 'description'
  ],
  [DataType.TIME_SERIES]: [
    'timestamp', 'datetime', 'date', 'time',
    'metric', 'value', 'measurement', 'reading',
    'sensor', 'device', 'location',
    'temperature', 'pressure', 'humidity'
  ]
};
```

**Scoring Algorithm:**

This is a rule-based, deterministic algorithm that runs entirely in the browser. No machine learning, no external APIs.

1. **Column Name Score (0-50 points per data type):**
   - Each matching column adds points based on pattern strength
   - Strong indicators (email, sku, timestamp): 10 points
   - Medium indicators (name, category, date): 5 points
   - Weak indicators (id, value): 2 points
   - Example: If columns include "email" and "phone", Customer type gets 20 points

2. **Data Pattern Score (0-50 points per data type):**
   - Analyzes actual data values using statistical measures
   - Customer: High uniqueness in name/email/phone columns (+30)
   - Transaction: Low uniqueness in customer/category (+20), High uniqueness in transaction_id (+30)
   - Inventory: High uniqueness in SKU/ID (+30), Low uniqueness in category (+20)
   - Time-Series: High uniqueness in timestamp (+30), Low uniqueness in metric (+20)
   - Example: If "email" column has 95% unique values, Customer type gets +30 points

3. **Total Score:** Column Name Score + Data Pattern Score (0-100)
   - Example: Customer type might score 20 (column names) + 30 (data patterns) = 50 total

4. **Confidence Calculation:**
   - If highest score > 80: confidence = highest score
   - If highest score 60-80: confidence = highest score - 10
   - If highest score < 60: confidence = highest score - 20
   - If two scores within 10 points: confidence = min(both scores) - 20
   - Example: Score of 85 → 85% confidence (auto-apply), Score of 65 → 55% confidence (ask user)

### 2. Adaptive Duplicate Detector (`src/lib/data-quality.ts`)

**Modified API:**

```typescript
export function findDuplicateGroups(
  rows: Record<string, string>[],
  detectionMode?: DuplicateDetectionMode
): DuplicateGroup[];
```

**Detection Mode Logic:**

```typescript
function findDuplicateGroups(
  rows: Record<string, string>[],
  detectionMode: DuplicateDetectionMode = DuplicateDetectionMode.AGGRESSIVE
): DuplicateGroup[] {
  // Tier 1: Always check exact duplicates (all columns match)
  const exactDuplicates = findExactDuplicates(rows);
  
  // Tier 2: Conditional partial matching based on mode
  let partialDuplicates: DuplicateGroup[] = [];
  
  if (detectionMode === DuplicateDetectionMode.AGGRESSIVE) {
    // Current behavior: match on name, email, phone
    partialDuplicates = findPartialDuplicates(rows, ['name', 'email', 'phone']);
  } else if (detectionMode === DuplicateDetectionMode.CONSERVATIVE) {
    // No partial matching - exact only
    partialDuplicates = [];
  } else if (detectionMode === DuplicateDetectionMode.VERY_CONSERVATIVE) {
    // Match on timestamp + metric combination only
    partialDuplicates = findPartialDuplicates(rows, ['timestamp', 'metric']);
  }
  
  return mergeDuplicateGroups(exactDuplicates, partialDuplicates);
}
```

### 3. Classification Store (`src/lib/schema-classifier.ts`)

**Purpose:** Persist classification decisions in browser localStorage so users don't need to re-confirm the same file type repeatedly.

**Note:** Uses browser's built-in localStorage API - no external database or cloud storage.

**Storage Key:** `wozny_schema_classifications`

**Storage Location:** Browser localStorage (typically 5-10MB limit per domain)

**Storage Format:**

```typescript
interface ClassificationStorage {
  version: number; // Schema version for migrations
  classifications: Record<string, StoredClassification>;
}
```

**Implementation:**

```typescript
const STORAGE_KEY = 'wozny_schema_classifications';
const STORAGE_VERSION = 1;

function getStoredClassification(fileName: string): StoredClassification | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const data: ClassificationStorage = JSON.parse(stored);
    return data.classifications[fileName] || null;
  } catch (error) {
    console.warn('Failed to retrieve stored classification:', error);
    return null;
  }
}

function storeClassification(
  fileName: string,
  result: ClassificationResult,
  userConfirmed: boolean
): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const data: ClassificationStorage = stored 
      ? JSON.parse(stored)
      : { version: STORAGE_VERSION, classifications: {} };
    
    data.classifications[fileName] = {
      fileName,
      dataType: result.dataType,
      confidence: result.confidence,
      timestamp: Date.now(),
      userConfirmed
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to store classification:', error);
  }
}
```

### 4. UI Components

#### ClassificationNotification Component

**Location:** `src/components/ui/ClassificationNotification.tsx`

**Props:**

```typescript
interface ClassificationNotificationProps {
  result: ClassificationResult;
  onChangeSettings: () => void;
  onDismiss: () => void;
}
```

**Behavior:**
- Displays at top of screen (toast-style)
- Shows data type, confidence, and detection mode
- Auto-dismisses after 5 seconds (unless hovered)
- Provides "Change Settings" button
- Shows info icon with top 3 column indicators on hover

**Visual Design:**
```
┌─────────────────────────────────────────────────────────────┐
│ ℹ️ Data classified as Transaction (85% confidence)          │
│ Using Conservative duplicate detection                       │
│                                                               │
│ [Change Settings]                              [Dismiss ✕]   │
└─────────────────────────────────────────────────────────────┘
```

#### ClassificationConfirmDialog Component

**Location:** `src/components/ui/ClassificationConfirmDialog.tsx`

**Props:**

```typescript
interface ClassificationConfirmDialogProps {
  suggestedType: DataType;
  confidence: number;
  indicators: ColumnIndicator[];
  onConfirm: (dataType: DataType) => void;
  onCancel: () => void;
}
```

**Behavior:**
- Modal dialog (blocks interaction)
- Shows suggested type with confidence
- Provides quick actions: "Yes", "No, it's [Alternative]", "Show Options"
- Expands to show all 4 options with descriptions
- Each option shows example columns and detection mode

**Visual Design:**
```
┌─────────────────────────────────────────────────────────────┐
│  Confirm Data Type                                      ✕    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  We detected this as Transaction data (65% confidence)       │
│                                                               │
│  Based on columns: order_id, customer_name, date             │
│                                                               │
│  Is this correct?                                            │
│                                                               │
│  [Yes, Transaction]  [No, it's Customer]  [Show All Options] │
│                                                               │
└─────────────────────────────────────────────────────────────┘

// Expanded view:
┌─────────────────────────────────────────────────────────────┐
│  Select Data Type                                       ✕    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ○ Customer / Contact Data                                   │
│    Columns: name, email, phone, address                      │
│    Duplicate Detection: Aggressive (matches similar names)   │
│                                                               │
│  ● Transaction / Event Data (Suggested)                      │
│    Columns: order_id, date, customer_name, amount            │
│    Duplicate Detection: Conservative (exact matches only)    │
│                                                               │
│  ○ Inventory / Catalog Data                                  │
│    Columns: sku, product_id, category, price                 │
│    Duplicate Detection: Conservative (exact matches only)    │
│                                                               │
│  ○ Time-Series / Metrics Data                                │
│    Columns: timestamp, metric, value, sensor                 │
│    Duplicate Detection: Very Conservative (time + metric)    │
│                                                               │
│                                    [Cancel]  [Confirm]        │
└─────────────────────────────────────────────────────────────┘
```

## Integration Points

### 1. Wozny Store Integration (`src/lib/store/useWoznyStore.ts`)

**State Additions:**

```typescript
interface WoznyState {
  // ... existing state
  schemaClassification: ClassificationResult | null;
  showClassificationNotification: boolean;
  showClassificationDialog: boolean;
}
```

**Action Modifications:**

```typescript
setCsvData: (
  data: Record<string, string>[],
  fileName: string,
  columnWidths?: Record<string, number>
) => {
  // ... existing logic (set data, calculate widths)
  
  // NEW: Check for stored classification
  const stored = getStoredClassification(fileName);
  
  let classification: ClassificationResult;
  
  if (stored) {
    // Use stored classification
    classification = {
      dataType: stored.dataType,
      confidence: stored.confidence,
      indicators: [],
      detectionMode: mapDataTypeToDetectionMode(stored.dataType),
      timestamp: stored.timestamp,
      source: 'stored'
    };
    
    set({ 
      schemaClassification: classification,
      showClassificationNotification: true 
    });
  } else {
    // Perform fresh classification
    classification = classifySchema(data, Object.keys(data[0] || {}));
    
    if (classification.confidence > 80) {
      // Auto-apply
      storeClassification(fileName, classification, false);
      set({ 
        schemaClassification: classification,
        showClassificationNotification: true 
      });
    } else {
      // Request confirmation
      set({ 
        schemaClassification: classification,
        showClassificationDialog: true 
      });
    }
  }
  
  // Run duplicate detection with appropriate mode
  const duplicates = findDuplicateGroups(data, classification.detectionMode);
  set({ duplicateGroups: duplicates });
}
```

**New Actions:**

```typescript
confirmClassification: (dataType: DataType) => {
  const { schemaClassification, csvData, fileName } = get();
  
  const updatedClassification: ClassificationResult = {
    ...schemaClassification!,
    dataType,
    detectionMode: mapDataTypeToDetectionMode(dataType),
    source: 'user-confirmed'
  };
  
  storeClassification(fileName, updatedClassification, true);
  
  set({ 
    schemaClassification: updatedClassification,
    showClassificationDialog: false,
    showClassificationNotification: true 
  });
  
  // Re-run duplicate detection
  const duplicates = findDuplicateGroups(csvData, updatedClassification.detectionMode);
  set({ duplicateGroups: duplicates });
},

dismissClassificationNotification: () => {
  set({ showClassificationNotification: false });
},

openClassificationSettings: () => {
  set({ 
    showClassificationNotification: false,
    showClassificationDialog: true 
  });
}
```

### 2. Upload View Integration (`src/features/upload/views/UploadView.tsx`)

**Component Additions:**

```typescript
import { ClassificationNotification } from '@/components/ui/ClassificationNotification';
import { ClassificationConfirmDialog } from '@/components/ui/ClassificationConfirmDialog';

export function UploadView() {
  const {
    schemaClassification,
    showClassificationNotification,
    showClassificationDialog,
    confirmClassification,
    dismissClassificationNotification,
    openClassificationSettings
  } = useWoznyStore();
  
  return (
    <div>
      {/* Existing upload UI */}
      
      {showClassificationNotification && schemaClassification && (
        <ClassificationNotification
          result={schemaClassification}
          onChangeSettings={openClassificationSettings}
          onDismiss={dismissClassificationNotification}
        />
      )}
      
      {showClassificationDialog && schemaClassification && (
        <ClassificationConfirmDialog
          suggestedType={schemaClassification.dataType}
          confidence={schemaClassification.confidence}
          indicators={schemaClassification.indicators}
          onConfirm={confirmClassification}
          onCancel={() => confirmClassification(schemaClassification.dataType)}
        />
      )}
    </div>
  );
}
```

## Performance Considerations

### Sampling Strategy

For large files (>1000 rows), sample data for pattern analysis:

```typescript
function sampleRows(
  rows: Record<string, string>[],
  maxSamples: number = 1000
): Record<string, string>[] {
  if (rows.length <= maxSamples) return rows;
  
  const step = Math.floor(rows.length / maxSamples);
  return rows.filter((_, index) => index % step === 0).slice(0, maxSamples);
}
```

### Caching

Cache uniqueness ratio calculations:

```typescript
const uniquenessCache = new Map<string, number>();

function calculateUniquenessRatio(
  rows: Record<string, string>[],
  column: string
): number {
  const cacheKey = `${column}_${rows.length}`;
  
  if (uniquenessCache.has(cacheKey)) {
    return uniquenessCache.get(cacheKey)!;
  }
  
  const uniqueValues = new Set(rows.map(row => row[column]));
  const ratio = uniqueValues.size / rows.length;
  
  uniquenessCache.set(cacheKey, ratio);
  return ratio;
}
```

### Async Processing

Run classification in a non-blocking way:

```typescript
async function classifySchemaAsync(
  rows: Record<string, string>[],
  columns: string[]
): Promise<ClassificationResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(classifySchema(rows, columns));
    }, 0);
  });
}
```

## Error Handling

### Edge Cases

1. **Empty or minimal data:**
   ```typescript
   if (columns.length < 3) {
     return {
       dataType: DataType.CUSTOMER,
       confidence: 50,
       indicators: [],
       detectionMode: DuplicateDetectionMode.AGGRESSIVE,
       timestamp: Date.now(),
       source: 'auto'
     };
   }
   ```

2. **Ambiguous classification (scores within 10 points):**
   ```typescript
   const sortedScores = scores.sort((a, b) => b.totalScore - a.totalScore);
   const [first, second] = sortedScores;
   
   if (first.totalScore - second.totalScore < 10) {
     // Force user confirmation
     first.confidence = Math.min(first.confidence, 70);
   }
   ```

3. **Storage failures:**
   ```typescript
   try {
     storeClassification(fileName, result, userConfirmed);
   } catch (error) {
     console.warn('Classification storage failed, continuing with session-only classification');
     // Continue without persistence
   }
   ```

## Testing Strategy

### Unit Tests

**Schema Classifier Tests (`schema-classifier.test.ts`):**

```typescript
describe('classifySchema', () => {
  it('should classify customer data with high confidence', () => {
    const rows = [
      { name: 'John Doe', email: 'john@example.com', phone: '555-1234' },
      { name: 'Jane Smith', email: 'jane@example.com', phone: '555-5678' }
    ];
    const result = classifySchema(rows, ['name', 'email', 'phone']);
    
    expect(result.dataType).toBe(DataType.CUSTOMER);
    expect(result.confidence).toBeGreaterThan(80);
    expect(result.detectionMode).toBe(DuplicateDetectionMode.AGGRESSIVE);
  });
  
  it('should classify transaction data with high confidence', () => {
    const rows = [
      { order_id: '001', customer_name: 'John Doe', date: '2024-01-01', amount: '100' },
      { order_id: '002', customer_name: 'John Doe', date: '2024-01-02', amount: '200' }
    ];
    const result = classifySchema(rows, ['order_id', 'customer_name', 'date', 'amount']);
    
    expect(result.dataType).toBe(DataType.TRANSACTION);
    expect(result.confidence).toBeGreaterThan(80);
    expect(result.detectionMode).toBe(DuplicateDetectionMode.CONSERVATIVE);
  });
  
  it('should request confirmation for ambiguous data', () => {
    const rows = [
      { id: '1', name: 'Item A', value: '100' },
      { id: '2', name: 'Item B', value: '200' }
    ];
    const result = classifySchema(rows, ['id', 'name', 'value']);
    
    expect(result.confidence).toBeLessThanOrEqual(80);
  });
});
```

**Duplicate Detector Tests (`data-quality.test.ts`):**

```typescript
describe('findDuplicateGroups with detection modes', () => {
  const transactionData = [
    { order_id: '001', customer_name: 'John Doe', date: '2024-01-01' },
    { order_id: '002', customer_name: 'John Doe', date: '2024-01-02' },
    { order_id: '003', customer_name: 'Jane Smith', date: '2024-01-03' }
  ];
  
  it('should not flag repeated customers as duplicates in conservative mode', () => {
    const duplicates = findDuplicateGroups(
      transactionData,
      DuplicateDetectionMode.CONSERVATIVE
    );
    
    expect(duplicates).toHaveLength(0);
  });
  
  it('should flag repeated customers as duplicates in aggressive mode', () => {
    const duplicates = findDuplicateGroups(
      transactionData,
      DuplicateDetectionMode.AGGRESSIVE
    );
    
    expect(duplicates.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests

**End-to-End Classification Flow:**

```typescript
describe('Schema classification integration', () => {
  it('should auto-apply high-confidence classification and run duplicate detection', () => {
    const store = useWoznyStore.getState();
    
    const customerData = [
      { name: 'John Doe', email: 'john@example.com', phone: '555-1234' },
      { name: 'John Doe', email: 'john@example.com', phone: '555-1234' } // Duplicate
    ];
    
    store.setCsvData(customerData, 'customers.csv');
    
    expect(store.schemaClassification?.dataType).toBe(DataType.CUSTOMER);
    expect(store.showClassificationNotification).toBe(true);
    expect(store.duplicateGroups.length).toBeGreaterThan(0);
  });
  
  it('should request confirmation for low-confidence classification', () => {
    const store = useWoznyStore.getState();
    
    const ambiguousData = [
      { id: '1', name: 'Item A', value: '100' },
      { id: '2', name: 'Item B', value: '200' }
    ];
    
    store.setCsvData(ambiguousData, 'data.csv');
    
    expect(store.showClassificationDialog).toBe(true);
    expect(store.duplicateGroups).toHaveLength(0); // Not run yet
  });
});
```

## Migration Plan

### Phase 1: Core Classification Logic
1. Create `src/lib/schema-classifier.ts` with all classification functions
2. Add unit tests for column name analysis and data pattern analysis
3. Verify scoring algorithm produces expected results

### Phase 2: Duplicate Detector Refactoring
1. Modify `findDuplicateGroups` to accept `detectionMode` parameter
2. Add conditional logic for different detection modes
3. Add unit tests verifying mode-specific behavior
4. Ensure backward compatibility (default to AGGRESSIVE)

### Phase 3: UI Components
1. Create `ClassificationNotification` component
2. Create `ClassificationConfirmDialog` component
3. Add Storybook stories for both components
4. Test accessibility and responsive behavior

### Phase 4: Store Integration
1. Add classification state to `useWoznyStore`
2. Modify `setCsvData` action to invoke classification
3. Add new actions for confirmation and dismissal
4. Add integration tests

### Phase 5: Upload View Integration
1. Import and render UI components in `UploadView`
2. Wire up event handlers
3. Test complete user flow

### Phase 6: Storage and Persistence
1. Implement localStorage-based classification store
2. Add retrieval logic in `setCsvData`
3. Test persistence across browser sessions
4. Add clear/reset functionality

## Open Questions

1. **Should we provide a "Don't ask again for this file" option?**
   - Pro: Reduces friction for repeat uploads
   - Con: User might forget they set it
   - Decision: Yes, this is already handled by localStorage persistence

2. **Should classification be re-run if user adds/removes columns?**
   - Pro: Keeps classification accurate
   - Con: Might be disruptive if user is mid-workflow
   - Decision: Re-run only if column count changes by >20%

3. **Should we log classification decisions for analytics?**
   - Pro: Helps improve algorithm over time
   - Con: Privacy concerns, requires external service
   - Decision: No logging for now, keep everything local

4. **Should we support custom detection modes?**
   - Pro: Power users can fine-tune behavior
   - Con: Adds complexity
   - Decision: Not in v1, consider for v2

5. **Should we use machine learning for classification?**
   - Pro: Could be more accurate over time
   - Con: Requires external ML service or large model files, adds complexity
   - Decision: No, use rule-based pattern matching for v1 (keeps it simple and local)

## Success Metrics

1. **Classification Accuracy:** >90% of auto-applied classifications should not be manually overridden
2. **User Confirmation Rate:** <20% of uploads should require user confirmation
3. **Performance:** Classification should complete in <500ms for files <1000 rows
4. **False Positive Reduction:** Transaction data should have 0 false positive duplicates from repeated customer names
5. **User Satisfaction:** Positive feedback on classification feature in user testing

## Future Enhancements

1. **Machine Learning:** Train a local model on user corrections to improve classification (would require ML library like TensorFlow.js)
2. **Custom Rules:** Allow users to define custom column patterns for their domain (stored in localStorage)
3. **Batch Classification:** Classify multiple files at once
4. **Export/Import Settings:** Share classification rules across teams (JSON export/import)
5. **API Integration:** Classify data from API responses, not just CSV files
6. **Cloud Sync:** Optionally sync classifications across devices (would require backend service)

**Note:** All current functionality remains local and client-side. Future enhancements marked with external dependencies are optional.
