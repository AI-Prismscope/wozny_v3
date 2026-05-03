/**
 * Batch Classification System
 * 
 * Allows classification of multiple CSV files at once.
 * Useful for processing large datasets or historical data.
 */

import { 
  ClassificationResult, 
  classifySchema, 
  storeClassification,
  DataType,
  mapDataTypeToDetectionMode,
} from './schema-classifier';
import { evaluateCustomRules } from './custom-rules';
import { trackClassificationEvent, AnalyticsEventType } from './analytics';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * File to be classified in batch
 */
export interface BatchFile {
  fileName: string;
  rows: Record<string, string>[];
  columns: string[];
}

/**
 * Result of batch classification for a single file
 */
export interface BatchClassificationResult {
  fileName: string;
  classification: ClassificationResult | null;
  error: string | null;
  customRuleMatched: boolean;
}

/**
 * Summary of batch classification operation
 */
export interface BatchClassificationSummary {
  total: number;
  successful: number;
  failed: number;
  highConfidence: number; // >80%
  lowConfidence: number; // <=80%
  customRuleMatches: number;
  byDataType: Record<DataType, number>;
  results: BatchClassificationResult[];
  startTime: number;
  endTime: number;
  durationMs: number;
}

/**
 * Batch classification options
 */
export interface BatchClassificationOptions {
  useCustomRules: boolean;
  autoStore: boolean; // Automatically store classifications
  minConfidence: number; // Minimum confidence to consider successful
  trackAnalytics: boolean; // Track events in analytics
}

// ============================================================================
// Default Options
// ============================================================================

const DEFAULT_OPTIONS: BatchClassificationOptions = {
  useCustomRules: true,
  autoStore: true,
  minConfidence: 0,
  trackAnalytics: true,
};

// ============================================================================
// Batch Classification
// ============================================================================

/**
 * Classifies a single file with optional custom rules
 */
function classifySingleFile(
  file: BatchFile,
  options: BatchClassificationOptions
): BatchClassificationResult {
  try {
    let classification: ClassificationResult | null = null;
    let customRuleMatched = false;

    // Try custom rules first if enabled
    if (options.useCustomRules) {
      const customResult = evaluateCustomRules(file.rows, file.columns);
      if (customResult.matched && customResult.rule) {
        classification = {
          dataType: customResult.rule.dataType,
          confidence: customResult.confidence,
          indicators: [],
          detectionMode: mapDataTypeToDetectionMode(customResult.rule.dataType),
          timestamp: Date.now(),
          source: 'auto',
        };
        customRuleMatched = true;
      }
    }

    // Fall back to default classification if no custom rule matched
    if (!classification) {
      classification = classifySchema(file.rows, file.columns);
    }

    // Store classification if enabled and meets minimum confidence
    if (
      options.autoStore && 
      classification && 
      classification.confidence >= options.minConfidence
    ) {
      storeClassification(file.fileName, classification, false);
    }

    // Track analytics if enabled
    if (options.trackAnalytics && classification) {
      trackClassificationEvent(
        AnalyticsEventType.CLASSIFICATION_AUTO,
        classification.dataType,
        classification.confidence,
        classification.detectionMode,
        file.fileName,
        { batch: true, customRule: customRuleMatched }
      );
    }

    return {
      fileName: file.fileName,
      classification,
      error: null,
      customRuleMatched,
    };
  } catch (error) {
    return {
      fileName: file.fileName,
      classification: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      customRuleMatched: false,
    };
  }
}

/**
 * Classifies multiple files in batch
 */
