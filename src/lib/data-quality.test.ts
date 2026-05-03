import { describe, it, expect } from 'vitest';
import { findDuplicateGroups } from './data-quality';
import { DuplicateDetectionMode } from './schema-classifier';
import { RowData } from './store/useWoznyStore';

describe('findDuplicateGroups', () => {
  describe('AGGRESSIVE mode (default)', () => {
    it('should find exact duplicates', () => {
      const rows: RowData[] = [
        { name: 'John Doe', email: 'john@example.com', phone: '555-1234' },
        { name: 'John Doe', email: 'john@example.com', phone: '555-1234' }, // Exact duplicate
        { name: 'Jane Smith', email: 'jane@example.com', phone: '555-5678' }
      ];
      const columns = ['name', 'email', 'phone'];

      const groups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.AGGRESSIVE);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toEqual([0, 1]); // Rows 0 and 1 are duplicates
    });

    it('should find partial duplicates by email', () => {
      const rows: RowData[] = [
        { name: 'John Doe', email: 'john@example.com', phone: '555-1234' },
        { name: 'John D.', email: 'john@example.com', phone: '555-9999' }, // Same email
        { name: 'Jane Smith', email: 'jane@example.com', phone: '555-5678' }
      ];
      const columns = ['name', 'email', 'phone'];

      const groups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.AGGRESSIVE);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toEqual([0, 1]); // Matched by email
    });

    it('should find partial duplicates by phone', () => {
      const rows: RowData[] = [
        { name: 'John Doe', email: 'john@example.com', phone: '555-1234' },
        { name: 'Jane Smith', email: 'jane@example.com', phone: '555-1234' }, // Same phone
        { name: 'Bob Wilson', email: 'bob@example.com', phone: '555-5678' }
      ];
      const columns = ['name', 'email', 'phone'];

      const groups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.AGGRESSIVE);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toEqual([0, 1]); // Matched by phone
    });

    it('should find partial duplicates by name', () => {
      const rows: RowData[] = [
        { name: 'John Doe', email: 'john@example.com', phone: '555-1234' },
        { name: 'John Doe', email: 'john2@example.com', phone: '555-9999' }, // Same name
        { name: 'Jane Smith', email: 'jane@example.com', phone: '555-5678' }
      ];
      const columns = ['name', 'email', 'phone'];

      const groups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.AGGRESSIVE);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toEqual([0, 1]); // Matched by name
    });

    it('should handle multiple duplicate groups', () => {
      const rows: RowData[] = [
        { name: 'John Doe', email: 'john@example.com', phone: '555-1234' },
        { name: 'John Doe', email: 'john@example.com', phone: '555-1234' }, // Duplicate of row 0
        { name: 'Jane Smith', email: 'jane@example.com', phone: '555-5678' },
        { name: 'Jane Smith', email: 'jane@example.com', phone: '555-5678' }  // Duplicate of row 2
      ];
      const columns = ['name', 'email', 'phone'];

      const groups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.AGGRESSIVE);

      expect(groups).toHaveLength(2);
      expect(groups[0]).toEqual([0, 1]);
      expect(groups[1]).toEqual([2, 3]);
    });

    it('should be case-insensitive', () => {
      const rows: RowData[] = [
        { name: 'John Doe', email: 'JOHN@EXAMPLE.COM', phone: '555-1234' },
        { name: 'john doe', email: 'john@example.com', phone: '555-1234' }
      ];
      const columns = ['name', 'email', 'phone'];

      const groups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.AGGRESSIVE);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toEqual([0, 1]);
    });

    it('should ignore whitespace differences', () => {
      const rows: RowData[] = [
        { name: 'John Doe', email: 'john@example.com', phone: '555-1234' },
        { name: '  John Doe  ', email: '  john@example.com  ', phone: '  555-1234  ' }
      ];
      const columns = ['name', 'email', 'phone'];

      const groups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.AGGRESSIVE);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toEqual([0, 1]);
    });
  });

  describe('CONSERVATIVE mode', () => {
    it('should find exact duplicates only', () => {
      const rows: RowData[] = [
        { order_id: '001', customer_name: 'John Doe', date: '2024-01-01', amount: '100' },
        { order_id: '001', customer_name: 'John Doe', date: '2024-01-01', amount: '100' }, // Exact duplicate
        { order_id: '002', customer_name: 'John Doe', date: '2024-01-02', amount: '200' }  // Same customer, different order
      ];
      const columns = ['order_id', 'customer_name', 'date', 'amount'];

      const groups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.CONSERVATIVE);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toEqual([0, 1]); // Only exact duplicates
    });

    it('should NOT flag repeated customers as duplicates', () => {
      const rows: RowData[] = [
        { order_id: '001', customer_name: 'John Doe', date: '2024-01-01', amount: '100' },
        { order_id: '002', customer_name: 'John Doe', date: '2024-01-02', amount: '200' },
        { order_id: '003', customer_name: 'John Doe', date: '2024-01-03', amount: '150' }
      ];
      const columns = ['order_id', 'customer_name', 'date', 'amount'];

      const groups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.CONSERVATIVE);

      expect(groups).toHaveLength(0); // No duplicates - same customer is normal in transactions
    });

    it('should NOT flag repeated categories as duplicates', () => {
      const rows: RowData[] = [
        { sku: 'SKU001', product_name: 'Widget A', category: 'Electronics', price: '99.99' },
        { sku: 'SKU002', product_name: 'Widget B', category: 'Electronics', price: '149.99' },
        { sku: 'SKU003', product_name: 'Gadget C', category: 'Electronics', price: '199.99' }
      ];
      const columns = ['sku', 'product_name', 'category', 'price'];

      const groups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.CONSERVATIVE);

      expect(groups).toHaveLength(0); // No duplicates - same category is normal in inventory
    });

    it('should find exact duplicates in transaction data', () => {
      const rows: RowData[] = [
        { order_id: '001', customer_name: 'John Doe', date: '2024-01-01', amount: '100' },
        { order_id: '001', customer_name: 'John Doe', date: '2024-01-01', amount: '100' }, // Exact duplicate
        { order_id: '002', customer_name: 'John Doe', date: '2024-01-02', amount: '200' }
      ];
      const columns = ['order_id', 'customer_name', 'date', 'amount'];

      const groups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.CONSERVATIVE);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toEqual([0, 1]);
    });

    it('should find exact duplicates in inventory data', () => {
      const rows: RowData[] = [
        { sku: 'SKU001', product_name: 'Widget A', category: 'Electronics', price: '99.99' },
        { sku: 'SKU001', product_name: 'Widget A', category: 'Electronics', price: '99.99' }, // Exact duplicate
        { sku: 'SKU002', product_name: 'Widget B', category: 'Electronics', price: '149.99' }
      ];
      const columns = ['sku', 'product_name', 'category', 'price'];

      const groups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.CONSERVATIVE);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toEqual([0, 1]);
    });
  });

  describe('VERY_CONSERVATIVE mode', () => {
    it('should find exact duplicates', () => {
      const rows: RowData[] = [
        { timestamp: '2024-01-01T00:00:00Z', metric: 'temperature', value: '72.5' },
        { timestamp: '2024-01-01T00:00:00Z', metric: 'temperature', value: '72.5' }, // Exact duplicate
        { timestamp: '2024-01-01T01:00:00Z', metric: 'temperature', value: '73.1' }
      ];
      const columns = ['timestamp', 'metric', 'value'];

      const groups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.VERY_CONSERVATIVE);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toEqual([0, 1]);
    });

    it('should find duplicates by timestamp + metric combination', () => {
      const rows: RowData[] = [
        { timestamp: '2024-01-01T00:00:00Z', metric: 'temperature', value: '72.5' },
        { timestamp: '2024-01-01T00:00:00Z', metric: 'temperature', value: '99.9' }, // Same time + metric, different value
        { timestamp: '2024-01-01T01:00:00Z', metric: 'temperature', value: '73.1' }
      ];
      const columns = ['timestamp', 'metric', 'value'];

      const groups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.VERY_CONSERVATIVE);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toEqual([0, 1]); // Matched by timestamp + metric
    });

    it('should NOT flag different timestamps as duplicates', () => {
      const rows: RowData[] = [
        { timestamp: '2024-01-01T00:00:00Z', metric: 'temperature', value: '72.5' },
        { timestamp: '2024-01-01T01:00:00Z', metric: 'temperature', value: '72.5' }, // Different time, same metric + value
        { timestamp: '2024-01-01T02:00:00Z', metric: 'temperature', value: '72.5' }
      ];
      const columns = ['timestamp', 'metric', 'value'];

      const groups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.VERY_CONSERVATIVE);

      expect(groups).toHaveLength(0); // No duplicates - different timestamps
    });

    it('should NOT flag different metrics as duplicates', () => {
      const rows: RowData[] = [
        { timestamp: '2024-01-01T00:00:00Z', metric: 'temperature', value: '72.5' },
        { timestamp: '2024-01-01T00:00:00Z', metric: 'humidity', value: '72.5' } // Same time + value, different metric
      ];
      const columns = ['timestamp', 'metric', 'value'];

      const groups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.VERY_CONSERVATIVE);

      expect(groups).toHaveLength(0); // No duplicates - different metrics
    });

    it('should handle data without timestamp or metric columns', () => {
      const rows: RowData[] = [
        { id: '1', name: 'Item A', value: '100' },
        { id: '1', name: 'Item A', value: '100' } // Exact duplicate
      ];
      const columns = ['id', 'name', 'value'];

      const groups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.VERY_CONSERVATIVE);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toEqual([0, 1]); // Falls back to exact matching
    });
  });

  describe('Backward compatibility', () => {
    it('should default to AGGRESSIVE mode when no mode specified', () => {
      const rows: RowData[] = [
        { name: 'John Doe', email: 'john@example.com', phone: '555-1234' },
        { name: 'John Doe', email: 'john2@example.com', phone: '555-9999' } // Same name only
      ];
      const columns = ['name', 'email', 'phone'];

      // Call without detection mode parameter
      const groups = findDuplicateGroups(rows, columns);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toEqual([0, 1]); // Should find partial match (AGGRESSIVE behavior)
    });
  });

  describe('Edge cases', () => {
    it('should handle empty dataset', () => {
      const rows: RowData[] = [];
      const columns = ['name', 'email'];

      const groups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.AGGRESSIVE);

      expect(groups).toHaveLength(0);
    });

    it('should handle single row', () => {
      const rows: RowData[] = [
        { name: 'John Doe', email: 'john@example.com' }
      ];
      const columns = ['name', 'email'];

      const groups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.AGGRESSIVE);

      expect(groups).toHaveLength(0);
    });

    it('should handle missing values', () => {
      const rows: RowData[] = [
        { name: 'John Doe', email: '', phone: '555-1234' },
        { name: 'John Doe', email: '', phone: '555-1234' }
      ];
      const columns = ['name', 'email', 'phone'];

      const groups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.AGGRESSIVE);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toEqual([0, 1]); // Should still match on exact duplicate
    });

    it('should handle very short values in AGGRESSIVE mode', () => {
      const rows: RowData[] = [
        { name: 'Jo', email: 'a@b.c', phone: '12' },
        { name: 'Jo', email: 'a@b.c', phone: '12' }
      ];
      const columns = ['name', 'email', 'phone'];

      const groups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.AGGRESSIVE);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toEqual([0, 1]); // Exact match should still work
    });
  });

  describe('Mode comparison', () => {
    it('AGGRESSIVE should find more duplicates than CONSERVATIVE', () => {
      const rows: RowData[] = [
        { name: 'John Doe', email: 'john@example.com', phone: '555-1234' },
        { name: 'John Doe', email: 'john@example.com', phone: '555-1234' }, // Exact
        { name: 'John Doe', email: 'john2@example.com', phone: '555-9999' }, // Partial (name only)
        { name: 'Jane Smith', email: 'jane@example.com', phone: '555-5678' },
        { name: 'Jane Smith', email: 'jane2@example.com', phone: '555-9876' }  // Another partial (name only)
      ];
      const columns = ['name', 'email', 'phone'];

      const aggressiveGroups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.AGGRESSIVE);
      const conservativeGroups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.CONSERVATIVE);

      // AGGRESSIVE finds: exact (0,1) + partial (3,4) = 2 groups
      // CONSERVATIVE finds: exact (0,1) only = 1 group
      expect(aggressiveGroups.length).toBeGreaterThan(conservativeGroups.length);
      expect(conservativeGroups).toHaveLength(1); // Only exact duplicate (rows 0,1)
      expect(aggressiveGroups).toHaveLength(2); // Exact (0,1) + partial (3,4)
    });

    it('all modes should find exact duplicates', () => {
      const rows: RowData[] = [
        { col1: 'A', col2: 'B', col3: 'C' },
        { col1: 'A', col2: 'B', col3: 'C' }, // Exact duplicate
        { col1: 'D', col2: 'E', col3: 'F' }
      ];
      const columns = ['col1', 'col2', 'col3'];

      const aggressiveGroups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.AGGRESSIVE);
      const conservativeGroups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.CONSERVATIVE);
      const veryConservativeGroups = findDuplicateGroups(rows, columns, DuplicateDetectionMode.VERY_CONSERVATIVE);

      expect(aggressiveGroups).toHaveLength(1);
      expect(conservativeGroups).toHaveLength(1);
      expect(veryConservativeGroups).toHaveLength(1);
      
      expect(aggressiveGroups[0]).toEqual([0, 1]);
      expect(conservativeGroups[0]).toEqual([0, 1]);
      expect(veryConservativeGroups[0]).toEqual([0, 1]);
    });
  });
});
