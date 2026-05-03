/**
 * Schema Classification System
 * 
 * Automatically analyzes uploaded CSV data to determine its type (Customer, Transaction, 
 * Inventory, or Time-Series) and applies appropriate duplicate detection logic.
 * 
 * This is a fully client-side system with no external API calls.
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Data type categories for CSV classification
 */
export enum DataType {
  CUSTOMER = 'customer',
  TRANSACTION = 'transaction',
  INVENTORY = 'inventory',
  TIME_SERIES = 'time-series'
}

/**
 * Duplicate detection modes mapped to data types
 */
export enum DuplicateDetectionMode {
  AGGRESSIVE = 'aggressive',           // Partial matching on key columns (Customer)
  CONSERVATIVE = 'conservative',       // Exact matching only (Transaction/Inventory)
  VERY_CONSERVATIVE = 'very-conservative' // Exact matching on timestamp + metric (Time-Series)
}

/**
 * Column indicator that influenced classification
 */
export interface ColumnIndicator {
  columnName: string;
  pattern: string;
  dataType: DataType;
  score: number;
}

/**
 * Result of schema classification
 */
export interface ClassificationResult {
  dataType: DataType;
  confidence: number; // 0-100
  indicators: ColumnIndicator[];
  detectionMode: DuplicateDetectionMode;
  timestamp: number;
  source: 'auto' | 'user-confirmed' | 'stored';
}

/**
 * Stored classification in localStorage
 */
export interface StoredClassification {
  fileName: string;
  dataType: DataType;
  confidence: number;
  indicators: ColumnIndicator[];
  detectionMode: DuplicateDetectionMode;
  timestamp: number;
  userConfirmed: boolean;
}

/**
 * Internal scoring structure for classification
 */
export interface ClassificationScore {
  dataType: DataType;
  columnNameScore: number;
  dataPatternScore: number;
  totalScore: number;
  confidence: number;
}

// ============================================================================
// Storage Configuration
// ============================================================================

const STORAGE_KEY = 'wozny_schema_classifications';
const STORAGE_VERSION = 1;

interface ClassificationStorage {
  version: number;
  classifications: Record<string, StoredClassification>;
}


// ============================================================================
// Column Pattern Definitions
// ============================================================================

/**
 * Column name patterns for each data type.
 * Patterns are matched against normalized column names (lowercase, underscores).
 */
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

/**
 * Pattern weights for scoring.
 * Strong indicators are highly specific to a data type.
 * Medium indicators are common but not unique.
 * Weak indicators are generic.
 */
const PATTERN_WEIGHTS: Record<string, number> = {
  // Strong indicators (10 points)
  email: 10,
  phone: 10,
  sku: 10,
  product_id: 10,
  timestamp: 10,
  order_id: 10,
  transaction_id: 10,
  invoice_id: 10,
  
  // Medium indicators (5 points)
  name: 5,
  customer_name: 5,
  category: 5,
  date: 5,
  price: 5,
  quantity: 5,
  metric: 5,
  measurement: 5,
  
  // Weak indicators (2 points) - default for unlisted patterns
};

/**
 * Get the weight for a pattern. Returns 2 (weak) if not explicitly defined.
 */
function getPatternWeight(pattern: string): number {
  return PATTERN_WEIGHTS[pattern] || 2;
}


// ============================================================================
// Column Name Normalization
// ============================================================================

/**
 * Normalizes a column name for pattern matching.
 * - Converts to lowercase
 * - Replaces hyphens and spaces with underscores
 * - Trims whitespace
 * 
 * @example
 * normalizeColumnName("First Name") => "first_name"
 * normalizeColumnName("order-id") => "order_id"
 * normalizeColumnName("  Email  ") => "email"
 */
function normalizeColumnName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_');
}


// ============================================================================
// Column Name Analysis
// ============================================================================

/**
 * Checks if a normalized column name matches any pattern in the list.
 */
function matchColumnPattern(normalizedName: string, patterns: string[]): boolean {
  return patterns.some(pattern => normalizedName.includes(pattern));
}

/**
 * Analyzes column names and calculates scores for each data type.
 * Returns scores based on column name patterns (0-50 points per data type).
 * 
 * @param columns - Array of column names from CSV
 * @returns Array of classification scores (one per data type)
 */
function analyzeColumnNames(columns: string[]): ClassificationScore[] {
  const scores: ClassificationScore[] = Object.values(DataType).map(dataType => ({
    dataType,
    columnNameScore: 0,
    dataPatternScore: 0,
    totalScore: 0,
    confidence: 0
  }));

  // Normalize all column names once
  const normalizedColumns = columns.map(col => normalizeColumnName(col));

  // For each data type, check which columns match its patterns
  scores.forEach(score => {
    const patterns = COLUMN_PATTERNS[score.dataType];
    
    normalizedColumns.forEach(normalizedCol => {
      // Check if this column matches any pattern for this data type
      patterns.forEach(pattern => {
        if (normalizedCol.includes(pattern)) {
          score.columnNameScore += getPatternWeight(pattern);
        }
      });
    });

    // Cap at 50 points (max for column name score)
    score.columnNameScore = Math.min(score.columnNameScore, 50);
  });

  return scores;
}


