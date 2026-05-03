import React, { useEffect, useState } from 'react';
import { Info, X, Settings } from 'lucide-react';
import { ClassificationResult, DataType, DuplicateDetectionMode } from '@/lib/schema-classifier';

interface ClassificationNotificationProps {
  result: ClassificationResult;
  onChangeSettings: () => void;
  onDismiss: () => void;
}

/**
 * Toast-style notification that displays auto-applied schema classification.
 * Shows data type, confidence, detection mode, and top column indicators.
 * Auto-dismisses after 5 seconds unless hovered.
 */
export const ClassificationNotification: React.FC<ClassificationNotificationProps> = ({
  result,
  onChangeSettings,
  onDismiss
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showIndicators, setShowIndicators] = useState(false);

  // Auto-dismiss after 5 seconds (unless hovered)
  useEffect(() => {
    if (isHovered) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);

    return () => clearTimeout(timer);
  }, [isHovered, onDismiss]);

  const getDataTypeLabel = (dataType: DataType): string => {
    switch (dataType) {
      case DataType.CUSTOMER:
        return 'Customer / Contact Data';
      case DataType.TRANSACTION:
        return 'Transaction / Event Data';
      case DataType.INVENTORY:
        return 'Inventory / Catalog Data';
      case DataType.TIME_SERIES:
        return 'Time-Series / Metrics Data';
      default:
        return 'Unknown Data Type';
    }
  };

  const getDetectionModeLabel = (mode: DuplicateDetectionMode): string => {
    switch (mode) {
      case DuplicateDetectionMode.AGGRESSIVE:
        return 'Aggressive (matches similar names)';
      case DuplicateDetectionMode.CONSERVATIVE:
        return 'Conservative (exact matches only)';
      case DuplicateDetectionMode.VERY_CONSERVATIVE:
        return 'Very Conservative (time + metric)';
      default:
        return 'Unknown Mode';
    }
  };

  const getSourceLabel = (source: ClassificationResult['source']): string => {
    switch (source) {
      case 'stored':
        return 'Using saved classification';
      case 'user-confirmed':
        return 'User confirmed';
      case 'auto':
      default:
        return 'Auto-detected';
    }
  };

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-in fade-in slide-in-from-top-2 duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-800 p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                {getDataTypeLabel(result.dataType)}
              </h4>
              <button
                onClick={onDismiss}
                className="text-neutral-400 hover:text-neutral-500 dark:hover:text-neutral-300 transition-colors flex-shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
              {getSourceLabel(result.source)} • {result.confidence}% confidence
            </p>

            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              Duplicate Detection: {getDetectionModeLabel(result.detectionMode)}
            </p>

            {/* Column Indicators (shown on hover or click) */}
            {result.indicators.length > 0 && (
              <div className="mt-2 relative">
                <button
                  onClick={() => setShowIndicators(!showIndicators)}
                  onMouseEnter={() => setShowIndicators(true)}
                  onMouseLeave={() => setShowIndicators(false)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Info className="w-3 h-3" />
                  Why this classification?
                </button>

                {showIndicators && (
                  <div className="absolute top-full left-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-lg p-2 z-10 min-w-[200px]">
                    <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Key columns detected:
                    </p>
                    <ul className="text-xs text-neutral-600 dark:text-neutral-400 space-y-0.5">
                      {result.indicators.slice(0, 3).map((indicator, idx) => (
                        <li key={idx} className="flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-blue-500 flex-shrink-0" />
                          <span className="font-mono">{indicator.columnName}</span>
                          <span className="text-neutral-400">({indicator.pattern})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            onClick={onChangeSettings}
            className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" />
            Change Settings
          </button>
        </div>
      </div>
    </div>
  );
};
