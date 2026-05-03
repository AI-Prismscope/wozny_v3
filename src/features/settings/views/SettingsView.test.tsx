import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsView } from './SettingsView';
import {
  getAllStoredClassifications,
  clearStoredClassification,
  clearAllStoredClassifications,
  storeClassification,
  DataType,
  DuplicateDetectionMode,
  StoredClassification,
} from '@/lib/schema-classifier';

// Mock the schema-classifier module
vi.mock('@/lib/schema-classifier', async () => {
  const actual = await vi.importActual('@/lib/schema-classifier');
  return {
    ...actual,
    getAllStoredClassifications: vi.fn(),
    clearStoredClassification: vi.fn(),
    clearAllStoredClassifications: vi.fn(),
    storeClassification: vi.fn(),
  };
});

describe('SettingsView', () => {
  const mockClassifications: StoredClassification[] = [
    {
      fileName: 'customers.csv',
      dataType: DataType.CUSTOMER,
      confidence: 95,
      indicators: [
        { columnName: 'email', pattern: 'email', dataType: DataType.CUSTOMER, score: 10 },
        { columnName: 'name', pattern: 'name', dataType: DataType.CUSTOMER, score: 8 },
      ],
      detectionMode: DuplicateDetectionMode.AGGRESSIVE,
      timestamp: Date.now() - 3600000, // 1 hour ago
      userConfirmed: true,
    },
    {
      fileName: 'orders.csv',
      dataType: DataType.TRANSACTION,
      confidence: 88,
      indicators: [
        { columnName: 'order_id', pattern: 'id', dataType: DataType.TRANSACTION, score: 10 },
      ],
      detectionMode: DuplicateDetectionMode.CONSERVATIVE,
      timestamp: Date.now() - 86400000, // 1 day ago
      userConfirmed: false,
    },
    {
      fileName: 'products.csv',
      dataType: DataType.INVENTORY,
      confidence: 92,
      indicators: [
        { columnName: 'sku', pattern: 'sku', dataType: DataType.INVENTORY, score: 10 },
      ],
      detectionMode: DuplicateDetectionMode.CONSERVATIVE,
      timestamp: Date.now() - 172800000, // 2 days ago
      userConfirmed: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (getAllStoredClassifications as ReturnType<typeof vi.fn>).mockReturnValue(
      mockClassifications
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Render', () => {
    it('renders settings header', () => {
      render(<SettingsView />);

      expect(screen.getByText('Classification Settings')).toBeInTheDocument();
      expect(
        screen.getByText('Manage stored schema classifications for your CSV files')
      ).toBeInTheDocument();
    });

    it('displays statistics correctly', () => {
      render(<SettingsView />);

      // Total classifications
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Total Classifications')).toBeInTheDocument();

      // User confirmed count
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('User Confirmed')).toBeInTheDocument();

      // Average confidence: (95 + 88 + 92) / 3 = 92
      expect(screen.getByText('92%')).toBeInTheDocument();
      expect(screen.getByText('Avg. Confidence')).toBeInTheDocument();
    });

    it('displays all classifications', () => {
      render(<SettingsView />);

      expect(screen.getByText('customers.csv')).toBeInTheDocument();
      expect(screen.getByText('orders.csv')).toBeInTheDocument();
      expect(screen.getByText('products.csv')).toBeInTheDocument();
    });

    it('shows data type labels correctly', () => {
      render(<SettingsView />);

      expect(screen.getByText('Customer / Contact')).toBeInTheDocument();
      expect(screen.getByText('Transaction / Event')).toBeInTheDocument();
      expect(screen.getByText('Inventory / Catalog')).toBeInTheDocument();
    });

    it('shows confidence percentages', () => {
      render(<SettingsView />);

      expect(screen.getByText('95% confidence')).toBeInTheDocument();
      expect(screen.getByText('88% confidence')).toBeInTheDocument();
      expect(screen.getByText('92% confidence')).toBeInTheDocument();
    });

    it('shows confirmed badge for user-confirmed classifications', () => {
      render(<SettingsView />);

      const confirmedBadges = screen.getAllByText('Confirmed');
      expect(confirmedBadges).toHaveLength(1);
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no classifications exist', () => {
      (getAllStoredClassifications as ReturnType<typeof vi.fn>).mockReturnValue([]);

      render(<SettingsView />);

      expect(screen.getByText('No Classifications Yet')).toBeInTheDocument();
      expect(
        screen.getByText(/Upload a CSV file to automatically classify/i)
      ).toBeInTheDocument();
    });

    it('does not show action buttons when empty', () => {
      (getAllStoredClassifications as ReturnType<typeof vi.fn>).mockReturnValue([]);

      render(<SettingsView />);

      expect(screen.queryByText('Export All')).not.toBeInTheDocument();
      expect(screen.queryByText('Clear All')).not.toBeInTheDocument();
    });
  });

  describe('Delete Classification', () => {
    it('opens delete confirmation dialog when delete button clicked', () => {
      render(<SettingsView />);

      const deleteButtons = screen.getAllByTitle('Delete classification');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText('Delete Classification')).toBeInTheDocument();
      // Use getAllByText since the filename appears in both the list and the dialog
      const fileNames = screen.getAllByText(/customers.csv/);
      expect(fileNames.length).toBeGreaterThan(1);
    });

    it('deletes classification when confirmed', async () => {
      render(<SettingsView />);

      // Click delete button
      const deleteButtons = screen.getAllByTitle('Delete classification');
      fireEvent.click(deleteButtons[0]);

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /^Delete$/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(clearStoredClassification).toHaveBeenCalledWith('customers.csv');
      });
    });

    it('cancels deletion when cancel button clicked', () => {
      render(<SettingsView />);

      // Click delete button
      const deleteButtons = screen.getAllByTitle('Delete classification');
      fireEvent.click(deleteButtons[0]);

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(clearStoredClassification).not.toHaveBeenCalled();
      expect(screen.queryByText('Delete Classification')).not.toBeInTheDocument();
    });

    it('closes dialog when clicking backdrop', () => {
      render(<SettingsView />);

      // Click delete button
      const deleteButtons = screen.getAllByTitle('Delete classification');
      fireEvent.click(deleteButtons[0]);

      // Click backdrop
      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50');
      expect(backdrop).toBeInTheDocument();
      fireEvent.click(backdrop!);

      expect(screen.queryByText('Delete Classification')).not.toBeInTheDocument();
    });
  });

  describe('Edit Classification', () => {
    it('opens edit dialog when edit button clicked', () => {
      render(<SettingsView />);

      const editButtons = screen.getAllByTitle('Edit classification');
      fireEvent.click(editButtons[0]);

      expect(screen.getByText('Confirm Data Type')).toBeInTheDocument();
    });

    it('updates classification when new type selected', async () => {
      render(<SettingsView />);

      // Click edit button
      const editButtons = screen.getAllByTitle('Edit classification');
      fireEvent.click(editButtons[0]);

      // Show all options
      const showAllButton = screen.getByText('Show All Options');
      fireEvent.click(showAllButton);

      // Select Transaction type
      const transactionRadio = screen.getByLabelText(/Transaction \/ Event Data/i);
      fireEvent.click(transactionRadio);

      // Confirm
      const confirmButton = screen.getByRole('button', { name: /^Confirm$/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(storeClassification).toHaveBeenCalledWith(
          'customers.csv',
          expect.objectContaining({
            dataType: DataType.TRANSACTION,
            source: 'user-confirmed',
          }),
          true
        );
      });
    });

    it('cancels edit when cancel button clicked', () => {
      render(<SettingsView />);

      // Click edit button
      const editButtons = screen.getAllByTitle('Edit classification');
      fireEvent.click(editButtons[0]);

      // Click cancel
      const cancelButton = screen.getByText(/Cancel/i);
      fireEvent.click(cancelButton);

      expect(storeClassification).not.toHaveBeenCalled();
      expect(screen.queryByText('Confirm Data Type')).not.toBeInTheDocument();
    });
  });

  describe('Clear All Classifications', () => {
    it('opens clear all confirmation dialog', () => {
      render(<SettingsView />);

      const clearAllButton = screen.getByText('Clear All');
      fireEvent.click(clearAllButton);

      expect(screen.getByText('Clear All Classifications')).toBeInTheDocument();
      expect(screen.getByText(/delete all 3 stored classifications/i)).toBeInTheDocument();
    });

    it('clears all classifications when confirmed', async () => {
      render(<SettingsView />);

      // Click Clear All
      const clearAllButton = screen.getByText('Clear All');
      fireEvent.click(clearAllButton);

      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getByText('Clear All Classifications')).toBeInTheDocument();
      });

      // Find the confirm button in the dialog (the red one)
      const dialogButtons = screen.getAllByRole('button');
      const confirmButton = dialogButtons.find(
        (button) => button.textContent === 'Clear All' && button.className.includes('bg-red-600')
      );
      expect(confirmButton).toBeDefined();
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(clearAllStoredClassifications).toHaveBeenCalled();
      });
    });

    it('cancels clear all when cancel button clicked', () => {
      render(<SettingsView />);

      // Click Clear All
      const clearAllButton = screen.getByText('Clear All');
      fireEvent.click(clearAllButton);

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(clearAllStoredClassifications).not.toHaveBeenCalled();
      expect(screen.queryByText('Clear All Classifications')).not.toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('exports classifications as JSON', () => {
      // Mock URL.createObjectURL and related functions
      const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
      const mockRevokeObjectURL = vi.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      // Mock document.createElement and appendChild
      const mockClick = vi.fn();
      const mockAnchor = document.createElement('a');
      mockAnchor.click = mockClick;
      
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'a') {
          return mockAnchor;
        }
        return originalCreateElement(tagName);
      });

      render(<SettingsView />);

      const exportButton = screen.getByText('Export All');
      fireEvent.click(exportButton);

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('Timestamp Formatting', () => {
    it('formats recent timestamps correctly', () => {
      const recentClassifications: StoredClassification[] = [
        {
          ...mockClassifications[0],
          timestamp: Date.now() - 30000, // 30 seconds ago
        },
      ];

      (getAllStoredClassifications as ReturnType<typeof vi.fn>).mockReturnValue(
        recentClassifications
      );

      render(<SettingsView />);

      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('formats hour timestamps correctly', () => {
      const hourClassifications: StoredClassification[] = [
        {
          ...mockClassifications[0],
          timestamp: Date.now() - 7200000, // 2 hours ago
        },
      ];

      (getAllStoredClassifications as ReturnType<typeof vi.fn>).mockReturnValue(
        hourClassifications
      );

      render(<SettingsView />);

      expect(screen.getByText('2h ago')).toBeInTheDocument();
    });
  });

  describe('Storage Event Listener', () => {
    it('reloads classifications when storage changes', async () => {
      render(<SettingsView />);

      // Initial load
      expect(getAllStoredClassifications).toHaveBeenCalledTimes(1);

      // Simulate storage event
      const updatedClassifications = [...mockClassifications.slice(0, 2)];
      (getAllStoredClassifications as ReturnType<typeof vi.fn>).mockReturnValue(
        updatedClassifications
      );

      const storageEvent = new StorageEvent('storage', {
        key: 'wozny_schema_classifications',
      });
      window.dispatchEvent(storageEvent);

      await waitFor(() => {
        expect(getAllStoredClassifications).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Data Type Colors', () => {
    it('applies correct color classes for each data type', () => {
      render(<SettingsView />);

      const customerBadge = screen.getByText('Customer / Contact');
      expect(customerBadge).toHaveClass('bg-blue-100');

      const transactionBadge = screen.getByText('Transaction / Event');
      expect(transactionBadge).toHaveClass('bg-green-100');

      const inventoryBadge = screen.getByText('Inventory / Catalog');
      expect(inventoryBadge).toHaveClass('bg-purple-100');
    });
  });

  describe('Accessibility', () => {
    it('has proper button titles for screen readers', () => {
      render(<SettingsView />);

      const editButtons = screen.getAllByTitle('Edit classification');
      expect(editButtons.length).toBeGreaterThan(0);

      const deleteButtons = screen.getAllByTitle('Delete classification');
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it('has proper dialog structure', () => {
      render(<SettingsView />);

      const deleteButtons = screen.getAllByTitle('Delete classification');
      fireEvent.click(deleteButtons[0]);

      const dialog = screen.getByText('Delete Classification').closest('div');
      expect(dialog).toBeInTheDocument();
    });
  });
});