// ============================================================================
// Uniqueness Ratio Calculation
// ============================================================================

/**
 * Cache for uniqueness ratio calculations to avoid redundant computation
 */
const uniquenessCache = new Map<string, number>();

/**
 * Calculates the uniqueness ratio for a column (unique values / total rows).
 * Results are cached to improve performance.
 * 
 * @param rows - Array of data rows
 * @param column - Column name to analyze
 * @returns Ratio between 0 and 1
 */
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

/**
 * Clears the uniqueness cache. Useful for testing or when processing new files.
 */
export function clearUniquenessCache(): void {
  uniquenessCache.clear();
}


// ============================================================================
// Data Pattern Analysis
// ============================================================================

/**
 * Analyzes data patterns (uniqueness ratios) and calculates scores for each data type.
 * Returns scores based on data patterns (0-50 points per data type).
 * 
 * @param rows - Array of data rows
 * @param columns - Array of column names
 * @returns Array of classification scores (one per data type)
 */
function analyzeDataPatterns(
  rows: Record<string, string>[],
  columns: string[]
): ClassificationScore[] {
  const scores: ClassificationScore[] = Object.values(DataType).map(dataType => ({
    dataType,
    columnNameScore: 0,
    dataPatternScore: 0,
    totalScore: 0,
    confidence: 0
  }));

  if (rows.length === 0) {
    return scores;
  }

  // Normalize column names for pattern matching
  const normalizedColumns = columns.map(col => normalizeColumnName(col));

  // Helper to find columns matching patterns
  const findMatchingColumns = (patterns: string[]): string[] => {
    return columns.filter((col, idx) => {
      const normalized = normalizedColumns[idx];
      return patterns.some(pattern => normalized.includes(pattern));
    });
  };

  // Customer data type: High uniqueness in name/email/phone columns
  const customerScore = scores.find(s => s.dataType === DataType.CUSTOMER)!;
  const customerColumns = findMatchingColumns(['name', 'email', 'phone', 'contact']);
  if (customerColumns.length > 0) {
    customerColumns.forEach(col => {
      const ratio = calculateUniquenessRatio(rows, col);
      if (ratio > 0.8) {
        customerScore.dataPatternScore += 15; // 15 points per matching column
      } else if (ratio > 0.5) {
        customerScore.dataPatternScore += 10; // 10 points for moderate uniqueness
      }
    });
  }

  // Transaction data type: Low uniqueness in customer/category, High uniqueness in transaction_id
  const transactionScore = scores.find(s => s.dataType === DataType.TRANSACTION)!;
  const customerCategoryColumns = findMatchingColumns(['customer', 'category']);
  customerCategoryColumns.forEach(col => {
    const ratio = calculateUniquenessRatio(rows, col);
    if (ratio < 0.3) {
      transactionScore.dataPatternScore += 15;
    } else if (ratio < 0.5) {
      transactionScore.dataPatternScore += 10;
    }
  });
  const transactionIdColumns = findMatchingColumns(['transaction_id', 'order_id', 'invoice_id']);
  transactionIdColumns.forEach(col => {
    const ratio = calculateUniquenessRatio(rows, col);
    if (ratio === 1.0 || ratio > 0.95) { // Allow slight tolerance
      transactionScore.dataPatternScore += 20;
    } else if (ratio > 0.8) {
      transactionScore.dataPatternScore += 15;
    }
  });

  // Inventory data type: High uniqueness in SKU/ID, Low uniqueness in category
  const inventoryScore = scores.find(s => s.dataType === DataType.INVENTORY)!;
  const skuIdColumns = findMatchingColumns(['sku', 'product_id', 'item_id']);
  skuIdColumns.forEach(col => {
    const ratio = calculateUniquenessRatio(rows, col);
    if (ratio > 0.95) {
      inventoryScore.dataPatternScore += 20;
    } else if (ratio > 0.8) {
      inventoryScore.dataPatternScore += 15;
    }
  });
  const categoryColumns = findMatchingColumns(['category', 'type']);
  categoryColumns.forEach(col => {
    const ratio = calculateUniquenessRatio(rows, col);
    if (ratio < 0.2) {
      inventoryScore.dataPatternScore += 15;
    } else if (ratio < 0.4) {
      inventoryScore.dataPatternScore += 10;
    }
  });

  // Time-Series data type: High uniqueness in timestamp, Low uniqueness in metric
  const timeSeriesScore = scores.find(s => s.dataType === DataType.TIME_SERIES)!;
  const timestampColumns = findMatchingColumns(['timestamp', 'datetime', 'date', 'time']);
  timestampColumns.forEach(col => {
    const ratio = calculateUniquenessRatio(rows, col);
    if (ratio > 0.9) {
      timeSeriesScore.dataPatternScore += 20;
    } else if (ratio > 0.7) {
      timeSeriesScore.dataPatternScore += 15;
    }
  });
  const metricColumns = findMatchingColumns(['metric', 'value', 'measurement', 'reading']);
  metricColumns.forEach(col => {
    const ratio = calculateUniquenessRatio(rows, col);
    if (ratio < 0.1) {
      timeSeriesScore.dataPatternScore += 15;
    } else if (ratio < 0.3) {
      timeSeriesScore.dataPatternScore += 10;
    }
  });

  // Cap each score at 50 points
  scores.forEach(score => {
    score.dataPatternScore = Math.min(score.dataPatternScore, 50);
  });

  return scores;
}