export function classifyBatch(
  files: BatchFile[],
  options: Partial<BatchClassificationOptions> = {}
): BatchClassificationSummary {
  const startTime = Date.now();
  const opts: BatchClassificationOptions = { ...DEFAULT_OPTIONS, ...options };

  const results: BatchClassificationResult[] = files.map(file =>
    classifySingleFile(file, opts)
  );

  const endTime = Date.now();

  // Calculate summary statistics
  const total = results.length;
  const successful = results.filter(r => r.classification !== null).length;
  const failed = results.filter(r => r.error !== null).length;
  const highConfidence = results.filter(
    r => r.classification && r.classification.confidence > 80
  ).length;
  const lowConfidence = results.filter(
    r => r.classification && r.classification.confidence <= 80
  ).length;
  const customRuleMatches = results.filter(r => r.customRuleMatched).length;

  // Count by data type
  const byDataType: Record<DataType, number> = {
    [DataType.CUSTOMER]: 0,
    [DataType.TRANSACTION]: 0,
    [DataType.INVENTORY]: 0,
    [DataType.TIME_SERIES]: 0,
  };

  results.forEach(r => {
    if (r.classification) {
      byDataType[r.classification.dataType]++;
    }
  });

  return {
    total,
    successful,
    failed,
    highConfidence,
    lowConfidence,
    customRuleMatches,
    byDataType,
    results,
    startTime,
    endTime,
    durationMs: endTime - startTime,
  };
}

/**
 * Classifies files in parallel batches for better performance
 */
export async function classifyBatchAsync(
  files: BatchFile[],
  options: Partial<BatchClassificationOptions> = {},
  batchSize: number = 10
): Promise<BatchClassificationSummary> {
  const startTime = Date.now();
  const opts: BatchClassificationOptions = { ...DEFAULT_OPTIONS, ...options };

  const results: BatchClassificationResult[] = [];

  // Process in batches
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    
    // Process batch in parallel using Promise.all
    const batchResults = await Promise.all(
      batch.map(file => 
        Promise.resolve(classifySingleFile(file, opts))
      )
    );

    results.push(...batchResults);

    // Small delay between batches to avoid blocking UI
    if (i + batchSize < files.length) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  const endTime = Date.now();

  // Calculate summary statistics
  const total = results.length;
  const successful = results.filter(r => r.classification !== null).length;
  const failed = results.filter(r => r.error !== null).length;
  const highConfidence = results.filter(
    r => r.classification && r.classification.confidence > 80
  ).length;
  const lowConfidence = results.filter(
    r => r.classification && r.classification.confidence <= 80
  ).length;
  const customRuleMatches = results.filter(r => r.customRuleMatched).length;

  // Count by data type
  const byDataType: Record<DataType, number> = {
    [DataType.CUSTOMER]: 0,
    [DataType.TRANSACTION]: 0,
    [DataType.INVENTORY]: 0,
    [DataType.TIME_SERIES]: 0,
  };

  results.forEach(r => {
    if (r.classification) {
      byDataType[r.classification.dataType]++;
    }
  });

  return {
    total,
    successful,
    failed,
    highConfidence,
    lowConfidence,
    customRuleMatches,
    byDataType,
    results,
    startTime,
    endTime,
    durationMs: endTime - startTime,
  };
}

/**
 * Exports batch results as JSON
 */
export function exportBatchResults(summary: BatchClassificationSummary): string {
  return JSON.stringify(
    {
      version: 1,
      exportDate: new Date().toISOString(),
      summary: {
        total: summary.total,
        successful: summary.successful,
        failed: summary.failed,
        highConfidence: summary.highConfidence,
        lowConfidence: summary.lowConfidence,
        customRuleMatches: summary.customRuleMatches,
        byDataType: summary.byDataType,
        durationMs: summary.durationMs,
      },
      results: summary.results,
    },
    null,
    2
  );
}

/**
 * Exports batch results as CSV
 */
export function exportBatchResultsAsCSV(summary: BatchClassificationSummary): string {
  const headers = [
    'File Name',
    'Data Type',
    'Confidence',
    'Detection Mode',
    'Custom Rule',
    'Status',
    'Error',
  ];

  const rows = summary.results.map(result => [
    result.fileName,
    result.classification?.dataType || 'N/A',
    result.classification?.confidence.toString() || 'N/A',
    result.classification?.detectionMode || 'N/A',
    result.customRuleMatched ? 'Yes' : 'No',
    result.error ? 'Failed' : 'Success',
    result.error || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}
