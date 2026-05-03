/**
 * Analytics System for Schema Classification
 * 
 * Tracks classification events, accuracy, and usage patterns.
 * All data stored locally in browser localStorage.
 */

import { DataType, DuplicateDetectionMode } from './schema-classifier';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Classification event types
 */
export enum AnalyticsEventType {
  CLASSIFICATION_AUTO = 'classification_auto',
  CLASSIFICATION_CONFIRMED = 'classification_confirmed',
  CLASSIFICATION_CHANGED = 'classification_changed',
  CLASSIFICATION_DELETED = 'classification_deleted',
  DUPLICATE_DETECTION = 'duplicate_detection',
}

/**
 * Analytics event record
 */
export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  timestamp: number;
  dataType: DataType;
  confidence: number;
  detectionMode: DuplicateDetectionMode;
  fileName: string;
  metadata?: Record<string, unknown>;
}

/**
 * Analytics summary statistics
 */
export interface AnalyticsSummary {
  totalClassifications: number;
  autoClassifications: number;
  userConfirmed: number;
  userChanged: number;
  averageConfidence: number;
  byDataType: Record<DataType, number>;
  byDetectionMode: Record<DuplicateDetectionMode, number>;
  confidenceDistribution: {
    high: number; // >80%
    medium: number; // 60-80%
    low: number; // <60%
  };
  recentActivity: AnalyticsEvent[];
}

/**
 * Time-series data point
 */
export interface TimeSeriesDataPoint {
  timestamp: number;
  count: number;
  averageConfidence: number;
}

/**
 * Analytics storage structure
 */
interface AnalyticsStorage {
  version: number;
  events: AnalyticsEvent[];
}

// ============================================================================
// Storage Configuration
// ============================================================================

const STORAGE_KEY = 'wozny_analytics';
const STORAGE_VERSION = 1;
const MAX_EVENTS = 1000; // Keep last 1000 events

// ============================================================================
// Event Tracking
// ============================================================================

/**
 * Tracks a classification event
 */
export function trackClassificationEvent(
  type: AnalyticsEventType,
  dataType: DataType,
  confidence: number,
  detectionMode: DuplicateDetectionMode,
  fileName: string,
  metadata?: Record<string, unknown>
): void {
  try {
    const event: AnalyticsEvent = {
      id: generateEventId(),
      type,
      timestamp: Date.now(),
      dataType,
      confidence,
      detectionMode,
      fileName,
      metadata,
    };

    const storage = getStorage();
    storage.events.push(event);

    // Keep only the most recent events
    if (storage.events.length > MAX_EVENTS) {
      storage.events = storage.events.slice(-MAX_EVENTS);
    }

    saveStorage(storage);
  } catch (error) {
    console.warn('Failed to track analytics event:', error);
  }
}

/**
 * Generates a unique event ID
 */
function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Data Retrieval
// ============================================================================

/**
 * Gets all analytics events
 */
export function getAllEvents(): AnalyticsEvent[] {
  try {
    const storage = getStorage();
    return storage.events;
  } catch (error) {
    console.warn('Failed to retrieve analytics events:', error);
    return [];
  }
}

/**
 * Gets events within a time range
 */
export function getEventsByTimeRange(
  startTime: number,
  endTime: number
): AnalyticsEvent[] {
  const events = getAllEvents();
  return events.filter(
    (event) => event.timestamp >= startTime && event.timestamp <= endTime
  );
}

/**
 * Gets events by type
 */
export function getEventsByType(type: AnalyticsEventType): AnalyticsEvent[] {
  const events = getAllEvents();
  return events.filter((event) => event.type === type);
}

/**
 * Gets events by data type
 */
export function getEventsByDataType(dataType: DataType): AnalyticsEvent[] {
  const events = getAllEvents();
  return events.filter((event) => event.dataType === dataType);
}

// ============================================================================
// Analytics Summary
// ============================================================================

/**
 * Generates analytics summary from events
 */
