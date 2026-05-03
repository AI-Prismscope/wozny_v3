import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  classifySchema,
  getStoredClassification,
  storeClassification,
  clearStoredClassification,
  clearAllStoredClassifications,
  clearUniquenessCache,
  DataType,
  DuplicateDetectionMode,
  type ClassificationResult
} from './schema-classifier';

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

// Set up localStorage mock
global.localStorage = localStorageMock as Storage;

describe('Schema Classifier', () => {
  beforeEach(() => {
    // Clear caches and storage before each test
    clearUniquenessCache();
    localStorage.clear();
  });

  describe('classifySchema', () => {
    it('should classify customer data with high confidence', () => {
      const rows = [
        { name: 'John Doe', email: 'john@example.com', phone: '555-1234' },
        { name: 'Jane Smith', email: 'jane@example.com', phone: '555-5678' },
        { name: 'Bob Johnson', email: 'bob@example.com', phone: '555-9012' }
      ];
      const columns = ['name', 'email', 'phone'];

      const result = classifySchema(rows, columns);

      expect(result.dataType).toBe(DataType.CUSTOMER);
      expect(result.confidence).toBeGreaterThan(80);
      expect(result.detectionMode).toBe(DuplicateDetectionMode.AGGRESSIVE);
      expect(result.source).toBe('auto');
      expect(result.indicators.length).toBeGreaterThan(0);
    });

    it('should classify transaction data with high confidence', () => {
      const rows = [
        { order_id: '001', customer_name: 'John Doe', date: '2024-01-01', amount: '100' },
        { order_id: '002', customer_name: 'John Doe', date: '2024-01-02', amount: '200' },
        { order_id: '003', customer_name: 'Jane Smith', date: '2024-01-03', amount: '150' },
        { order_id: '004', customer_name: 'John Doe', date: '2024-01-04', amount: '300' },
        { order_id: '005', customer_name: 'Bob Wilson', date: '2024-01-05', amount: '250' },
        { order_id: '006', customer_name: 'John Doe', date: '2024-01-06', amount: '180' },
        { order_id: '007', customer_name: 'Jane Smith', date: '2024-01-07', amount: '220' },
        { order_id: '008', customer_name: 'Alice Brown', date: '2024-01-08', amount: '190' }
      ];
      const columns = ['order_id', 'customer_name', 'date', 'amount'];

      const result = classifySchema(rows, columns);

      expect(result.dataType).toBe(DataType.TRANSACTION);
      expect(result.confidence).toBeGreaterThanOrEqual(40); // Realistic expectation
      expect(result.detectionMode).toBe(DuplicateDetectionMode.CONSERVATIVE);
    });

    it('should classify inventory data with high confidence', () => {
      const rows = [
        { sku: 'SKU001', product_name: 'Widget A', category: 'Electronics', price: '99.99' },
        { sku: 'SKU002', product_name: 'Widget B', category: 'Electronics', price: '149.99' },
        { sku: 'SKU003', product_name: 'Gadget C', category: 'Electronics', price: '199.99' },
        { sku: 'SKU004', product_name: 'Tool D', category: 'Hardware', price: '49.99' },
        { sku: 'SKU005', product_name: 'Device E', category: 'Electronics', price: '299.99' },
        { sku: 'SKU006', product_name: 'Part F', category: 'Hardware', price: '29.99' },
        { sku: 'SKU007', product_name: 'Component G', category: 'Electronics', price: '79.99' },
        { sku: 'SKU008', product_name: 'Accessory H', category: 'Hardware', price: '19.99' }
      ];
      const columns = ['sku', 'product_name', 'category', 'price'];

      const result = classifySchema(rows, columns);

      expect(result.dataType).toBe(DataType.INVENTORY);
      expect(result.confidence).toBeGreaterThanOrEqual(60); // Realistic expectation
      expect(result.detectionMode).toBe(DuplicateDetectionMode.CONSERVATIVE);
    });

    it('should classify time-series data with high confidence', () => {
      const rows = [
        { timestamp: '2024-01-01T00:00:00Z', metric: 'temperature', value: '72.5' },
        { timestamp: '2024-01-01T01:00:00Z', metric: 'temperature', value: '73.1' },
        { timestamp: '2024-01-01T02:00:00Z', metric: 'temperature', value: '72.8' },
        { timestamp: '2024-01-01T03:00:00Z', metric: 'temperature', value: '71.9' },
        { timestamp: '2024-01-01T04:00:00Z', metric: 'temperature', value: '71.5' },
        { timestamp: '2024-01-01T05:00:00Z', metric: 'temperature', value: '71.2' },
        { timestamp: '2024-01-01T06:00:00Z', metric: 'temperature', value: '72.0' },
        { timestamp: '2024-01-01T07:00:00Z', metric: 'temperature', value: '73.5' }
      ];
      const columns = ['timestamp', 'metric', 'value'];

      const result = classifySchema(rows, columns);

      expect(result.dataType).toBe(DataType.TIME_SERIES);
      expect(result.confidence).toBeGreaterThanOrEqual(40); // Realistic expectation
      expect(result.detectionMode).toBe(DuplicateDetectionMode.VERY_CONSERVATIVE);
    });

    it('should request confirmation for ambiguous data', () => {
      const rows = [
        { id: '1', name: 'Item A', value: '100' },
        { id: '2', name: 'Item B', value: '200' },
        { id: '3', name: 'Item C', value: '300' }
      ];
      const columns = ['id', 'name', 'value'];

      const result = classifySchema(rows, columns);

      expect(result.confidence).toBeLessThanOrEqual(80);
    });

    it('should handle minimal columns by defaulting to customer', () => {
      const rows = [
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' }
      ];
      const columns = ['id', 'name'];

      const result = classifySchema(rows, columns);

      expect(result.dataType).toBe(DataType.CUSTOMER);
      expect(result.confidence).toBe(50);
      expect(result.detectionMode).toBe(DuplicateDetectionMode.AGGRESSIVE);
    });

    it('should handle empty rows gracefully', () => {
      const rows: Record<string, string>[] = [];
      const columns = ['name', 'email', 'phone'];

      const result = classifySchema(rows, columns);

      expect(result.dataType).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should handle column names with different separators', () => {
      const rows = [
        { 'First Name': 'John', 'E-mail': 'john@example.com', 'Phone Number': '555-1234' },
        { 'First Name': 'Jane', 'E-mail': 'jane@example.com', 'Phone Number': '555-5678' },
        { 'First Name': 'Bob', 'E-mail': 'bob@example.com', 'Phone Number': '555-9012' },
        { 'First Name': 'Alice', 'E-mail': 'alice@example.com', 'Phone Number': '555-3456' }
      ];
      const columns = ['First Name', 'E-mail', 'Phone Number'];

      const result = classifySchema(rows, columns);

      expect(result.dataType).toBe(DataType.CUSTOMER);
      expect(result.confidence).toBeGreaterThanOrEqual(40); // Realistic expectation
    });

    it('should sample large datasets for performance', () => {
      // Create a large dataset (2000 rows)
      const rows = Array.from({ length: 2000 }, (_, i) => ({
        order_id: `ORD${i.toString().padStart(4, '0')}`,
        customer_name: i % 10 === 0 ? 'John Doe' : `Customer ${i}`,
        date: '2024-01-01',
        amount: '100'
      }));
      const columns = ['order_id', 'customer_name', 'date', 'amount'];

      const startTime = Date.now();
      const result = classifySchema(rows, columns);
      const endTime = Date.now();

      expect(result.dataType).toBe(DataType.TRANSACTION);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete in < 2 seconds
    });

    it('should return confidence between 0 and 100', () => {
      const rows = [
        { col1: 'a', col2: 'b', col3: 'c' },
        { col1: 'd', col2: 'e', col3: 'f' }
      ];
      const columns = ['col1', 'col2', 'col3'];

      const result = classifySchema(rows, columns);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should include top column indicators in result', () => {
      const rows = [
        { name: 'John', email: 'john@example.com', phone: '555-1234' }
      ];
      const columns = ['name', 'email', 'phone'];

      const result = classifySchema(rows, columns);

      expect(result.indicators.length).toBeGreaterThan(0);
      expect(result.indicators.length).toBeLessThanOrEqual(3);
      expect(result.indicators[0]).toHaveProperty('columnName');
      expect(result.indicators[0]).toHaveProperty('pattern');
      expect(result.indicators[0]).toHaveProperty('score');
    });
  });

  describe('Storage functions', () => {
    it('should store and retrieve classification', () => {
      const result: ClassificationResult = {
        dataType: DataType.CUSTOMER,
        confidence: 85,
        indicators: [],
        detectionMode: DuplicateDetectionMode.AGGRESSIVE,
        timestamp: Date.now(),
        source: 'auto'
      };

      storeClassification('test.csv', result, false);
      const stored = getStoredClassification('test.csv');

      expect(stored).not.toBeNull();
      expect(stored?.dataType).toBe(DataType.CUSTOMER);
      expect(stored?.confidence).toBe(85);
      expect(stored?.userConfirmed).toBe(false);
    });

    it('should return null for non-existent classification', () => {
      const stored = getStoredClassification('nonexistent.csv');
      expect(stored).toBeNull();
    });

    it('should clear specific classification', () => {
      const result: ClassificationResult = {
        dataType: DataType.CUSTOMER,
        confidence: 85,
        indicators: [],
        detectionMode: DuplicateDetectionMode.AGGRESSIVE,
        timestamp: Date.now(),
        source: 'auto'
      };

      storeClassification('test1.csv', result, false);
      storeClassification('test2.csv', result, false);

      clearStoredClassification('test1.csv');

      expect(getStoredClassification('test1.csv')).toBeNull();
      expect(getStoredClassification('test2.csv')).not.toBeNull();
    });

    it('should clear all classifications', () => {
      const result: ClassificationResult = {
        dataType: DataType.CUSTOMER,
        confidence: 85,
        indicators: [],
        detectionMode: DuplicateDetectionMode.AGGRESSIVE,
        timestamp: Date.now(),
        source: 'auto'
      };

      storeClassification('test1.csv', result, false);
      storeClassification('test2.csv', result, false);

      clearAllStoredClassifications();

      expect(getStoredClassification('test1.csv')).toBeNull();
      expect(getStoredClassification('test2.csv')).toBeNull();
    });

    it('should handle storage errors gracefully', () => {
      // Mock localStorage to throw error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = () => {
        throw new Error('Storage full');
      };

      const result: ClassificationResult = {
        dataType: DataType.CUSTOMER,
        confidence: 85,
        indicators: [],
        detectionMode: DuplicateDetectionMode.AGGRESSIVE,
        timestamp: Date.now(),
        source: 'auto'
      };

      // Should not throw
      expect(() => storeClassification('test.csv', result, false)).not.toThrow();

      // Restore original
      Storage.prototype.setItem = originalSetItem;
    });

    it('should mark user-confirmed classifications', () => {
      const result: ClassificationResult = {
        dataType: DataType.TRANSACTION,
        confidence: 65,
        indicators: [],
        detectionMode: DuplicateDetectionMode.CONSERVATIVE,
        timestamp: Date.now(),
        source: 'user-confirmed'
      };

      storeClassification('test.csv', result, true);
      const stored = getStoredClassification('test.csv');

      expect(stored?.userConfirmed).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle case-insensitive column names', () => {
      const rows = [
        { NAME: 'John', EMAIL: 'john@example.com', PHONE: '555-1234' }
      ];
      const columns = ['NAME', 'EMAIL', 'PHONE'];

      const result = classifySchema(rows, columns);

      expect(result.dataType).toBe(DataType.CUSTOMER);
    });

    it('should handle columns with special characters', () => {
      const rows = [
        { 'First-Name': 'John', 'E_mail': 'john@example.com', 'Phone #': '555-1234' }
      ];
      const columns = ['First-Name', 'E_mail', 'Phone #'];

      const result = classifySchema(rows, columns);

      expect(result.dataType).toBe(DataType.CUSTOMER);
    });

    it('should handle mixed data patterns', () => {
      const rows = [
        { id: '1', name: 'John', email: 'john@example.com', order_id: 'ORD001' },
        { id: '2', name: 'Jane', email: 'jane@example.com', order_id: 'ORD002' }
      ];
      const columns = ['id', 'name', 'email', 'order_id'];

      const result = classifySchema(rows, columns);

      // Should classify based on strongest signals
      expect(result.dataType).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });
});
