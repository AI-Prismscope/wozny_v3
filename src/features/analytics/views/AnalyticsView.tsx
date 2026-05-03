'use client';

import React, { useState, useEffect } from 'react';
import {
  getAnalyticsSummary,
  getTimeSeriesData,
  clearAnalytics,
  exportAnalytics,
  AnalyticsSummary,
  TimeSeriesDataPoint,
} from '@/lib/analytics';
import { DataType, DuplicateDetectionMode } from '@/lib/schema-classifier';
import {
  BarChart3,
  TrendingUp,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Activity,
  PieChart,
} from 'lucide-react';

type TimeRange = '24h' | '7d' | '30d' | 'all';

export const AnalyticsView = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesDataPoint[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const loadAnalytics = () => {
    const timeRangeMs = getTimeRangeMs(timeRange);
    const analyticsSum = getAnalyticsSummary(timeRangeMs);
    setSummary(analyticsSum);

    // Load time series data
    const { intervalMs, periods } = getTimeSeriesConfig(timeRange);
    const tsData = getTimeSeriesData(intervalMs, periods);
    setTimeSeriesData(tsData);
  };

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const getTimeRangeMs = (range: TimeRange): number | undefined => {
    switch (range) {
      case '24h':
        return 24 * 60 * 60 * 1000;
      case '7d':
        return 7 * 24 * 60 * 60 * 1000;
      case '30d':
        return 30 * 24 * 60 * 60 * 1000;
      case 'all':
        return undefined;
    }
  };

  const getTimeSeriesConfig = (
    range: TimeRange
  ): { intervalMs: number; periods: number } => {
    switch (range) {
      case '24h':
        return { intervalMs: 60 * 60 * 1000, periods: 24 }; // Hourly for 24 hours
      case '7d':
        return { intervalMs: 24 * 60 * 60 * 1000, periods: 7 }; // Daily for 7 days
      case '30d':
        return { intervalMs: 24 * 60 * 60 * 1000, periods: 30 }; // Daily for 30 days
      case 'all':
        return { intervalMs: 7 * 24 * 60 * 60 * 1000, periods: 12 }; // Weekly for 12 weeks
    }
  };

  const handleClearAnalytics = () => {
    clearAnalytics();
    loadAnalytics();
    setShowClearConfirm(false);
  };

  const handleExport = () => {
    const data = exportAnalytics();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wozny-analytics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getDataTypeLabel = (dataType: DataType): string => {
    switch (dataType) {
      case DataType.CUSTOMER:
        return 'Customer';
      case DataType.TRANSACTION:
        return 'Transaction';
      case DataType.INVENTORY:
        return 'Inventory';
      case DataType.TIME_SERIES:
        return 'Time-Series';
    }
  };

  const getDetectionModeLabel = (mode: DuplicateDetectionMode): string => {
    switch (mode) {
      case DuplicateDetectionMode.AGGRESSIVE:
        return 'Aggressive';
      case DuplicateDetectionMode.CONSERVATIVE:
        return 'Conservative';
      case DuplicateDetectionMode.VERY_CONSERVATIVE:
        return 'Very Conservative';
    }
  };

  const getDataTypeColor = (dataType: DataType): string => {
    switch (dataType) {
      case DataType.CUSTOMER:
        return 'bg-blue-500';
      case DataType.TRANSACTION:
        return 'bg-green-500';
      case DataType.INVENTORY:
        return 'bg-purple-500';
      case DataType.TIME_SERIES:
        return 'bg-orange-500';
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    if (timeRange === '24h') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (!summary) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-neutral-500">Loading analytics...</div>
      </div>
    );
  }

  const maxCount = Math.max(...timeSeriesData.map((d) => d.count), 1);

  return (
    <div className="h-full overflow-auto p-8 animate-in fade-in duration-500">
      {/* Clear Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowClearConfirm(false)}
          />
          <div className="relative bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-md w-full border border-neutral-200 dark:border-neutral-800 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">
                  Clear Analytics Data
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Are you sure you want to delete all analytics data? This action cannot be
                  undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAnalytics}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
                Analytics & Reporting
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-neutral-900 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear Data
              </button>
            </div>
          </div>
          <p className="text-neutral-600 dark:text-neutral-400">
            Track classification performance and usage patterns
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2 mb-6">
          {(['24h', '7d', '30d', 'all'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-purple-600 text-white'
                  : 'text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              {range === '24h' && 'Last 24 Hours'}
              {range === '7d' && 'Last 7 Days'}
              {range === '30d' && 'Last 30 Days'}
              {range === 'all' && 'All Time'}
            </button>
          ))}
        </div>

        {summary.totalClassifications === 0 ? (
          /* Empty State */
          <div className="text-center py-12 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <div className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800 w-fit mx-auto mb-4">
              <Activity className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              No Analytics Data Yet
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
              Upload and classify CSV files to start tracking analytics. Your classification
              performance and usage patterns will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Total Classifications
                  </span>
                </div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {summary.totalClassifications}
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Avg. Confidence
                  </span>
                </div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {summary.averageConfidence}%
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Auto-Applied
                  </span>
                </div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {summary.autoClassifications}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  {summary.totalClassifications > 0
                    ? Math.round(
                        (summary.autoClassifications / summary.totalClassifications) * 100
                      )
                    : 0}
                  % of total
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    User Confirmed
                  </span>
                </div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {summary.userConfirmed}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  {summary.userChanged} changed
                </div>
              </div>
            </div>

            {/* Time Series Chart */}
            <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Classification Activity
              </h3>
              <div className="h-64 flex items-end gap-2">
                {timeSeriesData.map((point, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col items-center justify-end h-48">
                      <div
                        className="w-full bg-purple-500 rounded-t transition-all hover:bg-purple-600 relative group"
                        style={{
                          height: `${(point.count / maxCount) * 100}%`,
                          minHeight: point.count > 0 ? '4px' : '0',
                        }}
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {point.count} classifications
                          <br />
                          {point.averageConfidence}% avg confidence
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-neutral-500 text-center">
                      {formatTimestamp(point.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Data Type Distribution */}
              <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <PieChart className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    By Data Type
                  </h3>
                </div>
                <div className="space-y-3">
                  {Object.entries(summary.byDataType).map(([type, count]) => {
                    const percentage =
                      summary.totalClassifications > 0
                        ? (count / summary.totalClassifications) * 100
                        : 0;
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            {getDataTypeLabel(type as DataType)}
                          </span>
                          <span className="text-sm text-neutral-600 dark:text-neutral-400">
                            {count} ({Math.round(percentage)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getDataTypeColor(type as DataType)} transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Confidence Distribution */}
              <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    Confidence Distribution
                  </h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        High (&gt;80%)
                      </span>
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {summary.confidenceDistribution.high} (
                        {summary.totalClassifications > 0
                          ? Math.round(
                              (summary.confidenceDistribution.high /
                                summary.totalClassifications) *
                                100
                            )
                          : 0}
                        %)
                      </span>
                    </div>
                    <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{
                          width: `${
                            summary.totalClassifications > 0
                              ? (summary.confidenceDistribution.high /
                                  summary.totalClassifications) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Medium (60-80%)
                      </span>
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {summary.confidenceDistribution.medium} (
                        {summary.totalClassifications > 0
                          ? Math.round(
                              (summary.confidenceDistribution.medium /
                                summary.totalClassifications) *
                                100
                            )
                          : 0}
                        %)
                      </span>
                    </div>
                    <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 transition-all"
                        style={{
                          width: `${
                            summary.totalClassifications > 0
                              ? (summary.confidenceDistribution.medium /
                                  summary.totalClassifications) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Low (&lt;60%)
                      </span>
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {summary.confidenceDistribution.low} (
                        {summary.totalClassifications > 0
                          ? Math.round(
                              (summary.confidenceDistribution.low /
                                summary.totalClassifications) *
                                100
                            )
                          : 0}
                        %)
                      </span>
                    </div>
                    <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 transition-all"
                        style={{
                          width: `${
                            summary.totalClassifications > 0
                              ? (summary.confidenceDistribution.low /
                                  summary.totalClassifications) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detection Mode Distribution */}
            <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                By Detection Mode
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(summary.byDetectionMode).map(([mode, count]) => {
                  const percentage =
                    summary.totalClassifications > 0
                      ? (count / summary.totalClassifications) * 100
                      : 0;
                  return (
                    <div
                      key={mode}
                      className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                    >
                      <div className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
                        {count}
                      </div>
                      <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        {getDetectionModeLabel(mode as DuplicateDetectionMode)}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {Math.round(percentage)}% of total
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
