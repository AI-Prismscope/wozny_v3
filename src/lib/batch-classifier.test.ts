import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  classifyBatch,
  classifyBatchAsync,
  exportBatchResults,
  exportBatchResultsAsCSV,
  BatchFile,
} from './batch-classifier';
import { clearAllStoredClassifications, DataType } from './schema-classifier';
import { clearAllRules, createRule, RuleConditionType, RuleOperator } from './custom-rules';
import { clearAnalytics } from './analytics';

// Mock localStorage for tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

describe('Batch Classification System', () => {
  beforeEach(() => {
    localStorageMock.clear();
    clearAllStoredClassifications();
    clearAllRules();
    clearAnalytics();
  });

  describe('Batch Classification', () => {
    it('should classify multiple files', () => {
      const files: BatchFile[] = [
        {
          fileName: 'customers.csv',
          rows: [
            { name: 'John Doe', email: 'john@example.com', phone: '123-456-7890' },
            { name: 'Jane Smith', email: 'jane@example.com', phone: '098-765-4321' },
          ],
          columns: ['name', 'email', 'phone'],
        },
        {
          fileName: 'transactions.csv',
          rows: [
            { order_id: '1', date: '2024-01-01', amount: '100' },
            { order_id: '2', date: '2024-01-02', amount: '200' },
          ],
          columns: ['order_id', 'date', 'amount'],
        },
      ];

      const summary = classifyBatch(files);

      expect(summary.total).toBe(2);
      expect(summary.successful).toBe(2);
      expect(summary.failed).toBe(0);
      expect(summary.results).toHaveLength(2);
      expect(summary.results[0].classification).not.toBeNull();
      expect(summary.results[1].classification).not.toBeNull();
    });

    it('should handle classification errors gracefully', () => {
      const files: BatchFile[] = [
        {
          fileName: 'valid.csv',
          rows: [{ name: 'John', email: 'john@example.com' }],
          columns: ['name', 'email'],
        },
        {
          fileName: 'invalid.csv',
          rows: [], // Empty rows might cause issues
          columns: [],
        },
      ];

      const summary = classifyBatch(files);

      expect(summary.total).toBe(2);
      expect(summary.successful).toBeGreaterThanOrEqual(1);
    });

    it('should respect minimum confidence threshold', () => {
      const files: BatchFile[] = [
        {
          fileName: 'ambiguous.csv',
          rows: [{ col1: 'a', col2: 'b' }],
          columns: ['col1', 'col2'],
        },
      ];

      const summary = classifyBatch(files, {
        minConfidence: 90, // Very high threshold
        autoStore: true,
      });

      expect(summary.total).toBe(1);
      // Classification might succeed but not be stored due to low confidence
    });

    it('should use custom rules when enabled', () => {
      // Create a custom rule
      createRule(
        'CRM Rule',
        'Matches CRM data',
        DataType.CUSTOMER,
        [
          {
            type: RuleConditionType.COLUMN_NAME_CONTAINS,
            operator: RuleOperator.CONTAINS,
            value: 'contact',
          },
        ],
        100
      );

      const files: BatchFile[] = [
        {
          fileName: 'contacts.csv',
          rows: [{ contact_name: 'John', contact_email: 'john@example.com' }],
          columns: ['contact_name', 'contact_email'],
        },
      ];

      const summary = classifyBatch(files, { useCustomRules: true });

      expect(summary.total).toBe(1);
      expect(summary.customRuleMatches).toBe(1);
      expect(summary.results[0].customRuleMatched).toBe(true);
      expect(summary.results[0].classification?.dataType).toBe(DataType.CUSTOMER);
    });

    it('should skip custom rules when disabled', () => {
      // Create a custom rule
      createRule(
        'CRM Rule',
        'Matches CRM data',
        DataType.CUSTOMER,
        [
          {
            type: RuleConditionType.COLUMN_NAME_CONTAINS,
            operator: RuleOperator.CONTAINS,
            value: 'contact',
          },
        ],
        100
      );

      const files: BatchFile[] = [
        {
          fileName: 'contacts.csv',
          rows: [{ contact_name: 'John', contact_email: 'john@example.com' }],
          columns: ['contact_name', 'contact_email'],
        },
      ];

      const summary = classifyBatch(files, { useCustomRules: false });

      expect(summary.total).toBe(1);
      expect(summary.customRuleMatches).toBe(0);
      expect(summary.results[0].customRuleMatched).toBe(false);
    });

    it('should calculate summary statistics correctly', () => {
      const files: BatchFile[] = [
        {
          fileName: 'customers.csv',
          rows: [{ name: 'John', email: 'john@example.com', phone: '123' }],
          columns: ['name', 'email', 'phone'],
        },
        {
          fileName: 'transactions.csv',
          rows: [{ order_id: '1', date: '2024-01-01', amount: '100' }],
          columns: ['order_id', 'date', 'amount'],
        },
        {
          fileName: 'inventory.csv',
          rows: [{ sku: 'ABC123', product_name: 'Widget', price: '10' }],
          columns: ['sku', 'product_name', 'price'],
        },
      ];

      const summary = classifyBatch(files);

      expect(summary.total).toBe(3);
      expect(summary.successful).toBe(3);
      expect(summary.failed).toBe(0);
      expect(summary.durationMs).toBeGreaterThanOrEqual(0);
      expect(summary.startTime).toBeLessThanOrEqual(summary.endTime);

      // Check data type distribution
      const totalByType = Object.values(summary.byDataType).reduce((sum, count) => sum + count, 0);
      expect(totalByType).toBe(3);
    });
  });

  describe('Async Batch Classification', () => {
    it('should classify files asynchronously', async () => {
      const files: BatchFile[] = [
        {
          fileName: 'file1.csv',
          rows: [{ name: 'John', email: 'john@example.com' }],
          columns: ['name', 'email'],
        },
        {
          fileName: 'file2.csv',
          rows: [{ order_id: '1', amount: '100' }],
          columns: ['order_id', 'amount'],
        },
      ];

      const summary = await classifyBatchAsync(files);

      expect(summary.total).toBe(2);
      expect(summary.successful).toBe(2);
      expect(summary.results).toHaveLength(2);
    });

    it('should process files in batches', async () => {
      const files: BatchFile[] = Array.from({ length: 25 }, (_, i) => ({
        fileName: `file${i}.csv`,
        rows: [{ col1: 'value' }],
        columns: ['col1'],
      }));

      const summary = await classifyBatchAsync(files, {}, 10); // Batch size of 10

      expect(summary.total).toBe(25);
      expect(summary.successful).toBe(25);
    });
  });

  describe('Export Functions', () => {
    it('should export batch results as JSON', () => {
      const files: BatchFile[] = [
        {
          fileName: 'test.csv',
          rows: [{ name: 'John', email: 'john@example.com' }],
          columns: ['name', 'email'],
        },
      ];

      const summary = classifyBatch(files);
      const json = exportBatchResults(summary);
      const data = JSON.parse(json);

      expect(data.version).toBe(1);
      expect(data.exportDate).toBeDefined();
      expect(data.summary).toBeDefined();
      expect(data.results).toHaveLength(1);
    });

    it('should export batch results as CSV', () => {
      const files: BatchFile[] = [
        {
          fileName: 'test.csv',
          rows: [{ name: 'John', email: 'john@example.com' }],
          columns: ['name', 'email'],
        },
      ];

      const summary = classifyBatch(files);
      const csv = exportBatchResultsAsCSV(summary);

      expect(csv).toContain('File Name');
      expect(csv).toContain('Data Type');
      expect(csv).toContain('Confidence');
      expect(csv).toContain('test.csv');
    });

    it('should handle errors in CSV export', () => {
      const files: BatchFile[] = [
        {
          fileName: 'valid.csv',
          rows: [{ name: 'John' }],
          columns: ['name'],
        },
      ];

      const summary = classifyBatch(files);
      const csv = exportBatchResultsAsCSV(summary);

      expect(csv).toContain('Success');
      expect(csv).not.toContain('Failed');
    });
  });

  describe('Options Handling', () => {
    it('should use default options when none provided', () => {
      const files: BatchFile[] = [
        {
          fileName: 'test.csv',
          rows: [{ name: 'John', email: 'john@example.com' }],
          columns: ['name', 'email'],
        },
      ];

      const summary = classifyBatch(files);

      expect(summary.total).toBe(1);
      expect(summary.successful).toBe(1);
    });

    it('should respect autoStore option', () => {
      const files: BatchFile[] = [
        {
          fileName: 'test.csv',
          rows: [{ name: 'John', email: 'john@example.com', phone: '123' }],
          columns: ['name', 'email', 'phone'],
        },
      ];

      // With autoStore enabled (default)
      const summary1 = classifyBatch(files, { autoStore: true });
      expect(summary1.successful).toBe(1);

      // With autoStore disabled
      clearAllStoredClassifications();
      const summary2 = classifyBatch(files, { autoStore: false });
      expect(summary2.successful).toBe(1);
    });

    it('should respect trackAnalytics option', () => {
      const files: BatchFile[] = [
        {
          fileName: 'test.csv',
          rows: [{ name: 'John', email: 'john@example.com' }],
          columns: ['name', 'email'],
        },
      ];

      // With analytics enabled (default)
      const summary1 = classifyBatch(files, { trackAnalytics: true });
      expect(summary1.successful).toBe(1);

      // With analytics disabled
      const summary2 = classifyBatch(files, { trackAnalytics: false });
      expect(summary2.successful).toBe(1);
    });
  });

  describe('Confidence Tracking', () => {
    it('should track high and low confidence classifications', () => {
      const files: BatchFile[] = [
        {
          fileName: 'high-confidence.csv',
          rows: [
            { name: 'John Doe', email: 'john@example.com', phone: '123-456-7890' },
            { name: 'Jane Smith', email: 'jane@example.com', phone: '098-765-4321' },
          ],
          columns: ['name', 'email', 'phone'],
        },
        {
          fileName: 'low-confidence.csv',
          rows: [{ col1: 'a', col2: 'b' }],
          columns: ['col1', 'col2'],
        },
      ];

      const summary = classifyBatch(files);

      expect(summary.highConfidence + summary.lowConfidence).toBe(summary.successful);
    });
  });
});
