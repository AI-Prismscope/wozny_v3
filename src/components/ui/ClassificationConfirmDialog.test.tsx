import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClassificationConfirmDialog } from './ClassificationConfirmDialog';
import { DataType, DuplicateDetectionMode, ColumnIndicator } from '@/lib/schema-classifier';

describe('ClassificationConfirmDialog', () => {
  let mockOnConfirm: (dataType: DataType) => void;
  let mockOnCancel: () => void;
  let mockIndicators: ColumnIndicator[];

  beforeEach(() => {
    mockOnConfirm = vi.fn();
    mockOnCancel = vi.fn();
    mockIndicators = [
      { columnName: 'email', pattern: 'email', dataType: DataType.CUSTOMER, score: 10 },
      { columnName: 'phone', pattern: 'phone', dataType: DataType.CUSTOMER, score: 10 },
      { columnName: 'name', pattern: 'name', dataType: DataType.CUSTOMER, score: 5 }
    ];
  });

  it('should render with suggested type and confidence', () => {
    render(
      <ClassificationConfirmDialog
        suggestedType={DataType.CUSTOMER}
        confidence={75}
        indicators={mockIndicators}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Check for the text in the description paragraph (not the button)
    expect(screen.getByText(/We detected this as/)).toBeInTheDocument();
    expect(screen.getByText(/75% confidence/)).toBeInTheDocument();
    // Verify the Yes button has the correct type
    expect(screen.getByText(/Yes, Customer \/ Contact Data/)).toBeInTheDocument();
  });

  it('should show column indicators in quick view', () => {
    render(
      <ClassificationConfirmDialog
        suggestedType={DataType.CUSTOMER}
        confidence={75}
        indicators={mockIndicators}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Based on columns:')).toBeInTheDocument();
    expect(screen.getByText('email')).toBeInTheDocument();
    expect(screen.getByText('phone')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
  });

  it('should limit indicators to top 3 in quick view', () => {
    const manyIndicators: ColumnIndicator[] = [
      { columnName: 'col1', pattern: 'pattern1', dataType: DataType.CUSTOMER, score: 10 },
      { columnName: 'col2', pattern: 'pattern2', dataType: DataType.CUSTOMER, score: 10 },
      { columnName: 'col3', pattern: 'pattern3', dataType: DataType.CUSTOMER, score: 10 },
      { columnName: 'col4', pattern: 'pattern4', dataType: DataType.CUSTOMER, score: 10 },
      { columnName: 'col5', pattern: 'pattern5', dataType: DataType.CUSTOMER, score: 10 }
    ];

    render(
      <ClassificationConfirmDialog
        suggestedType={DataType.CUSTOMER}
        confidence={75}
        indicators={manyIndicators}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('col1')).toBeInTheDocument();
    expect(screen.getByText('col2')).toBeInTheDocument();
    expect(screen.getByText('col3')).toBeInTheDocument();
    expect(screen.queryByText('col4')).not.toBeInTheDocument();
    expect(screen.queryByText('col5')).not.toBeInTheDocument();
  });

  it('should call onConfirm with suggested type when "Yes" button is clicked', () => {
    render(
      <ClassificationConfirmDialog
        suggestedType={DataType.CUSTOMER}
        confidence={75}
        indicators={mockIndicators}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const yesButton = screen.getByText(/Yes, Customer \/ Contact Data/);
    fireEvent.click(yesButton);

    expect(mockOnConfirm).toHaveBeenCalledWith(DataType.CUSTOMER);
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('should show all options when "No, it\'s [Alternative]" button is clicked', () => {
    render(
      <ClassificationConfirmDialog
        suggestedType={DataType.CUSTOMER}
        confidence={75}
        indicators={mockIndicators}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Initially in quick view
    expect(screen.getByText(/Is this correct?/)).toBeInTheDocument();

    // Click "No, it's Transaction"
    const noButton = screen.getByText(/No, it's Transaction \/ Event Data/);
    fireEvent.click(noButton);

    // Should now show all options
    expect(screen.getByText(/Select the data type that best describes your data:/)).toBeInTheDocument();
    expect(screen.getByText('Customer / Contact Data')).toBeInTheDocument();
    expect(screen.getByText('Transaction / Event Data')).toBeInTheDocument();
    expect(screen.getByText('Inventory / Catalog Data')).toBeInTheDocument();
    expect(screen.getByText('Time-Series / Metrics Data')).toBeInTheDocument();
  });

  it('should show all options when "Show All Options" button is clicked', () => {
    render(
      <ClassificationConfirmDialog
        suggestedType={DataType.CUSTOMER}
        confidence={75}
        indicators={mockIndicators}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const showAllButton = screen.getByText('Show All Options');
    fireEvent.click(showAllButton);

    expect(screen.getByText(/Select the data type that best describes your data:/)).toBeInTheDocument();
    expect(screen.getByText('Customer / Contact Data')).toBeInTheDocument();
    expect(screen.getByText('Transaction / Event Data')).toBeInTheDocument();
    expect(screen.getByText('Inventory / Catalog Data')).toBeInTheDocument();
    expect(screen.getByText('Time-Series / Metrics Data')).toBeInTheDocument();
  });

  it('should display all 4 data type options in expanded view', () => {
    render(
      <ClassificationConfirmDialog
        suggestedType={DataType.CUSTOMER}
        confidence={75}
        indicators={mockIndicators}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Expand to show all options
    fireEvent.click(screen.getByText('Show All Options'));

    // Verify all 4 options are present
    expect(screen.getByText('Customer / Contact Data')).toBeInTheDocument();
    expect(screen.getByText('Individual people or contacts with personal information')).toBeInTheDocument();
    expect(screen.getByText(/name, email, phone, address/)).toBeInTheDocument();

    expect(screen.getByText('Transaction / Event Data')).toBeInTheDocument();
    expect(screen.getByText('Orders, purchases, or events that can repeat for the same customer')).toBeInTheDocument();
    expect(screen.getByText(/order_id, date, customer_name, amount/)).toBeInTheDocument();

    expect(screen.getByText('Inventory / Catalog Data')).toBeInTheDocument();
    expect(screen.getByText('Products, items, or catalog entries with unique identifiers')).toBeInTheDocument();
    expect(screen.getByText(/sku, product_id, category, price/)).toBeInTheDocument();

    expect(screen.getByText('Time-Series / Metrics Data')).toBeInTheDocument();
    expect(screen.getByText('Measurements or readings taken at different times')).toBeInTheDocument();
    expect(screen.getByText(/timestamp, metric, value, sensor/)).toBeInTheDocument();
  });

  it('should show detection mode for each option in expanded view', () => {
    render(
      <ClassificationConfirmDialog
        suggestedType={DataType.CUSTOMER}
        confidence={75}
        indicators={mockIndicators}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Show All Options'));

    expect(screen.getByText(/Aggressive \(matches similar names\)/)).toBeInTheDocument();
    expect(screen.getAllByText(/Conservative \(exact matches only\)/).length).toBe(2); // Transaction and Inventory
    expect(screen.getByText(/Very Conservative \(time \+ metric\)/)).toBeInTheDocument();
  });

  it('should mark suggested type with "Suggested" badge in expanded view', () => {
    render(
      <ClassificationConfirmDialog
        suggestedType={DataType.TRANSACTION}
        confidence={75}
        indicators={mockIndicators}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Show All Options'));

    const suggestedBadge = screen.getByText('Suggested');
    expect(suggestedBadge).toBeInTheDocument();

    // Verify it's next to Transaction option
    const transactionOption = suggestedBadge.closest('label');
    expect(transactionOption).toHaveTextContent('Transaction / Event Data');
  });

  it('should allow radio button selection in expanded view', () => {
    render(
      <ClassificationConfirmDialog
        suggestedType={DataType.CUSTOMER}
        confidence={75}
        indicators={mockIndicators}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Show All Options'));

    // Initially, Customer should be selected (suggested type)
    const customerRadio = screen.getByRole('radio', { name: /Customer/ }) as HTMLInputElement;
    const transactionRadio = screen.getByRole('radio', { name: /Transaction/ }) as HTMLInputElement;

    expect(customerRadio.checked).toBe(true);
    expect(transactionRadio.checked).toBe(false);

    // Click Transaction radio
    fireEvent.click(transactionRadio);

    expect(customerRadio.checked).toBe(false);
    expect(transactionRadio.checked).toBe(true);
  });

  it('should call onConfirm with selected type when Confirm button is clicked in expanded view', () => {
    render(
      <ClassificationConfirmDialog
        suggestedType={DataType.CUSTOMER}
        confidence={75}
        indicators={mockIndicators}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Show All Options'));

    // Select Inventory
    const inventoryRadio = screen.getByRole('radio', { name: /Inventory/ });
    fireEvent.click(inventoryRadio);

    // Click Confirm
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledWith(DataType.INVENTORY);
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when Cancel button is clicked', () => {
    render(
      <ClassificationConfirmDialog
        suggestedType={DataType.CUSTOMER}
        confidence={75}
        indicators={mockIndicators}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('should call onCancel when close button (X) is clicked', () => {
    render(
      <ClassificationConfirmDialog
        suggestedType={DataType.CUSTOMER}
        confidence={75}
        indicators={mockIndicators}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const closeButton = screen.getByLabelText('Close dialog');
    fireEvent.click(closeButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when backdrop is clicked', () => {
    const { container } = render(
      <ClassificationConfirmDialog
        suggestedType={DataType.CUSTOMER}
        confidence={75}
        indicators={mockIndicators}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Find backdrop (first child of the root div)
    const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/50');
    expect(backdrop).toBeInTheDocument();

    fireEvent.click(backdrop!);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when Escape key is pressed', () => {
    const { container } = render(
      <ClassificationConfirmDialog
        suggestedType={DataType.CUSTOMER}
        confidence={75}
        indicators={mockIndicators}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const dialog = container.firstChild as HTMLElement;
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onConfirm when Enter key is pressed in quick view', () => {
    const { container } = render(
      <ClassificationConfirmDialog
        suggestedType={DataType.CUSTOMER}
        confidence={75}
        indicators={mockIndicators}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const dialog = container.firstChild as HTMLElement;
    fireEvent.keyDown(dialog, { key: 'Enter' });

    expect(mockOnConfirm).toHaveBeenCalledWith(DataType.CUSTOMER);
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('should NOT call onConfirm when Enter key is pressed with Shift in quick view', () => {
    const { container } = render(
      <ClassificationConfirmDialog
        suggestedType={DataType.CUSTOMER}
        confidence={75}
        indicators={mockIndicators}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const dialog = container.firstChild as HTMLElement;
    fireEvent.keyDown(dialog, { key: 'Enter', shiftKey: true });

    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('should handle empty indicators array', () => {
    render(
      <ClassificationConfirmDialog
        suggestedType={DataType.CUSTOMER}
        confidence={75}
        indicators={[]}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.queryByText('Based on columns:')).not.toBeInTheDocument();
  });

  it('should show Confirm button only in expanded view', () => {
    render(
      <ClassificationConfirmDialog
        suggestedType={DataType.CUSTOMER}
        confidence={75}
        indicators={mockIndicators}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // In quick view, no Confirm button (only Yes/No buttons)
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument();

    // Expand to show all options
    fireEvent.click(screen.getByText('Show All Options'));

    // Now Confirm button should be visible
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('should pre-select alternative type when "No, it\'s [Alternative]" is clicked', () => {
    render(
      <ClassificationConfirmDialog
        suggestedType={DataType.CUSTOMER}
        confidence={75}
        indicators={mockIndicators}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Click "No, it's Transaction"
    fireEvent.click(screen.getByText(/No, it's Transaction \/ Event Data/));

    // Transaction should be pre-selected
    const transactionRadio = screen.getByRole('radio', { name: /Transaction/ }) as HTMLInputElement;
    expect(transactionRadio.checked).toBe(true);
  });

  it('should render with Transaction as suggested type', () => {
    render(
      <ClassificationConfirmDialog
        suggestedType={DataType.TRANSACTION}
        confidence={70}
        indicators={mockIndicators}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Check for the text in the description paragraph (not the button)
    expect(screen.getByText(/We detected this as/)).toBeInTheDocument();
    expect(screen.getByText(/70% confidence/)).toBeInTheDocument();
    // Verify the Yes button has the correct type
    expect(screen.getByText(/Yes, Transaction \/ Event Data/)).toBeInTheDocument();
  });

  it('should render with Inventory as suggested type', () => {
    render(
      <ClassificationConfirmDialog
        suggestedType={DataType.INVENTORY}
        confidence={65}
        indicators={mockIndicators}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/We detected this as/)).toBeInTheDocument();
    expect(screen.getByText(/65% confidence/)).toBeInTheDocument();
    expect(screen.getByText(/Yes, Inventory \/ Catalog Data/)).toBeInTheDocument();
  });

  it('should render with Time-Series as suggested type', () => {
    render(
      <ClassificationConfirmDialog
        suggestedType={DataType.TIME_SERIES}
        confidence={60}
        indicators={mockIndicators}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/We detected this as/)).toBeInTheDocument();
    expect(screen.getByText(/60% confidence/)).toBeInTheDocument();
    expect(screen.getByText(/Yes, Time-Series \/ Metrics Data/)).toBeInTheDocument();
  });
});
