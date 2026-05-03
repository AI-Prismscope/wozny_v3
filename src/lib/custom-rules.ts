/**
 * Custom Classification Rules System
 * 
 * Allows users to define custom rules for schema classification.
 * Rules can override or supplement the default classification logic.
 */

import { DataType, DuplicateDetectionMode, mapDataTypeToDetectionMode } from './schema-classifier';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Rule condition types
 */
export enum RuleConditionType {
  COLUMN_NAME_CONTAINS = 'column_name_contains',
  COLUMN_NAME_MATCHES = 'column_name_matches',
  COLUMN_COUNT = 'column_count',
  ROW_COUNT = 'row_count',
  UNIQUENESS_RATIO = 'uniqueness_ratio',
}

/**
 * Rule condition operator
 */
export enum RuleOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  MATCHES_REGEX = 'matches_regex',
}

/**
 * Single rule condition
 */
export interface RuleCondition {
  type: RuleConditionType;
  operator: RuleOperator;
  value: string | number;
  columnName?: string; // For column-specific conditions
}

/**
 * Custom classification rule
 */
export interface CustomRule {
  id: string;
  name: string;
  description: string;
  dataType: DataType;
  priority: number; // Higher priority rules are evaluated first
  conditions: RuleCondition[];
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Rule evaluation result
 */
export interface RuleEvaluationResult {
  matched: boolean;
  rule: CustomRule | null;
  confidence: number;
}

/**
 * Rule template for quick setup
 */
export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'technical' | 'industry';
  dataType: DataType;
  conditions: RuleCondition[];
}

/**
 * Custom rules storage structure
 */
interface CustomRulesStorage {
  version: number;
  rules: CustomRule[];
}

// ============================================================================
// Storage Configuration
// ============================================================================

const STORAGE_KEY = 'wozny_custom_rules';
const STORAGE_VERSION = 1;

// ============================================================================
// Rule Templates
// ============================================================================

export const RULE_TEMPLATES: RuleTemplate[] = [
  // Business Templates
  {
    id: 'crm-contacts',
    name: 'CRM Contacts',
    description: 'Customer relationship management contact lists',
    category: 'business',
    dataType: DataType.CUSTOMER,
    conditions: [
      {
        type: RuleConditionType.COLUMN_NAME_CONTAINS,
        operator: RuleOperator.CONTAINS,
        value: 'contact',
      },
      {
        type: RuleConditionType.COLUMN_NAME_CONTAINS,
        operator: RuleOperator.CONTAINS,
        value: 'email',
      },
    ],
  },
  {
    id: 'sales-orders',
    name: 'Sales Orders',
    description: 'E-commerce or retail sales order data',
    category: 'business',
    dataType: DataType.TRANSACTION,
    conditions: [
      {
        type: RuleConditionType.COLUMN_NAME_CONTAINS,
        operator: RuleOperator.CONTAINS,
        value: 'order',
      },
      {
        type: RuleConditionType.COLUMN_NAME_CONTAINS,
        operator: RuleOperator.CONTAINS,
        value: 'total',
      },
    ],
  },
  {
    id: 'product-catalog',
    name: 'Product Catalog',
    description: 'E-commerce product listings and inventory',
    category: 'business',
    dataType: DataType.INVENTORY,
    conditions: [
      {
        type: RuleConditionType.COLUMN_NAME_CONTAINS,
        operator: RuleOperator.CONTAINS,
        value: 'product',
      },
      {
        type: RuleConditionType.COLUMN_NAME_CONTAINS,
        operator: RuleOperator.CONTAINS,
        value: 'price',
      },
    ],
  },
  
  // Technical Templates
  {
    id: 'server-logs',
    name: 'Server Logs',
    description: 'Application or server log files with timestamps',
    category: 'technical',
    dataType: DataType.TIME_SERIES,
    conditions: [
      {
        type: RuleConditionType.COLUMN_NAME_CONTAINS,
        operator: RuleOperator.CONTAINS,
        value: 'timestamp',
      },
      {
        type: RuleConditionType.COLUMN_NAME_CONTAINS,
        operator: RuleOperator.CONTAINS,
        value: 'log',
      },
    ],
  },
  {
    id: 'api-requests',
    name: 'API Request Logs',
    description: 'HTTP API request/response logs',
    category: 'technical',
    dataType: DataType.TRANSACTION,
    conditions: [
      {
        type: RuleConditionType.COLUMN_NAME_CONTAINS,
        operator: RuleOperator.CONTAINS,
        value: 'request',
      },
      {
        type: RuleConditionType.COLUMN_NAME_CONTAINS,
        operator: RuleOperator.CONTAINS,
        value: 'status',
      },
    ],
  },
  
  // Industry Templates
  {
    id: 'healthcare-patients',
    name: 'Healthcare Patients',
    description: 'Patient records and medical data',
    category: 'industry',
    dataType: DataType.CUSTOMER,
    conditions: [
      {
        type: RuleConditionType.COLUMN_NAME_CONTAINS,
        operator: RuleOperator.CONTAINS,
        value: 'patient',
      },
    ],
  },
  {
    id: 'financial-transactions',
    name: 'Financial Transactions',
    description: 'Banking or payment transaction records',
    category: 'industry',
    dataType: DataType.TRANSACTION,
    conditions: [
      {
        type: RuleConditionType.COLUMN_NAME_CONTAINS,
        operator: RuleOperator.CONTAINS,
        value: 'transaction',
      },
      {
        type: RuleConditionType.COLUMN_NAME_CONTAINS,
        operator: RuleOperator.CONTAINS,
        value: 'amount',
      },
    ],
  },
  {
    id: 'iot-sensors',
    name: 'IoT Sensor Data',
    description: 'Internet of Things sensor readings',
    category: 'industry',
    dataType: DataType.TIME_SERIES,
    conditions: [
      {
        type: RuleConditionType.COLUMN_NAME_CONTAINS,
        operator: RuleOperator.CONTAINS,
        value: 'sensor',
      },
      {
        type: RuleConditionType.COLUMN_NAME_CONTAINS,
        operator: RuleOperator.CONTAINS,
        value: 'reading',
      },
    ],
  },
];

