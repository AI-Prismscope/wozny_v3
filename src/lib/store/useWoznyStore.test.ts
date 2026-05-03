import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWoznyStore } from './useWoznyStore';
import { DataType, DuplicateDetectionMode } from '../schema-classifier';

// Mock the schema-classifier module
vi.mock('../schema-classifier', () => ({
  DataType: {
    CUSTOMER: 'CUSTOMER',
    TRANSACTION: 'TRANSACTION',
    INVENTORY: 'INVENTORY',
    TIME_SERIES: 'TIME_SERIES',
  },
  DuplicateDetectionMode: {
    AGGRESSIVE: 'AGGRESSIVE',
    CONSERVATIVE: 'CONSERVATIVE',
    VERY_CONSERVATIVE: 'VERY_CONSERVATIVE',
  },
  classifySchema: vi.fn(() => ({
    dataType: 'CUSTOMER',
    confidence: 85,
    indicators: [
      { columnName: 'email', pattern: 'email', dataType: 'CUSTOMER', score: 10 },
    ],
    detectionMode: 'AGGRESSIVE',
    timestamp: Date.now(),
    source: 'auto',
  })),
  getStoredClassification: vi.fn(() => null),
  storeClassification: vi.fn(),
  mapDataTypeToDetectionMode: vi.fn((dataType: string) => {
    if (dataType === 'CUSTOMER') return 'AGGRESSIVE';
    if (dataType === 'TRANSACTION') return 'CONSERVATIVE';
    if (dataType === 'INVENTORY') return 'CONSERVATIVE';
    if (dataType === 'TIME_SERIES') return 'VERY_CONSERVATIVE';
    return 'AGGRESSIVE';
  }),
}));

describe('useWoznyStore - Classification Integration', () => {
  beforeEach(() => {
    // Reset store state before each test
    useWoznyStore.setState({
      rawRows: [],
      rows: [],
      columns: [],
      fileName: null,
      activeTab: 'about',
      userSelection: [],
      showHiddenColumns: false,
      columnWidths: {},
      splittableColumns: {},
      sortConfig: [],
      storageUsage: null,
      schemaClassification: null,
      showClassificationNotification: false,
      showClassificationDialog: false,
    });
  });

  it('should initialize with null classification state', () => {
    const state = useWoznyStore.getState();
    expect(state.schemaClassification).toBeNull();
    expect(state.showClassificationNotification).toBe(false);
    expect(state.showClassificationDialog).toBe(false);
  });

  it('should perform classification when CSV data is set', () => {
    const state = useWoznyStore.getState();
    const testData = [
      { name: 'John Doe', email: 'john@example.com', phone: '555-1234' },
      { name: 'Jane Smith', email: 'jane@example.com', phone: '555-5678' },
    ];
    const columns = ['name', 'email', 'phone'];

    state.setCsvData('test.csv', testData, columns);

    const newState = useWoznyStore.getState();
    expect(newState.schemaClassification).not.toBeNull();
    expect(newState.schemaClassification?.dataType).toBe('CUSTOMER');
    expect(newState.schemaClassification?.confidence).toBe(85);
  });

  it('should show notification for high confidence classification', () => {
    const state = useWoznyStore.getState();
    const testData = [
      { name: 'John Doe', email: 'john@example.com' },
    ];
    const columns = ['name', 'email'];

    state.setCsvData('test.csv', testData, columns);

    const newState = useWoznyStore.getState();
    expect(newState.showClassificationNotification).toBe(true);
    expect(newState.showClassificationDialog).toBe(false);
  });

  it('should dismiss classification notification', () => {
    const state = useWoznyStore.getState();
    
    // Set up state with notification showing
    useWoznyStore.setState({
      showClassificationNotification: true,
    });

    state.dismissClassificationNotification();

    const newState = useWoznyStore.getState();
    expect(newState.showClassificationNotification).toBe(false);
  });

  it('should open classification settings', () => {
    const state = useWoznyStore.getState();
    
    // Set up state with notification showing
    useWoznyStore.setState({
      showClassificationNotification: true,
      showClassificationDialog: false,
    });

    state.openClassificationSettings();

    const newState = useWoznyStore.getState();
    expect(newState.showClassificationNotification).toBe(false);
    expect(newState.showClassificationDialog).toBe(true);
  });

  it('should confirm classification with user-selected type', () => {
    const state = useWoznyStore.getState();
    
    // Set up state with existing classification
    useWoznyStore.setState({
      fileName: 'test.csv',
      schemaClassification: {
        dataType: 'CUSTOMER' as any,
        confidence: 75,
        indicators: [],
        detectionMode: 'AGGRESSIVE' as any,
        timestamp: Date.now(),
        source: 'auto',
      },
      showClassificationDialog: true,
    });

    state.confirmClassification('TRANSACTION' as any);

    const newState = useWoznyStore.getState();
    expect(newState.schemaClassification?.dataType).toBe('TRANSACTION');
    expect(newState.schemaClassification?.detectionMode).toBe('CONSERVATIVE');
    expect(newState.schemaClassification?.source).toBe('user-confirmed');
    expect(newState.showClassificationDialog).toBe(false);
    expect(newState.showClassificationNotification).toBe(true);
  });
});