// ============================================================================
// Score Combination and Confidence Calculation
// ============================================================================

/**
 * Combines column name scores and data pattern scores, then calculates confidence.
 * 
 * @param columnScores - Scores from column name analysis
 * @param patternScores - Scores from data pattern analysis
 * @returns Combined scores with confidence calculated
 */
function combineScores(
  columnScores: ClassificationScore[],
  patternScores: ClassificationScore[]
): ClassificationScore[] {
  const combinedScores: ClassificationScore[] = [];

  // Combine scores for each data type
  Object.values(DataType).forEach(dataType => {
    const colScore = columnScores.find(s => s.dataType === dataType)!;
    const patScore = patternScores.find(s => s.dataType === dataType)!;

    const totalScore = colScore.columnNameScore + patScore.dataPatternScore;

    combinedScores.push({
      dataType,
      columnNameScore: colScore.columnNameScore,
      dataPatternScore: patScore.dataPatternScore,
      totalScore,
      confidence: 0 // Will be calculated next
    });
  });

  // Sort by total score (descending)
  combinedScores.sort((a, b) => b.totalScore - a.totalScore);

  const [first, second] = combinedScores;

  // Calculate confidence based on highest score and score separation
  let confidence = first.totalScore;

  // More generous confidence calculation
  if (first.totalScore >= 70) {
    confidence = Math.min(100, first.totalScore + 15); // Boost high scores
  } else if (first.totalScore >= 50) {
    confidence = first.totalScore + 10;
  } else if (first.totalScore >= 30) {
    confidence = first.totalScore;
  } else {
    confidence = Math.max(0, first.totalScore - 10);
  }

  // If two scores are within 10 points, reduce confidence (ambiguous)
  if (second && (first.totalScore - second.totalScore) < 10) {
    confidence = Math.min(first.totalScore, second.totalScore);
  }

  // Ensure confidence is between 0 and 100
  confidence = Math.max(0, Math.min(100, confidence));

  // Apply confidence to the top score
  first.confidence = confidence;

  return combinedScores;
}


// ============================================================================
// Classification Selection
// ============================================================================

/**
 * Maps a data type to its corresponding duplicate detection mode.
 */
export function mapDataTypeToDetectionMode(dataType: DataType): DuplicateDetectionMode {
  switch (dataType) {
    case DataType.CUSTOMER:
      return DuplicateDetectionMode.AGGRESSIVE;
    case DataType.TRANSACTION:
      return DuplicateDetectionMode.CONSERVATIVE;
    case DataType.INVENTORY:
      return DuplicateDetectionMode.CONSERVATIVE;
    case DataType.TIME_SERIES:
      return DuplicateDetectionMode.VERY_CONSERVATIVE;
    default:
      return DuplicateDetectionMode.AGGRESSIVE;
  }
}

/**
 * Selects the best classification based on combined scores.
 * 
 * @param scores - Combined scores with confidence calculated
 * @returns Classification result with the highest scoring data type
 */
function selectBestClassification(scores: ClassificationScore[]): ClassificationResult {
  // Scores are already sorted by total score (descending)
  const best = scores[0];

  return {
    dataType: best.dataType,
    confidence: best.confidence,
    indicators: [], // Will be populated by main classification function
    detectionMode: mapDataTypeToDetectionMode(best.dataType),
    timestamp: Date.now(),
    source: 'auto'
  };
}


// ============================================================================
// Row Sampling for Large Files
// ============================================================================

/**
 * Samples rows evenly from a large dataset to improve performance.
 * 
 * @param rows - Full dataset
 * @param maxSamples - Maximum number of samples to return (default: 1000)
 * @returns Sampled rows or all rows if count <= maxSamples
 */