// ============================================================================
// Rule Evaluation
// ============================================================================

/**
 * Evaluates a single condition against CSV data
 */
function evaluateCondition(
  condition: RuleCondition,
  rows: Record<string, string>[],
  columns: string[]
): boolean {
  const normalizedColumns = columns.map(col => col.toLowerCase());

  switch (condition.type) {
    case RuleConditionType.COLUMN_NAME_CONTAINS: {
      const searchValue = String(condition.value).toLowerCase();
      return normalizedColumns.some(col => {
        if (condition.operator === RuleOperator.CONTAINS) {
          return col.includes(searchValue);
        } else if (condition.operator === RuleOperator.NOT_CONTAINS) {
          return !col.includes(searchValue);
        }
        return false;
      });
    }

    case RuleConditionType.COLUMN_NAME_MATCHES: {
      const regex = new RegExp(String(condition.value), 'i');
      return normalizedColumns.some(col => {
        if (condition.operator === RuleOperator.MATCHES_REGEX) {
          return regex.test(col);
        }
        return false;
      });
    }

    case RuleConditionType.COLUMN_COUNT: {
      const count = columns.length;
      const value = Number(condition.value);
      switch (condition.operator) {
        case RuleOperator.EQUALS:
          return count === value;
        case RuleOperator.NOT_EQUALS:
          return count !== value;
        case RuleOperator.GREATER_THAN:
          return count > value;
        case RuleOperator.LESS_THAN:
          return count < value;
        default:
          return false;
      }
    }

    case RuleConditionType.ROW_COUNT: {
      const count = rows.length;
      const value = Number(condition.value);
      switch (condition.operator) {
        case RuleOperator.EQUALS:
          return count === value;
        case RuleOperator.NOT_EQUALS:
          return count !== value;
        case RuleOperator.GREATER_THAN:
          return count > value;
        case RuleOperator.LESS_THAN:
          return count < value;
        default:
          return false;
      }
    }

    case RuleConditionType.UNIQUENESS_RATIO: {
      if (!condition.columnName) return false;
      const column = columns.find(
        col => col.toLowerCase() === condition.columnName!.toLowerCase()
      );
      if (!column) return false;

      const uniqueValues = new Set(rows.map(row => row[column]));
      const ratio = uniqueValues.size / rows.length;
      const value = Number(condition.value);

      switch (condition.operator) {
        case RuleOperator.GREATER_THAN:
          return ratio > value;
        case RuleOperator.LESS_THAN:
          return ratio < value;
        case RuleOperator.EQUALS:
          return Math.abs(ratio - value) < 0.01; // Allow small tolerance
        default:
          return false;
      }
    }

    default:
      return false;
  }
}

/**
 * Evaluates a custom rule against CSV data
 */
export function evaluateRule(
  rule: CustomRule,
  rows: Record<string, string>[],
  columns: string[]
): RuleEvaluationResult {
  if (!rule.enabled) {
    return { matched: false, rule: null, confidence: 0 };
  }

  // All conditions must be true (AND logic)
  const allConditionsMet = rule.conditions.every(condition =>
    evaluateCondition(condition, rows, columns)
  );

  if (allConditionsMet) {
    // Calculate confidence based on number of conditions met
    // More conditions = higher confidence
    const baseConfidence = 85;
    const conditionBonus = Math.min(rule.conditions.length * 3, 15);
    const confidence = Math.min(baseConfidence + conditionBonus, 100);

    return {
      matched: true,
      rule,
      confidence,
    };
  }

  return { matched: false, rule: null, confidence: 0 };
}

