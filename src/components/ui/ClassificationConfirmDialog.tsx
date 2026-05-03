import React, { useState } from 'react';
import { X, HelpCircle, CheckCircle2 } from 'lucide-react';
import { DataType, DuplicateDetectionMode, ColumnIndicator } from '@/lib/schema-classifier';

interface ClassificationConfirmDialogProps {
  suggestedType: DataType;
  confidence: number;
  indicators: ColumnIndicator[];
  onConfirm: (dataType: DataType) => void;
  onCancel: () => void;
}

interface DataTypeOption {
  type: DataType;
  label: string;
  description: string;
  exampleColumns: string;
  detectionMode: string;
}

const DATA_TYPE_OPTIONS: DataTypeOption[] = [
  {
    type: DataType.CUSTOMER,
    label: 'Customer / Contact Data',
    description: 'Individual people or contacts with personal information',
    exampleColumns: 'name, email, phone, address',
    detectionMode: 'Aggressive (matches similar names)'
  },
  {
    type: DataType.TRANSACTION,
    label: 'Transaction / Event Data',
    description: 'Orders, purchases, or events that can repeat for the same customer',
    exampleColumns: 'order_id, date, customer_name, amount',
    detectionMode: 'Conservative (exact matches only)'
  },
  {
    type: DataType.INVENTORY,
    label: 'Inventory / Catalog Data',
    description: 'Products, items, or catalog entries with unique identifiers',
    exampleColumns: 'sku, product_id, category, price',
    detectionMode: 'Conservative (exact matches only)'
  },
  {
    type: DataType.TIME_SERIES,
    label: 'Time-Series / Metrics Data',
    description: 'Measurements or readings taken at different times',
    exampleColumns: 'timestamp, metric, value, sensor',
    detectionMode: 'Very Conservative (time + metric)'
  }
];

/**
 * Modal dialog for confirming or changing schema classification.
 * Shows suggested type with confidence and allows user to select alternative.
 */
export const ClassificationConfirmDialog: React.FC<ClassificationConfirmDialogProps> = ({
  suggestedType,
  confidence,
  indicators,
  onConfirm,
  onCancel
}) => {
  const [selectedType, setSelectedType] = useState<DataType>(suggestedType);
  const [showAllOptions, setShowAllOptions] = useState(false);

  const suggestedOption = DATA_TYPE_OPTIONS.find(opt => opt.type === suggestedType);
  const alternativeOptions = DATA_TYPE_OPTIONS.filter(opt => opt.type !== suggestedType);

  const handleConfirm = () => {
    onConfirm(selectedType);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      handleConfirm();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />

      {/* Dialog Panel */}
      <div className="relative bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-2xl w-full border border-neutral-200 dark:border-neutral-800 transform transition-all max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
            Confirm Data Type
          </h3>
          <button
            onClick={onCancel}
            className="text-neutral-400 hover:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {!showAllOptions ? (
            // Quick confirmation view
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
                  <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-2">
                    We detected this as <strong>{suggestedOption?.label}</strong> with{' '}
                    <strong>{confidence}% confidence</strong>.
                  </p>
                  {indicators.length > 0 && (
                    <div className="text-xs text-neutral-600 dark:text-neutral-400 mb-3">
                      <p className="font-medium mb-1">Based on columns:</p>
                      <div className="flex flex-wrap gap-2">
                        {indicators.slice(0, 3).map((indicator, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-md font-mono"
                          >
                            {indicator.columnName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Is this correct?
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleConfirm}
                  className="w-full px-4 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Yes, {suggestedOption?.label}
                </button>

                {alternativeOptions.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedType(alternativeOptions[0].type);
                      setShowAllOptions(true);
                    }}
                    className="w-full px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                  >
                    No, it's {alternativeOptions[0].label}
                  </button>
                )}

                <button
                  onClick={() => setShowAllOptions(true)}
                  className="w-full px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                >
                  Show All Options
                </button>
              </div>
            </div>
          ) : (
            // Full options view
            <div className="space-y-3">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                Select the data type that best describes your data:
              </p>

              {DATA_TYPE_OPTIONS.map((option) => (
                <label
                  key={option.type}
                  className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedType === option.type
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="dataType"
                      value={option.type}
                      checked={selectedType === option.type}
                      onChange={() => setSelectedType(option.type)}
                      className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                          {option.label}
                        </span>
                        {option.type === suggestedType && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                            Suggested
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                        {option.description}
                      </p>
                      <div className="text-xs text-neutral-500 dark:text-neutral-500 space-y-1">
                        <p>
                          <span className="font-medium">Columns:</span> {option.exampleColumns}
                        </p>
                        <p>
                          <span className="font-medium">Duplicate Detection:</span>{' '}
                          {option.detectionMode}
                        </p>
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          {showAllOptions && (
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              Confirm
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
