import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createRule,
  updateRule,
  deleteRule,
  getAllRules,
  getRule,
  toggleRuleEnabled,
  evaluateRule,
  evaluateCustomRules,
  createRuleFromTemplate,
  exportRules,
  importRules,
  clearAllRules,
  RULE_TEMPLATES,
  RuleConditionType,
  RuleOperator,
} from './custom-rules';
import { DataType } from './schema-classifier';

// Mock localStorage for tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

describe('Custom Rules System', () => {
  beforeEach(() => {
    localStorageMock.clear();
    clearAllRules();
  });

  describe('Rule Management', () => {
    it('should create a new rule', () => {
      const rule = createRule(
        'Test Rule',
        'A test rule',
        DataType.CUSTOMER,
        [
          {
            type: RuleConditionType.COLUMN_NAME_CONTAINS,
            operator: RuleOperator.CONTAINS,
            value: 'email',
          },
        ],
        50
      );

      expect(rule.name).toBe('Test Rule');
      expect(rule.description).toBe('A test rule');
      expect(rule.dataType).toBe(DataType.CUSTOMER);
      expect(rule.priority).toBe(50);
      expect(rule.enabled).toBe(true);
      expect(rule.conditions).toHaveLength(1);
    });

    it('should retrieve all rules', () => {
      createRule('Rule 1', 'First rule', DataType.CUSTOMER, [], 50);
      createRule('Rule 2', 'Second rule', DataType.TRANSACTION, [], 60);

      const rules = getAllRules();
      expect(rules).toHaveLength(2);
      expect(rules[0].name).toBe('Rule 1');
      expect(rules[1].name).toBe('Rule 2');
    });

    it('should retrieve a single rule by ID', () => {
      const created = createRule('Test Rule', 'Description', DataType.CUSTOMER, [], 50);
      const retrieved = getRule(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Test Rule');
    });

    it('should update a rule', () => {
      const rule = createRule('Original', 'Description', DataType.CUSTOMER, [], 50);
      const updated = updateRule(rule.id, { name: 'Updated', priority: 75 });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('Updated');
      expect(updated?.priority).toBe(75);
      expect(updated?.description).toBe('Description'); // Unchanged
    });

    it('should delete a rule', () => {
      const rule = createRule('Test Rule', 'Description', DataType.CUSTOMER, [], 50);
      const deleted = deleteRule(rule.id);

      expect(deleted).toBe(true);
      expect(getAllRules()).toHaveLength(0);
    });

    it('should toggle rule enabled state', () => {
      const rule = createRule('Test Rule', 'Description', DataType.CUSTOMER, [], 50);
      expect(rule.enabled).toBe(true);

      toggleRuleEnabled(rule.id);
      const updated = getRule(rule.id);
      expect(updated?.enabled).toBe(false);

      toggleRuleEnabled(rule.id);
      const toggled = getRule(rule.id);
      expect(toggled?.enabled).toBe(true);
    });
  });

  describe('Rule Templates', () => {
    it('should have predefined templates', () => {
      expect(RULE_TEMPLATES.length).toBeGreaterThan(0);
      expect(RULE_TEMPLATES[0]).toHaveProperty('id');
      expect(RULE_TEMPLATES[0]).toHaveProperty('name');
      expect(RULE_TEMPLATES[0]).toHaveProperty('dataType');
      expect(RULE_TEMPLATES[0]).toHaveProperty('conditions');
    });

    it('should create rule from template', () => {
      const template = RULE_TEMPLATES[0];
      const rule = createRuleFromTemplate(template);

      expect(rule.name).toBe(template.name);
      expect(rule.description).toBe(template.description);
      expect(rule.dataType).toBe(template.dataType);
      expect(rule.conditions).toEqual(template.conditions);
    });
  });

  describe('Rule Evaluation', () => {
    it('should evaluate COLUMN_NAME_CONTAINS condition', () => {
      const rule = createRule(
        'Email Rule',
        'Matches email columns',
        DataType.CUSTOMER,
        [
          {
            type: RuleConditionType.COLUMN_NAME_CONTAINS,
            operator: RuleOperator.CONTAINS,
            value: 'email',
          },
        ],
        50
      );

      const rows = [{ email: 'test@example.com', name: 'John' }];
      const columns = ['email', 'name'];

      const result = evaluateRule(rule, rows, columns);
      expect(result.matched).toBe(true);
      expect(result.rule).not.toBeNull();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should not match when condition fails', () => {
      const rule = createRule(
        'Phone Rule',
        'Matches phone columns',
        DataType.CUSTOMER,
        [
          {
            type: RuleConditionType.COLUMN_NAME_CONTAINS,
            operator: RuleOperator.CONTAINS,
            value: 'phone',
          },
        ],
        50
      );

      const rows = [{ email: 'test@example.com', name: 'John' }];
      const columns = ['email', 'name'];

      const result = evaluateRule(rule, rows, columns);
      expect(result.matched).toBe(false);
      expect(result.rule).toBeNull();
    });

    it('should evaluate COLUMN_COUNT condition', () => {
      const rule = createRule(
        'Column Count Rule',
        'Matches datasets with 3+ columns',
        DataType.CUSTOMER,
        [
          {
            type: RuleConditionType.COLUMN_COUNT,
            operator: RuleOperator.GREATER_THAN,
            value: 2,
          },
        ],
        50
      );

      const rows = [{ a: '1', b: '2', c: '3' }];
      const columns = ['a', 'b', 'c'];

      const result = evaluateRule(rule, rows, columns);
      expect(result.matched).toBe(true);
    });

    it('should evaluate ROW_COUNT condition', () => {
      const rule = createRule(
        'Row Count Rule',
        'Matches datasets with 100+ rows',
        DataType.TRANSACTION,
        [
          {
            type: RuleConditionType.ROW_COUNT,
            operator: RuleOperator.GREATER_THAN,
            value: 50,
          },
        ],
        50
      );

      const rows = Array.from({ length: 100 }, (_, i) => ({ id: String(i) }));
      const columns = ['id'];

      const result = evaluateRule(rule, rows, columns);
      expect(result.matched).toBe(true);
    });

    it('should evaluate UNIQUENESS_RATIO condition', () => {
      const rule = createRule(
        'Uniqueness Rule',
        'Matches columns with high uniqueness',
        DataType.CUSTOMER,
        [
          {
            type: RuleConditionType.UNIQUENESS_RATIO,
            operator: RuleOperator.GREATER_THAN,
            value: 0.8,
            columnName: 'id',
          },
        ],
        50
      );

      const rows = [
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' },
        { id: '3', name: 'Bob' },
      ];
      const columns = ['id', 'name'];

      const result = evaluateRule(rule, rows, columns);
      expect(result.matched).toBe(true);
    });

    it('should require all conditions to match (AND logic)', () => {
      const rule = createRule(
        'Multi-Condition Rule',
        'Requires email AND phone columns',
        DataType.CUSTOMER,
        [
          {
            type: RuleConditionType.COLUMN_NAME_CONTAINS,
            operator: RuleOperator.CONTAINS,
            value: 'email',
          },
          {
            type: RuleConditionType.COLUMN_NAME_CONTAINS,
            operator: RuleOperator.CONTAINS,
            value: 'phone',
          },
        ],
        50
      );

      // Only has email, not phone
      const rows1 = [{ email: 'test@example.com', name: 'John' }];
      const columns1 = ['email', 'name'];
      const result1 = evaluateRule(rule, rows1, columns1);
      expect(result1.matched).toBe(false);

      // Has both email and phone
      const rows2 = [{ email: 'test@example.com', phone: '123-456-7890' }];
      const columns2 = ['email', 'phone'];
      const result2 = evaluateRule(rule, rows2, columns2);
      expect(result2.matched).toBe(true);
    });

    it('should not evaluate disabled rules', () => {
      const rule = createRule(
        'Disabled Rule',
        'This rule is disabled',
        DataType.CUSTOMER,
        [
          {
            type: RuleConditionType.COLUMN_NAME_CONTAINS,
            operator: RuleOperator.CONTAINS,
            value: 'email',
          },
        ],
        50
      );

      toggleRuleEnabled(rule.id); // Disable the rule
      const updatedRule = getRule(rule.id)!; // Get the updated rule

      const rows = [{ email: 'test@example.com' }];
      const columns = ['email'];

      const result = evaluateRule(updatedRule, rows, columns);
      expect(result.matched).toBe(false);
    });

    it('should evaluate custom rules by priority', () => {
      // Create two rules with different priorities
      createRule(
        'Low Priority',
        'Low priority rule',
        DataType.TRANSACTION,
        [
          {
            type: RuleConditionType.COLUMN_NAME_CONTAINS,
            operator: RuleOperator.CONTAINS,
            value: 'email',
          },
        ],
        30
      );

      createRule(
        'High Priority',
        'High priority rule',
        DataType.CUSTOMER,
        [
          {
            type: RuleConditionType.COLUMN_NAME_CONTAINS,
            operator: RuleOperator.CONTAINS,
            value: 'email',
          },
        ],
        70
      );

      const rows = [{ email: 'test@example.com' }];
      const columns = ['email'];

      const result = evaluateCustomRules(rows, columns);
      expect(result.matched).toBe(true);
      expect(result.rule?.name).toBe('High Priority'); // Higher priority wins
      expect(result.rule?.dataType).toBe(DataType.CUSTOMER);
    });
  });

  describe('Import/Export', () => {
    it('should export rules as JSON', () => {
      createRule('Rule 1', 'First rule', DataType.CUSTOMER, [], 50);
      createRule('Rule 2', 'Second rule', DataType.TRANSACTION, [], 60);

      const json = exportRules();
      const data = JSON.parse(json);

      expect(data.version).toBe(1);
      expect(data.rules).toHaveLength(2);
      expect(data.exportDate).toBeDefined();
    });

    it('should import rules from JSON', () => {
      const json = JSON.stringify({
        version: 1,
        rules: [
          {
            id: 'test-1',
            name: 'Imported Rule',
            description: 'An imported rule',
            dataType: DataType.CUSTOMER,
            priority: 50,
            conditions: [],
            enabled: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      });

      const result = importRules(json);
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);

      const rules = getAllRules();
      expect(rules).toHaveLength(1);
      expect(rules[0].name).toBe('Imported Rule');
    });

    it('should handle invalid import JSON', () => {
      const result = importRules('invalid json');
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should generate new IDs on import to avoid conflicts', () => {
      const originalRule = createRule('Original', 'Description', DataType.CUSTOMER, [], 50);

      const json = JSON.stringify({
        version: 1,
        rules: [
          {
            id: originalRule.id, // Same ID as existing rule
            name: 'Imported',
            description: 'Imported rule',
            dataType: DataType.TRANSACTION,
            priority: 60,
            conditions: [],
            enabled: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      });

      importRules(json);

      const rules = getAllRules();
      expect(rules).toHaveLength(2); // Both rules should exist
      expect(rules[0].id).not.toBe(rules[1].id); // IDs should be different
    });
  });
});
