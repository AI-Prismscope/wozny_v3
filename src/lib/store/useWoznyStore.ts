import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { findDuplicateGroups } from "../data-quality";
import { sortRows } from "../services/sorting";
import { 
  ClassificationResult, 
  classifySchema, 
  getStoredClassification, 
  storeClassification,
  mapDataTypeToDetectionMode,
  DataType,
} from "../schema-classifier";
import { 
  trackClassificationEvent, 
  AnalyticsEventType 
} from "../analytics";

export type RowData = Record<string, string>;

export interface WoznyState {
  // Data State
  rawRows: RowData[];
  rows: RowData[];
  columns: string[];
  fileName: string | null;

  // App State
  activeTab:
    | "upload"
    | "ask-wozny"
    | "analysis"
    | "report"
    | "workshop"
    | "diff"
    | "about"
    | "status"
    | "settings"
    | "analytics";

  // User Selection State
  userSelection: number[];
  showHiddenColumns: boolean;
  columnWidths: Record<string, number>;
  splittableColumns: Record<string, "ADDRESS" | "NAME" | "NONE">;
  sortConfig: Array<{ columnId: string; direction: "asc" | "desc" }>;

  // System Status State
  storageUsage: { used: number; quota: number; percent: number } | null;

  // Schema Classification State
  schemaClassification: ClassificationResult | null;
  showClassificationNotification: boolean;
  showClassificationDialog: boolean;

  // Actions
  setCsvData: (fileName: string, data: RowData[], columns: string[]) => void;
  setRows: (rows: RowData[]) => void;
  reset: () => void;
  setActiveTab: (tab: WoznyState["activeTab"]) => void;
  updateCell: (rowIndex: number, columnId: string, value: string) => void;
  removeRow: (rowIndex: number) => void;
  resolveDuplicates: () => void;
  toggleShowHiddenColumns: () => void;

  // Bulk Actions
  setUserSelection: (indices: number[]) => void;
  clearUserSelection: () => void;
  bulkUpdate: (indices: number[], columnId: string, value: string) => void;
  addColumn: (name: string, values: string[]) => void;

  // Address Split Action
  splitAddressColumn: (
    columnId: string,
  ) => Promise<{ success: number; fail: number }>;

  // Sort Action
  toggleSort: (columnId: string, isMultiSort?: boolean) => void;

  // System Actions
  checkStorage: () => Promise<void>;

  // Classification Actions
  confirmClassification: (dataType: DataType) => void;
  dismissClassificationNotification: () => void;
  openClassificationSettings: () => void;
}

import { calculateColumnWidths } from "../measure-utils";
import { getSplittableType } from "../split-utils";

