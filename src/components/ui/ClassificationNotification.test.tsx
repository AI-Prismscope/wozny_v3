import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClassificationNotification } from './ClassificationNotification';
import { DataType, DuplicateDetectionMode, ClassificationResult } from '@/lib/schema-classifier';

describe('ClassificationNotification', () => {
  let mockOnChangeSettings: () => void;
  let mockOnDismiss: () => void;
  let mockResult: ClassificationResult;

  beforeEach(() => {
    mockOnChangeSettings = vi.fn();
    mockOnDismiss = vi.fn();
    mockResult = {
      dataType: DataType.CUSTOMER,
      confidence: 85,
      indicators: [
        { columnName: 'email', pattern: 'email', dataType: DataType.CUSTOMER, score: 10 },
        { columnName: 'phone', pattern: 'phone', dataType: DataType.CUSTOMER, score: 10 },
        { columnName: 'name', pattern: 'name', dataType: DataType.CUSTOMER, score: 5 }
      ],
      detectionMode: DuplicateDetectionMode.AGGRESSIVE,
      timestamp: Date.now(),
      source: 'auto'
    };

    // Mock timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should render with customer data type', () => {
    render(
      <ClassificationNotification
        result={mockResult}
        onChangeSettings={mockOnChangeSettings}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Customer / Contact Data')).toBeInTheDocument();
    expect(screen.getByText(/85% confidence/)).toBeInTheDocument();
    expect(screen.getByText(/Aggressive \(matches similar names\)/)).toBeInTheDocument();
  });

  it('should render with transaction data type', () => {
    mockResult.dataType = DataType.TRANSACTION;
    mockResult.detectionMode = DuplicateDetectionMode.CONSERVATIVE;

    render(
      <ClassificationNotification
        result={mockResult}
        onChangeSettings={mockOnChangeSettings}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Transaction / Event Data')).toBeInTheDocument();
    expect(screen.getByText(/Conservative \(exact matches only\)/)).toBeInTheDocument();
  });

  it('should render with inventory data type', () => {
    mockResult.dataType = DataType.INVENTORY;
    mockResult.detectionMode = DuplicateDetectionMode.CONSERVATIVE;

    render(
      <ClassificationNotification
        result={mockResult}
        onChangeSettings={mockOnChangeSettings}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Inventory / Catalog Data')).toBeInTheDocument();
  });

  it('should render with time-series data type', () => {
    mockResult.dataType = DataType.TIME_SERIES;
    mockResult.detectionMode = DuplicateDetectionMode.VERY_CONSERVATIVE;

    render(
      <ClassificationNotification
        result={mockResult}
        onChangeSettings={mockOnChangeSettings}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Time-Series / Metrics Data')).toBeInTheDocument();
    expect(screen.getByText(/Very Conservative \(time \+ metric\)/)).toBeInTheDocument();
  });

  it('should show source label for auto-detected', () => {
    mockResult.source = 'auto';

    render(
      <ClassificationNotification
        result={mockResult}
        onChangeSettings={mockOnChangeSettings}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText(/Auto-detected/)).toBeInTheDocument();
  });

  it('should show source label for stored classification', () => {
    mockResult.source = 'stored';

    render(
      <ClassificationNotification
        result={mockResult}
        onChangeSettings={mockOnChangeSettings}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText(/Using saved classification/)).toBeInTheDocument();
  });

  it('should show source label for user-confirmed', () => {
    mockResult.source = 'user-confirmed';

    render(
      <ClassificationNotification
        result={mockResult}
        onChangeSettings={mockOnChangeSettings}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText(/User confirmed/)).toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    render(
      <ClassificationNotification
        result={mockResult}
        onChangeSettings={mockOnChangeSettings}
        onDismiss={mockOnDismiss}
      />
    );

    const dismissButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(dismissButton);

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('should call onChangeSettings when change settings button is clicked', () => {
    render(
      <ClassificationNotification
        result={mockResult}
        onChangeSettings={mockOnChangeSettings}
        onDismiss={mockOnDismiss}
      />
    );

    const changeButton = screen.getByText('Change Settings');
    fireEvent.click(changeButton);

    expect(mockOnChangeSettings).toHaveBeenCalledTimes(1);
  });

  it('should auto-dismiss after 5 seconds', async () => {
    render(
      <ClassificationNotification
        result={mockResult}
        onChangeSettings={mockOnChangeSettings}
        onDismiss={mockOnDismiss}
      />
    );

    expect(mockOnDismiss).not.toHaveBeenCalled();

    // Fast-forward 5 seconds
    vi.advanceTimersByTime(5000);

    // Should have been called after timer expires
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('should NOT auto-dismiss when hovered', async () => {
    const { container } = render(
      <ClassificationNotification
        result={mockResult}
        onChangeSettings={mockOnChangeSettings}
        onDismiss={mockOnDismiss}
      />
    );

    const notification = container.firstChild as HTMLElement;

    // Hover over notification
    fireEvent.mouseEnter(notification);

    // Fast-forward 5 seconds
    vi.advanceTimersByTime(5000);

    // Should not dismiss while hovered
    expect(mockOnDismiss).not.toHaveBeenCalled();

    // Mouse leave
    fireEvent.mouseLeave(notification);

    // Fast-forward another 5 seconds
    vi.advanceTimersByTime(5000);

    // Should dismiss after mouse leave
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('should show column indicators button when indicators exist', () => {
    render(
      <ClassificationNotification
        result={mockResult}
        onChangeSettings={mockOnChangeSettings}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Why this classification?')).toBeInTheDocument();
  });

  it('should show column indicators on hover', () => {
    render(
      <ClassificationNotification
        result={mockResult}
        onChangeSettings={mockOnChangeSettings}
        onDismiss={mockOnDismiss}
      />
    );

    const indicatorButton = screen.getByText('Why this classification?');
    fireEvent.mouseEnter(indicatorButton);

    expect(screen.getByText('Key columns detected:')).toBeInTheDocument();
    expect(screen.getByText('email')).toBeInTheDocument();
    expect(screen.getByText('phone')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
  });

  it('should hide column indicators on mouse leave', () => {
    render(
      <ClassificationNotification
        result={mockResult}
        onChangeSettings={mockOnChangeSettings}
        onDismiss={mockOnDismiss}
      />
    );

    const indicatorButton = screen.getByText('Why this classification?');
    
    // Show indicators
    fireEvent.mouseEnter(indicatorButton);
    expect(screen.getByText('Key columns detected:')).toBeInTheDocument();

    // Hide indicators
    fireEvent.mouseLeave(indicatorButton);
    expect(screen.queryByText('Key columns detected:')).not.toBeInTheDocument();
  });

  it('should handle empty indicators array', () => {
    mockResult.indicators = [];

    render(
      <ClassificationNotification
        result={mockResult}
        onChangeSettings={mockOnChangeSettings}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.queryByText('Why this classification?')).not.toBeInTheDocument();
  });

  it('should limit indicators to top 3', () => {
    mockResult.indicators = [
      { columnName: 'col1', pattern: 'pattern1', dataType: DataType.CUSTOMER, score: 10 },
      { columnName: 'col2', pattern: 'pattern2', dataType: DataType.CUSTOMER, score: 10 },
      { columnName: 'col3', pattern: 'pattern3', dataType: DataType.CUSTOMER, score: 10 },
      { columnName: 'col4', pattern: 'pattern4', dataType: DataType.CUSTOMER, score: 10 },
      { columnName: 'col5', pattern: 'pattern5', dataType: DataType.CUSTOMER, score: 10 }
    ];

    render(
      <ClassificationNotification
        result={mockResult}
        onChangeSettings={mockOnChangeSettings}
        onDismiss={mockOnDismiss}
      />
    );

    const indicatorButton = screen.getByText('Why this classification?');
    fireEvent.mouseEnter(indicatorButton);

    expect(screen.getByText('col1')).toBeInTheDocument();
    expect(screen.getByText('col2')).toBeInTheDocument();
    expect(screen.getByText('col3')).toBeInTheDocument();
    expect(screen.queryByText('col4')).not.toBeInTheDocument();
    expect(screen.queryByText('col5')).not.toBeInTheDocument();
  });
});
