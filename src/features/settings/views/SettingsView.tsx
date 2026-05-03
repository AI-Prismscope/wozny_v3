'use client';

import React, { useState, useEffect } from 'react';
import {
  getAllStoredClassifications,
  clearStoredClassification,
  clearAllStoredClassifications,
  storeClassification,
  StoredClassification,
  ClassificationResult,
  DataType,
  mapDataTypeToDetectionMode,
} from '@/lib/schema-classifier';
import { Settings, Trash2, Edit2, Download, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { ClassificationConfirmDialog } from '@/components/ui/ClassificationConfirmDialog';

export const SettingsView = () => {
  const [classifications, setClassifications] = useState<StoredClassification[]>([]);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  // Load classifications on mount and when storage changes
  const loadClassifications = () => {
    const stored = getAllStoredClassifications();
    setClassifications(stored);
  };

  useEffect(() => {
    loadClassifications();

    // Listen for storage changes (e.g., from other tabs or components)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'wozny_schema_classifications') {
        loadClassifications();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleDelete = (fileName: string) => {
    clearStoredClassification(fileName);
    loadClassifications();
    setDeletingFile(null);
  };

  const handleClearAll = () => {
    clearAllStoredClassifications();
    loadClassifications();
    setShowClearAllConfirm(false);
  };

  const handleEdit = (classification: StoredClassification) => {
    setEditingFile(classification.fileName);
  };

  const handleEditConfirm = (dataType: DataType) => {
    if (!editingFile) return;

    const existing = classifications.find(c => c.fileName === editingFile);
    if (!existing) return;

    // Update classification with new data type
    const updated: ClassificationResult = {
      dataType,
      confidence: existing.confidence,
      indicators: existing.indicators,
      detectionMode: mapDataTypeToDetectionMode(dataType),
      timestamp: Date.now(),
      source: 'user-confirmed',
    };

    storeClassification(editingFile, updated, true);
    loadClassifications();
    setEditingFile(null);
  };

  const handleExport = () => {
    const data = {
      version: 1,
      exportDate: new Date().toISOString(),
      classifications: classifications,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wozny-classifications-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getDataTypeLabel = (dataType: DataType): string => {
    switch (dataType) {
      case DataType.CUSTOMER:
        return 'Customer / Contact';
      case DataType.TRANSACTION:
        return 'Transaction / Event';
      case DataType.INVENTORY:
        return 'Inventory / Catalog';
      case DataType.TIME_SERIES:
        return 'Time-Series / Metrics';
      default:
        return 'Unknown';
    }
  };

  const getDataTypeColor = (dataType: DataType): string => {
    switch (dataType) {
      case DataType.CUSTOMER:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case DataType.TRANSACTION:
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case DataType.INVENTORY:
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case DataType.TIME_SERIES:
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
      default:
        return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300';
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const editingClassification = classifications.find(c => c.fileName === editingFile);

  return (
    <div className="h-full overflow-auto p-8 animate-in fade-in duration-500">
      {/* Edit Dialog */}
      {editingFile && editingClassification && (
        <ClassificationConfirmDialog
          suggestedType={editingClassification.dataType}
          confidence={editingClassification.confidence}
          indicators={editingClassification.indicators}
          onConfirm={handleEditConfirm}
          onCancel={() => setEditingFile(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deletingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeletingFile(null)}
          />
          <div className="relative bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-md w-full border border-neutral-200 dark:border-neutral-800 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">
                  Delete Classification
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Are you sure you want to delete the classification for{' '}
                  <span className="font-mono font-medium">{deletingFile}</span>?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingFile(null)}
                className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingFile)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation */}
      {showClearAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowClearAllConfirm(false)}
          />
          <div className="relative bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-md w-full border border-neutral-200 dark:border-neutral-800 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">
                  Clear All Classifications
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Are you sure you want to delete all {classifications.length} stored
                  classifications? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowClearAllConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
              Classification Settings
            </h1>
          </div>
          <p className="text-neutral-600 dark:text-neutral-400">
            Manage stored schema classifications for your CSV files
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <div className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
              {classifications.length}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              Total Classifications
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <div className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
              {classifications.filter(c => c.userConfirmed).length}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              User Confirmed
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <div className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
              {Math.round(
                classifications.reduce((sum, c) => sum + c.confidence, 0) /
                  (classifications.length || 1)
              )}
              %
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              Avg. Confidence
            </div>
          </div>
        </div>

        {/* Actions */}
        {classifications.length > 0 && (
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={handleExport}
              className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export All
            </button>
            <button
              onClick={() => setShowClearAllConfirm(true)}
              className="px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-neutral-900 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>
        )}

        {/* Classifications List */}
        {classifications.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <div className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800 w-fit mx-auto mb-4">
              <Settings className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              No Classifications Yet
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
              Upload a CSV file to automatically classify its schema. Classifications will
              appear here for future reference.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {classifications.map((classification) => (
              <div
                key={classification.fileName}
                className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* File Name */}
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-white font-mono truncate">
                        {classification.fileName}
                      </h3>
                      {classification.userConfirmed && (
                        <span
                          className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded flex items-center gap-1 flex-shrink-0"
                          title="User confirmed"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Confirmed
                        </span>
                      )}
                    </div>

                    {/* Data Type & Confidence */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${getDataTypeColor(
                          classification.dataType
                        )}`}
                      >
                        {getDataTypeLabel(classification.dataType)}
                      </span>
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">
                        {classification.confidence}% confidence
                      </span>
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-500">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(classification.timestamp)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(classification)}
                      className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Edit classification"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingFile(classification.fileName)}
                      className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete classification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