/**
 * Evaluates all custom rules and returns the best match
 */
export function evaluateCustomRules(
  rows: Record<string, string>[],
  columns: string[]
): RuleEvaluationResult {
  const rules = getAllRules();
  
  // Sort by priority (descending)
  const sortedRules = rules
    .filter(rule => rule.enabled)
    .sort((a, b) => b.priority - a.priority);

  // Evaluate each rule and return first match
  for (const rule of sortedRules) {
    const result = evaluateRule(rule, rows, columns);
    if (result.matched) {
      return result;
    }
  }

  return { matched: false, rule: null, confidence: 0 };
}

// ============================================================================
// Rule Management
// ============================================================================

/**
 * Gets storage object
 */
function getStorage(): CustomRulesStorage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { version: STORAGE_VERSION, rules: [] };
    }
    return JSON.parse(stored);
  } catch (error) {
    console.warn('Failed to parse custom rules storage:', error);
    return { version: STORAGE_VERSION, rules: [] };
  }
}

/**
 * Saves storage object
 */
function saveStorage(storage: CustomRulesStorage): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  } catch (error) {
    console.warn('Failed to save custom rules storage:', error);
  }
}

/**
 * Generates a unique rule ID
 */
function generateRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Creates a new custom rule
 */
export function createRule(
  name: string,
  description: string,
  dataType: DataType,
  conditions: RuleCondition[],
  priority: number = 50
): CustomRule {
  const rule: CustomRule = {
    id: generateRuleId(),
    name,
    description,
    dataType,
    priority,
    conditions,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const storage = getStorage();
  storage.rules.push(rule);
  saveStorage(storage);

  return rule;
}

/**
 * Creates a rule from a template
 */
export function createRuleFromTemplate(template: RuleTemplate): CustomRule {
  return createRule(
    template.name,
    template.description,
    template.dataType,
    template.conditions,
    50 // Default priority
  );
}

/**
 * Updates an existing rule
 */
export function updateRule(
  id: string,
  updates: Partial<Omit<CustomRule, 'id' | 'createdAt'>>
): CustomRule | null {
  const storage = getStorage();
  const ruleIndex = storage.rules.findIndex(r => r.id === id);

  if (ruleIndex === -1) {
    return null;
  }

  storage.rules[ruleIndex] = {
    ...storage.rules[ruleIndex],
    ...updates,
    updatedAt: Date.now(),
  };

  saveStorage(storage);
  return storage.rules[ruleIndex];
}

/**
 * Deletes a rule
 */
export function deleteRule(id: string): boolean {
  const storage = getStorage();
  const initialLength = storage.rules.length;
  storage.rules = storage.rules.filter(r => r.id !== id);

  if (storage.rules.length < initialLength) {
    saveStorage(storage);
    return true;
  }

  return false;
}

/**
 * Gets all rules
 */
export function getAllRules(): CustomRule[] {
  const storage = getStorage();
  return storage.rules;
}

/**
 * Gets a single rule by ID
 */
export function getRule(id: string): CustomRule | null {
  const storage = getStorage();
  return storage.rules.find(r => r.id === id) || null;
}

/**
 * Toggles rule enabled state
 */
export function toggleRuleEnabled(id: string): boolean {
  const storage = getStorage();
  const rule = storage.rules.find(r => r.id === id);

  if (!rule) {
    return false;
  }

  rule.enabled = !rule.enabled;
  rule.updatedAt = Date.now();
  saveStorage(storage);

  return true;
}

/**
 * Clears all custom rules
 */
export function clearAllRules(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear custom rules:', error);
  }
}

/**
 * Exports rules as JSON
 */
export function exportRules(): string {
  const storage = getStorage();
  return JSON.stringify(
    {
      version: STORAGE_VERSION,
      exportDate: new Date().toISOString(),
      rules: storage.rules,
    },
    null,
    2
  );
}

/**
 * Imports rules from JSON
 */
export function importRules(jsonString: string): { success: number; failed: number } {
  try {
    const data = JSON.parse(jsonString);
    
    if (!data.rules || !Array.isArray(data.rules)) {
      throw new Error('Invalid rules format');
    }

    const storage = getStorage();
    let successCount = 0;
    let failedCount = 0;

    data.rules.forEach((rule: unknown) => {
      try {
        // Validate rule structure
        const r = rule as CustomRule;
        if (!r.name || !r.dataType || !r.conditions) {
          failedCount++;
          return;
        }

        // Generate new ID to avoid conflicts
        const newRule: CustomRule = {
          ...r,
          id: generateRuleId(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        storage.rules.push(newRule);
        successCount++;
      } catch {
        failedCount++;
      }
    });

    saveStorage(storage);
    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.warn('Failed to import rules:', error);
    return { success: 0, failed: 0 };
  }
}
