import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { UploadView } from './UploadView';
import { useWoznyStore } from '@/lib/store/useWoznyStore';
import { parseCsvFile } from '../utils/parser';
import { DataType, DuplicateDetectionMode } from '@/lib/schema-classifier';

// Mock dependencies
vi.mock('../utils/parser');
vi.mock('@/lib/store/useWoznyStore');

describe('UploadView - Classification Integration', () => {
  const mockSetCsvData = vi.fn();
  const mockConfirmClassification = vi.fn();
  const mockDismissClassificationNotification = vi.fn();
  const mockOpenClassificationSettings = vi.fn();

  const mockStoreState = {
    setCsvData: mockSetCsvData,
    schemaClassification: null,
    showClassificationNotification: false,
    showClassificationDialog: false,
    confirmClassification: mockConfirmClassification,
    dismissClassificationNotification: mockDismissClassificationNotification,
    openClassificationSettings: mockOpenClassificationSettings,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useWoznyStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) =>
      selector(mockStoreState)
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Upload Flow', () => {
    it('renders upload interface', () => {
      render(<UploadView />);
      
      expect(screen.getByText('Wozny v3')).toBeInTheDocument();
      expect(screen.getByText('Drop your CSV here')).toBeInTheDocument();
    });

    it('handles file upload successfully', async () => {
      const mockData = [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Smith', email: 'jane@example.com' },
      ];
      const mockColumns = ['name', 'email'];

      (parseCsvFile as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockData,
        columns: mockColumns,
      });

      render(<UploadView />);

      const file = new File(['name,email\nJohn,john@example.com'], 'test.csv', {
        type: 'text/csv',
      });
      const input = document.getElementById('file-upload') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockSetCsvData).toHaveBeenCalledWith('test.csv', mockData, mockColumns);
      });
    });

    it('shows error for non-CSV files', async () => {
      render(<UploadView />);

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const input = document.getElementById('file-upload') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument();
      });
    });

    it('shows error for files exceeding 5000 rows', async () => {
      const largeData = Array.from({ length: 5001 }, (_, i) => ({
        id: String(i),
        name: `User ${i}`,
      }));

      (parseCsvFile as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: largeData,
        columns: ['id', 'name'],
      });

      render(<UploadView />);

      const file = new File(['id,name\n1,User1'], 'large.csv', { type: 'text/csv' });
      const input = document.getElementById('file-upload') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/File too large/i)).toBeInTheDocument();
      });
    });
  });

  describe('High Confidence Classification - Notification', () => {
    it('shows notification for high confidence auto-classification', () => {
      const highConfidenceClassification = {
        dataType: DataType.CUSTOMER,
        confidence: 95,
        indicators: [
          { columnName: 'email', pattern: 'email', score: 10 },
          { columnName: 'name', pattern: 'name', score: 8 },
        ],
        detectionMode: DuplicateDetectionMode.AGGRESSIVE,
        timestamp: Date.now(),
        source: 'auto' as const,
      };

      (useWoznyStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) =>
        selector({
          ...mockStoreState,
          schemaClassification: highConfidenceClassification,
          showClassificationNotification: true,
        })
      );

      render(<UploadView />);

      expect(screen.getByText(/Customer \/ Contact Data/i)).toBeInTheDocument();
      expect(screen.getByText(/95% confidence/i)).toBeInTheDocument();
    });

    it('dismisses notification when close button clicked', () => {
      const classification = {
        dataType: DataType.TRANSACTION,
        confidence: 88,
        indicators: [],
        detectionMode: DuplicateDetectionMode.CONSERVATIVE,
        timestamp: Date.now(),
        source: 'auto' as const,
      };

      (useWoznyStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) =>
        selector({
          ...mockStoreState,
          schemaClassification: classification,
          showClassificationNotification: true,
        })
      );

      render(<UploadView />);

      const dismissButton = screen.getByLabelText(/Dismiss notification/i);
      fireEvent.click(dismissButton);

      expect(mockDismissClassificationNotification).toHaveBeenCalled();
    });

    it('opens settings dialog when Change Settings clicked', () => {
      const classification = {
        dataType: DataType.INVENTORY,
        confidence: 92,
        indicators: [],
        detectionMode: DuplicateDetectionMode.CONSERVATIVE,
        timestamp: Date.now(),
        source: 'auto' as const,
      };

      (useWoznyStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) =>
        selector({
          ...mockStoreState,
          schemaClassification: classification,
          showClassificationNotification: true,
        })
      );

      render(<UploadView />);

      const settingsButton = screen.getByText(/Change Settings/i);
      fireEvent.click(settingsButton);

      expect(mockOpenClassificationSettings).toHaveBeenCalled();
    });
  });

  describe('Low Confidence Classification - Dialog', () => {
    it('shows confirmation dialog for low confidence classification', () => {
      const lowConfidenceClassification = {
        dataType: DataType.TIME_SERIES,
        confidence: 65,
        indicators: [
          { columnName: 'timestamp', pattern: 'timestamp', score: 5 },
        ],
        detectionMode: DuplicateDetectionMode.VERY_CONSERVATIVE,
        timestamp: Date.now(),
        source: 'auto' as const,
      };

      (useWoznyStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) =>
        selector({
          ...mockStoreState,
          schemaClassification: lowConfidenceClassification,
          showClassificationDialog: true,
        })
      );

      render(<UploadView />);

      expect(screen.getByText(/Confirm Data Type/i)).toBeInTheDocument();
      expect(screen.getByText(/65% confidence/i)).toBeInTheDocument();
      // Use getAllByText since the text appears multiple times
      const elements = screen.getAllByText(/Time-Series \/ Metrics Data/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('confirms suggested type when Yes button clicked', () => {
      const classification = {
        dataType: DataType.CUSTOMER,
        confidence: 75,
        indicators: [],
        detectionMode: DuplicateDetectionMode.AGGRESSIVE,
        timestamp: Date.now(),
        source: 'auto' as const,
      };

      (useWoznyStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) =>
        selector({
          ...mockStoreState,
          schemaClassification: classification,
          showClassificationDialog: true,
        })
      );

      render(<UploadView />);

      const confirmButton = screen.getByText(/Yes, Customer \/ Contact Data/i);
      fireEvent.click(confirmButton);

      expect(mockConfirmClassification).toHaveBeenCalledWith(DataType.CUSTOMER);
    });

    it('allows selecting alternative data type', () => {
      const classification = {
        dataType: DataType.CUSTOMER,
        confidence: 70,
        indicators: [],
        detectionMode: DuplicateDetectionMode.AGGRESSIVE,
        timestamp: Date.now(),
        source: 'auto' as const,
      };

      (useWoznyStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) =>
        selector({
          ...mockStoreState,
          schemaClassification: classification,
          showClassificationDialog: true,
        })
      );

      render(<UploadView />);

      // Click "Show All Options"
      const showAllButton = screen.getByText(/Show All Options/i);
      fireEvent.click(showAllButton);

      // Select Transaction type
      const transactionRadio = screen.getByLabelText(/Transaction \/ Event Data/i);
      fireEvent.click(transactionRadio);

      // Confirm selection
      const confirmButton = screen.getByRole('button', { name: /^Confirm$/i });
      fireEvent.click(confirmButton);

      expect(mockConfirmClassification).toHaveBeenCalledWith(DataType.TRANSACTION);
    });

    it('cancels dialog when Cancel button clicked', () => {
      const classification = {
        dataType: DataType.INVENTORY,
        confidence: 68,
        indicators: [],
        detectionMode: DuplicateDetectionMode.CONSERVATIVE,
        timestamp: Date.now(),
        source: 'auto' as const,
      };

      (useWoznyStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) =>
        selector({
          ...mockStoreState,
          schemaClassification: classification,
          showClassificationDialog: true,
        })
      );

      render(<UploadView />);

      const cancelButton = screen.getByText(/Cancel/i);
      fireEvent.click(cancelButton);

      expect(mockDismissClassificationNotification).toHaveBeenCalled();
    });
  });

  describe('Stored Classification', () => {
    it('shows notification for stored classification', () => {
      const storedClassification = {
        dataType: DataType.TRANSACTION,
        confidence: 90,
        indicators: [
          { columnName: 'order_id', pattern: 'id', score: 10 },
        ],
        detectionMode: DuplicateDetectionMode.CONSERVATIVE,
        timestamp: Date.now() - 86400000, // 1 day ago
        source: 'stored' as const,
      };

      (useWoznyStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) =>
        selector({
          ...mockStoreState,
          schemaClassification: storedClassification,
          showClassificationNotification: true,
        })
      );

      render(<UploadView />);

      expect(screen.getByText(/Using saved classification/i)).toBeInTheDocument();
      expect(screen.getByText(/Transaction \/ Event Data/i)).toBeInTheDocument();
    });
  });

  describe('User-Confirmed Classification', () => {
    it('shows notification for user-confirmed classification', () => {
      const userConfirmedClassification = {
        dataType: DataType.INVENTORY,
        confidence: 85,
        indicators: [],
        detectionMode: DuplicateDetectionMode.CONSERVATIVE,
        timestamp: Date.now(),
        source: 'user-confirmed' as const,
      };

      (useWoznyStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) =>
        selector({
          ...mockStoreState,
          schemaClassification: userConfirmedClassification,
          showClassificationNotification: true,
        })
      );

      render(<UploadView />);

      expect(screen.getByText(/User confirmed/i)).toBeInTheDocument();
      expect(screen.getByText(/Inventory \/ Catalog Data/i)).toBeInTheDocument();
    });
  });

  describe('Detection Mode Display', () => {
    it('shows correct detection mode for each data type', () => {
      const testCases = [
        {
          dataType: DataType.CUSTOMER,
          expectedMode: /Aggressive \(matches similar names\)/i,
        },
        {
          dataType: DataType.TRANSACTION,
          expectedMode: /Conservative \(exact matches only\)/i,
        },
        {
          dataType: DataType.INVENTORY,
          expectedMode: /Conservative \(exact matches only\)/i,
        },
        {
          dataType: DataType.TIME_SERIES,
          expectedMode: /Very Conservative \(time \+ metric\)/i,
        },
      ];

      testCases.forEach(({ dataType, expectedMode }) => {
        const classification = {
          dataType,
          confidence: 90,
          indicators: [],
          detectionMode: 
            dataType === DataType.CUSTOMER
              ? DuplicateDetectionMode.AGGRESSIVE
              : dataType === DataType.TIME_SERIES
              ? DuplicateDetectionMode.VERY_CONSERVATIVE
              : DuplicateDetectionMode.CONSERVATIVE,
          timestamp: Date.now(),
          source: 'auto' as const,
        };

        (useWoznyStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) =>
          selector({
            ...mockStoreState,
            schemaClassification: classification,
            showClassificationNotification: true,
          })
        );

        const { unmount } = render(<UploadView />);

        expect(screen.getByText(expectedMode)).toBeInTheDocument();

        unmount();
      });
    });
  });

  describe('Drag and Drop', () => {
    it('handles drag and drop file upload', async () => {
      const mockData = [{ id: '1', name: 'Test' }];
      const mockColumns = ['id', 'name'];

      (parseCsvFile as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockData,
        columns: mockColumns,
      });

      render(<UploadView />);

      const dropZone = screen.getByText(/Drop your CSV here/i).closest('div');
      expect(dropZone).toBeInTheDocument();

      const file = new File(['id,name\n1,Test'], 'test.csv', { type: 'text/csv' });
      const dataTransfer = {
        files: [file],
        types: ['Files'],
      };

      fireEvent.dragOver(dropZone!, { dataTransfer });
      fireEvent.drop(dropZone!, { dataTransfer });

      await waitFor(() => {
        expect(mockSetCsvData).toHaveBeenCalledWith('test.csv', mockData, mockColumns);
      });
    });
  });

  describe('Integration - Complete Workflow', () => {
    it('completes full workflow: upload → low confidence → user confirms → notification shown', async () => {
      // Step 1: Initial render
      const { rerender } = render(<UploadView />);

      // Step 2: Upload file
      const mockData = [
        { timestamp: '2024-01-01', value: '100' },
        { timestamp: '2024-01-02', value: '200' },
      ];
      const mockColumns = ['timestamp', 'value'];

      (parseCsvFile as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockData,
        columns: mockColumns,
      });

      const file = new File(['timestamp,value\n2024-01-01,100'], 'metrics.csv', {
        type: 'text/csv',
      });
      const input = document.getElementById('file-upload') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockSetCsvData).toHaveBeenCalled();
      });

      // Step 3: Show low confidence dialog
      const lowConfidenceClassification = {
        dataType: DataType.TIME_SERIES,
        confidence: 72,
        indicators: [{ columnName: 'timestamp', pattern: 'timestamp', score: 5 }],
        detectionMode: DuplicateDetectionMode.VERY_CONSERVATIVE,
        timestamp: Date.now(),
        source: 'auto' as const,
      };

      (useWoznyStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) =>
        selector({
          ...mockStoreState,
          schemaClassification: lowConfidenceClassification,
          showClassificationDialog: true,
        })
      );

      rerender(<UploadView />);

      expect(screen.getByText(/Confirm Data Type/i)).toBeInTheDocument();

      // Step 4: User confirms
      const confirmButton = screen.getByText(/Yes, Time-Series \/ Metrics Data/i);
      fireEvent.click(confirmButton);

      expect(mockConfirmClassification).toHaveBeenCalledWith(DataType.TIME_SERIES);

      // Step 5: Show notification after confirmation
      (useWoznyStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) =>
        selector({
          ...mockStoreState,
          schemaClassification: {
            ...lowConfidenceClassification,
            source: 'user-confirmed',
          },
          showClassificationDialog: false,
          showClassificationNotification: true,
        })
      );

      rerender(<UploadView />);

      expect(screen.getByText(/User confirmed/i)).toBeInTheDocument();
      expect(screen.getByText(/Time-Series \/ Metrics Data/i)).toBeInTheDocument();
    });
  });
});