export function getAnalyticsSummary(
  timeRangeMs?: number
): AnalyticsSummary {
  const now = Date.now();
  const startTime = timeRangeMs ? now - timeRangeMs : 0;
  const events = getEventsByTimeRange(startTime, now);

  // Filter classification events only
  const classificationEvents = events.filter(
    (e) =>
      e.type === AnalyticsEventType.CLASSIFICATION_AUTO ||
      e.type === AnalyticsEventType.CLASSIFICATION_CONFIRMED ||
      e.type === AnalyticsEventType.CLASSIFICATION_CHANGED
  );

  const totalClassifications = classificationEvents.length;
  const autoClassifications = events.filter(
    (e) => e.type === AnalyticsEventType.CLASSIFICATION_AUTO
  ).length;
  const userConfirmed = events.filter(
    (e) => e.type === AnalyticsEventType.CLASSIFICATION_CONFIRMED
  ).length;
  const userChanged = events.filter(
    (e) => e.type === AnalyticsEventType.CLASSIFICATION_CHANGED
  ).length;

  // Calculate average confidence
  const totalConfidence = classificationEvents.reduce(
    (sum, e) => sum + e.confidence,
    0
  );
  const averageConfidence =
    totalClassifications > 0 ? totalConfidence / totalClassifications : 0;

  // Count by data type
  const byDataType: Record<DataType, number> = {
    [DataType.CUSTOMER]: 0,
    [DataType.TRANSACTION]: 0,
    [DataType.INVENTORY]: 0,
    [DataType.TIME_SERIES]: 0,
  };
  classificationEvents.forEach((e) => {
    byDataType[e.dataType]++;
  });

  // Count by detection mode
  const byDetectionMode: Record<DuplicateDetectionMode, number> = {
    [DuplicateDetectionMode.AGGRESSIVE]: 0,
    [DuplicateDetectionMode.CONSERVATIVE]: 0,
    [DuplicateDetectionMode.VERY_CONSERVATIVE]: 0,
  };
  classificationEvents.forEach((e) => {
    byDetectionMode[e.detectionMode]++;
  });

  // Confidence distribution
  const confidenceDistribution = {
    high: classificationEvents.filter((e) => e.confidence > 80).length,
    medium: classificationEvents.filter(
      (e) => e.confidence >= 60 && e.confidence <= 80
    ).length,
    low: classificationEvents.filter((e) => e.confidence < 60).length,
  };

  // Recent activity (last 10 events)
  const recentActivity = events.slice(-10).reverse();

  return {
    totalClassifications,
    autoClassifications,
    userConfirmed,
    userChanged,
    averageConfidence: Math.round(averageConfidence),
    byDataType,
    byDetectionMode,
    confidenceDistribution,
    recentActivity,
  };
}

/**
 * Gets time-series data for classifications
 */
export function getTimeSeriesData(
  intervalMs: number,
  periodsCount: number
): TimeSeriesDataPoint[] {
  const now = Date.now();
  const events = getAllEvents();
  const dataPoints: TimeSeriesDataPoint[] = [];

  for (let i = periodsCount - 1; i >= 0; i--) {
    const endTime = now - i * intervalMs;
    const startTime = endTime - intervalMs;

    const periodEvents = events.filter(
      (e) =>
        e.timestamp >= startTime &&
        e.timestamp < endTime &&
        (e.type === AnalyticsEventType.CLASSIFICATION_AUTO ||
          e.type === AnalyticsEventType.CLASSIFICATION_CONFIRMED ||
          e.type === AnalyticsEventType.CLASSIFICATION_CHANGED)
    );

    const count = periodEvents.length;
    const avgConfidence =
      count > 0
        ? periodEvents.reduce((sum, e) => sum + e.confidence, 0) / count
        : 0;

    dataPoints.push({
      timestamp: endTime,
      count,
      averageConfidence: Math.round(avgConfidence),
    });
  }

  return dataPoints;
}

// ============================================================================
// Storage Management
// ============================================================================

/**
 * Gets analytics storage
 */
function getStorage(): AnalyticsStorage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { version: STORAGE_VERSION, events: [] };
    }
    return JSON.parse(stored);
  } catch (error) {
    console.warn('Failed to parse analytics storage:', error);
    return { version: STORAGE_VERSION, events: [] };
  }
}

/**
 * Saves analytics storage
 */
function saveStorage(storage: AnalyticsStorage): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  } catch (error) {
    console.warn('Failed to save analytics storage:', error);
  }
}

/**
 * Clears all analytics data
 */
export function clearAnalytics(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear analytics:', error);
  }
}

/**
 * Exports analytics data as JSON
 */
export function exportAnalytics(): string {
  const storage = getStorage();
  const summary = getAnalyticsSummary();

  return JSON.stringify(
    {
      version: STORAGE_VERSION,
      exportDate: new Date().toISOString(),
      summary,
      events: storage.events,
    },
    null,
    2
  );
}