export const useWoznyStore = create<WoznyState>()(
  immer((set) => ({
    rawRows: [],
    rows: [],
    columns: [],
    fileName: null,
    activeTab: "about",
    userSelection: [],
    showHiddenColumns: false,
    columnWidths: {},
    splittableColumns: {},
    sortConfig: [],
    storageUsage: null,
    schemaClassification: null,
    showClassificationNotification: false,
    showClassificationDialog: false,

    setCsvData: (fileName, data, columns) =>
      set((state) => {
        state.fileName = fileName;
        state.rawRows = data;
        state.rows = data.map((row, i) => ({
          ...row,
          __wozny_index: String(i),
        }));
        state.columns = columns;
        state.columnWidths = calculateColumnWidths(data, columns);

        const splitMap: Record<string, "ADDRESS" | "NAME" | "NONE"> = {};
        columns.forEach((col) => {
          const values = data.map((r) => r[col] || "");
          splitMap[col] = getSplittableType(values);
        });
        state.splittableColumns = splitMap;

        state.sortConfig = [];
        state.activeTab = "report";

        // Perform schema classification
        let classification: ClassificationResult | null = null;
        
        // Check for stored classification
        const stored = getStoredClassification(fileName);
        if (stored) {
          classification = {
            dataType: stored.dataType,
            confidence: stored.confidence,
            indicators: stored.indicators,
            detectionMode: stored.detectionMode,
            timestamp: stored.timestamp,
            source: 'stored',
          };
          state.schemaClassification = classification;
          state.showClassificationNotification = true;
          state.showClassificationDialog = false;
        } else {
          // Perform new classification
          classification = classifySchema(data, columns);
          state.schemaClassification = classification;
          
          if (classification && classification.confidence > 80) {
            // High confidence: auto-apply and show notification
            storeClassification(fileName, classification, false);
            state.showClassificationNotification = true;
            state.showClassificationDialog = false;
            
            // Track analytics event
            trackClassificationEvent(
              AnalyticsEventType.CLASSIFICATION_AUTO,
              classification.dataType,
              classification.confidence,
              classification.detectionMode,
              fileName
            );
          } else if (classification) {
            // Low confidence: show confirmation dialog
            state.showClassificationNotification = false;
            state.showClassificationDialog = true;
          }
        }

        // Run duplicate detection with appropriate mode
        if (classification) {
          const duplicateGroups = findDuplicateGroups(data, columns, classification.detectionMode);
          // Note: We don't auto-remove duplicates, just detect them
          // The user can use resolveDuplicates() if they want
        }
      }),

    setRows: (rows) =>
      set((state) => {
        state.rows = rows;
      }),

    reset: () =>
      set((state) => {
        state.rawRows = [];
        state.rows = [];
        state.columns = [];
        state.fileName = null;
        state.activeTab = "upload";
        state.userSelection = [];
        state.columnWidths = {};
        state.splittableColumns = {};
        state.sortConfig = [];
      }),

    setActiveTab: (tab) =>
      set((state) => {
        state.activeTab = tab;
      }),

    updateCell: (rowIndex, columnId, value) =>
      set((state) => {
        if (state.rows[rowIndex]) {
          state.rows[rowIndex][columnId] = value;
        }
      }),

    removeRow: (rowIndex) =>
      set((state) => {
        if (rowIndex >= 0 && rowIndex < state.rows.length) {
          state.rows.splice(rowIndex, 1);
        }
      }),

    resolveDuplicates: () =>
      set((state) => {
        const rowsToDelete = new Set<number>();
        // Use detection mode from classification if available, otherwise default to AGGRESSIVE
        const detectionMode = state.schemaClassification?.detectionMode;
        const duplicateGroups = findDuplicateGroups(state.rows, state.columns, detectionMode);

        duplicateGroups.forEach((group) => {
          for (let i = 1; i < group.length; i++) {
            rowsToDelete.add(group[i]);
          }
        });

        state.rows = state.rows.filter((_, idx) => !rowsToDelete.has(idx));
      }),

    toggleShowHiddenColumns: () =>
      set((state) => {
        state.showHiddenColumns = !state.showHiddenColumns;
      }),

    setUserSelection: (indices) =>
      set((state) => {
        state.userSelection = indices;
      }),

    clearUserSelection: () =>
      set((state) => {
        state.userSelection = [];
      }),

    bulkUpdate: (indices, columnId, value) =>
      set((state) => {
        indices.forEach((idx) => {
          if (state.rows[idx]) {
            state.rows[idx][columnId] = value;
          }
        });
      }),

    addColumn: (name, values) =>
      set((state) => {
        let finalName = name;
        let counter = 1;
        while (state.columns.includes(finalName)) {
          finalName = `${name} (${counter++})`;
        }
        state.columns.push(finalName);
        state.rows.forEach((row, i) => {
          row[finalName] = values[i] || "";
        });
        state.columnWidths = calculateColumnWidths(state.rows, state.columns);
        state.splittableColumns[finalName] = getSplittableType(values);
      }),

    splitAddressColumn: async (columnId) => {
      const { smartSplitColumn } = await import("../split-utils");
      let successCount = 0;
      let failCount = 0;

      set((state) => {
        const type = state.splittableColumns[columnId];
        if (type === "NONE") return;

        const {
          results,
          successCount: s,
          failCount: f,
        } = smartSplitColumn(state.rows, columnId, type);
        successCount = s;
        failCount = f;

        const newCols =
          type === "ADDRESS"
            ? ["Street", "City", "State", "Zip"].map(
                (suffix) => `${columnId}_${suffix}`,
              )
            : ["First", "Middle", "Last"].map(
                (suffix) => `${columnId}_${suffix}`,
              );

        newCols.forEach((newCol) => {
          if (!state.columns.includes(newCol)) state.columns.push(newCol);
        });

        state.rows.forEach((row, idx) => {
          const parsed = results[idx];
          if (parsed) {
            newCols.forEach((colName, colIdx) => {
              const keys = Object.keys(parsed);
              row[colName] =
                (parsed as unknown as Record<string, string>)[keys[colIdx]] ||
                "";
            });
          }
        });

        state.columnWidths = calculateColumnWidths(state.rows, state.columns);
        newCols.forEach((c) => {
          state.splittableColumns[c] = "NONE";
        });
      });

      return { success: successCount, fail: failCount };
    },

    toggleSort: (columnId, isMultiSort = false) =>
      set((state) => {
        const existingIndex = state.sortConfig.findIndex(c => c.columnId === columnId);
        
        if (isMultiSort) {
          // Multi-column mode: Add or update sort
          if (existingIndex >= 0) {
            // Column already in sort chain - toggle direction or remove
            const existing = state.sortConfig[existingIndex];
            if (existing.direction === 'asc') {
              existing.direction = 'desc';
            } else {
              // Remove from sort chain
              state.sortConfig.splice(existingIndex, 1);
            }
          } else {
            // Add new column to sort chain
            state.sortConfig.push({ columnId, direction: 'asc' });
          }
        } else {
          // Single-column mode: Replace all sorts
          if (existingIndex >= 0 && state.sortConfig.length === 1) {
            // Same column, toggle through: asc → desc → off
            const existing = state.sortConfig[0];
            if (existing.direction === 'asc') {
              existing.direction = 'desc';
            } else {
              // Remove sort (back to original order)
              state.sortConfig = [];
            }
          } else {
            // New column or switching from multi-sort: start fresh with asc
            state.sortConfig = [{ columnId, direction: 'asc' }];
          }
        }

        state.rows = sortRows(state.rows, state.sortConfig);
      }),

    checkStorage: async () => {
      if ("storage" in navigator && "estimate" in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          const used = estimate.usage || 0;
          const quota = estimate.quota || 1024 * 1024 * 1024;
          const percent = Math.round((used / quota) * 100);

          set((state) => {
            state.storageUsage = { used, quota, percent };
          });
        } catch (e) {
          console.error("Storage estimate failed", e);
        }
      }
    },

    confirmClassification: (dataType) =>
      set((state) => {
        if (!state.schemaClassification) return;

        // Determine if this is a change or confirmation
        const isChange = state.schemaClassification.dataType !== dataType;
        const eventType = isChange 
          ? AnalyticsEventType.CLASSIFICATION_CHANGED 
          : AnalyticsEventType.CLASSIFICATION_CONFIRMED;

        // Update classification with user-selected type
        const detectionMode = mapDataTypeToDetectionMode(dataType);
        state.schemaClassification = {
          ...state.schemaClassification,
          dataType,
          detectionMode,
          source: 'user-confirmed',
          timestamp: Date.now(),
        };

        // Store classification with userConfirmed=true
        if (state.fileName) {
          storeClassification(state.fileName, state.schemaClassification, true);
          
          // Track analytics event
          trackClassificationEvent(
            eventType,
            dataType,
            state.schemaClassification.confidence,
            detectionMode,
            state.fileName,
            isChange ? { previousType: state.schemaClassification.dataType } : undefined
          );
        }

        // Close dialog, show notification
        state.showClassificationDialog = false;
        state.showClassificationNotification = true;

        // Re-run duplicate detection with new mode
        const duplicateGroups = findDuplicateGroups(state.rows, state.columns, detectionMode);
        // Note: We don't auto-remove duplicates, just re-detect them
        // The user can still use resolveDuplicates() if they want
      }),

    dismissClassificationNotification: () =>
      set((state) => {
        state.showClassificationNotification = false;
      }),

    openClassificationSettings: () =>
      set((state) => {
        state.showClassificationNotification = false;
        state.showClassificationDialog = true;
      }),
  })),
);