function sampleRows(
  rows: Record<string, string>[],
  maxSamples: number = 1000
): Record<string, string>[] {
  if (rows.length <= maxSamples) {
    return rows;
  }

  const step = Math.floor(rows.length / maxSamples);
  return rows.filter((_, index) => index % step === 0).slice(0, maxSamples);
}

// ============================================================================
// Main Classification Function
// ============================================================================

/**
 * Classifies CSV data by analyzing column names and data patterns.
 * This is the main public API function for schema classification.
 * 
 * @param rows - Array of data rows from CSV
 * @param columns - Array of column names from CSV
 * @param useCustomRules - Whether to check custom rules first (default: true)
 * @returns Classification result with data type, confidence, and detection mode
 * 
 * @example
 * const result = classifySchema(rows, ['name', 'email', 'phone']);
 * // => { dataType: 'customer', confidence: 85, ... }
 */
export function classifySchema(
  rows: Record<string, string>[],
  columns: string[],
  useCustomRules: boolean = false // Disabled by default to avoid circular dependency
): ClassificationResult {
  // Try custom rules first if enabled
  if (useCustomRules) {
    try {
      // Import dynamically to avoid circular dependencies in tests
      // In production, this will be tree-shaken if not used
      const customRulesModule = require('./custom-rules');
      if (customRulesModule && customRulesModule.evaluateCustomRules) {
        const customResult = customRulesModule.evaluateCustomRules(rows, columns);
        
        if (customResult.matched && customResult.rule) {
          return {
            dataType: customResult.rule.dataType,
            confidence: customResult.confidence,
            indicators: [],
            detectionMode: mapDataTypeToDetectionMode(customResult.rule.dataType),
            timestamp: Date.now(),
            source: 'auto'
          };
        }
      }
    } catch (error) {
      // Custom rules not available or error occurred, fall back to default
      console.debug('Custom rules evaluation skipped:', error);
    }
  }

  // Edge case: Minimal columns default to Customer
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

  // Sample rows if dataset is large
  const sampledRows = sampleRows(rows);

  // Analyze column names
  const columnScores = analyzeColumnNames(columns);

  // Analyze data patterns
  const patternScores = analyzeDataPatterns(sampledRows, columns);

  // Combine scores and calculate confidence
  const combinedScores = combineScores(columnScores, patternScores);

  // Select best classification
  const result = selectBestClassification(combinedScores);

  // Add top 3 column indicators
  const allIndicators: ColumnIndicator[] = [];
  const normalizedColumns = columns.map(col => normalizeColumnName(col));

  columns.forEach((col, idx) => {
    const normalized = normalizedColumns[idx];
    Object.values(DataType).forEach(dataType => {
      const patterns = COLUMN_PATTERNS[dataType];
      patterns.forEach(pattern => {
        if (normalized.includes(pattern)) {
          allIndicators.push({
            columnName: col,
            pattern,
            dataType,
            score: getPatternWeight(pattern)
          });
        }
      });
    });
  });

  // Sort by score and take top 3 for the selected data type
  result.indicators = allIndicators
    .filter(ind => ind.dataType === result.dataType)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return result;
}


// ============================================================================
// Classification Storage (localStorage)
// ============================================================================

/**
 * Retrieves a stored classification from browser localStorage.
 * 
 * @param fileName - Name of the file to look up
 * @returns Stored classification or null if not found
 */
export function getStoredClassification(
  fileName: string
): StoredClassification | null {
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

/**
 * Stores a classification decision in browser localStorage.
 * 
 * @param fileName - Name of the file
 * @param result - Classification result to store
 * @param userConfirmed - Whether the user manually confirmed this classification
 */
export function storeClassification(
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
      indicators: result.indicators,
      detectionMode: result.detectionMode,
      timestamp: Date.now(),
      userConfirmed
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to store classification:', error);
  }
}

/**
 * Removes a stored classification for a specific file.
 * 
 * @param fileName - Name of the file to clear
 */
export function clearStoredClassification(fileName: string): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const data: ClassificationStorage = JSON.parse(stored);
    delete data.classifications[fileName];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to clear stored classification:', error);
  }
}

/**
 * Removes all stored classifications.
 */
export function clearAllStoredClassifications(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear all stored classifications:', error);
  }
}

/**
 * Retrieves all stored classifications from browser localStorage.
 * 
 * @returns Array of all stored classifications, sorted by timestamp (newest first)
 */
export function getAllStoredClassifications(): StoredClassification[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const data: ClassificationStorage = JSON.parse(stored);
    return Object.values(data.classifications).sort(
      (a, b) => b.timestamp - a.timestamp
    );
  } catch (error) {
    console.warn('Failed to retrieve all stored classifications:', error);
    return [];
  }
}

