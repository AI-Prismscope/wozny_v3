'use client';

import React, { useState, useEffect } from 'react';
import {
  getAllRules,
  createRule,
  updateRule,
  deleteRule,
  toggleRuleEnabled,
  createRuleFromTemplate,
  exportRules,
  importRules,
  CustomRule,
  RuleTemplate,
  RULE_TEMPLATES,
  RuleCondition,
  RuleConditionType,
  RuleOperator,
} from '@/lib/custom-rules';
import { DataType } from '@/lib/schema-classifier';
import {
  Plus,
  Edit2,
  Trash2,
  Download,
  Upload,
  Power,
  PowerOff,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';

export const CustomRulesView = () => {
  const [rules, setRules] = useState<CustomRule[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<CustomRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<CustomRule | null>(null);

  const loadRules = () => {
    const allRules = getAllRules();
    setRules(allRules);
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleToggleEnabled = (id: string) => {
    toggleRuleEnabled(id);
    loadRules();
  };

  const handleDelete = (id: string) => {
    deleteRule(id);
    loadRules();
    setDeletingRule(null);
  };

  const handleExport = () => {
    const json = exportRules();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wozny-custom-rules-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (jsonString: string) => {
    const result = importRules(jsonString);
    loadRules();
    setShowImportDialog(false);
    alert(`Imported ${result.success} rules successfully. ${result.failed} failed.`);
  };

  const handleCreateFromTemplate = (template: RuleTemplate) => {
    createRuleFromTemplate(template);
    loadRules();
    setShowTemplateDialog(false);
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

  return (
    <div className="h-full overflow-auto p-8 animate-in fade-in duration-500">
      {/* Template Dialog */}
      {showTemplateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowTemplateDialog(false)}
          />
          <div className="relative bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-2xl w-full border border-neutral-200 dark:border-neutral-800 p-6 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                Choose a Template
              </h3>
              <button
                onClick={() => setShowTemplateDialog(false)}
                className="p-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {['business', 'technical', 'industry'].map(category => (
                <div key={category}>
                  <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 capitalize">
                    {category}
                  </h4>
                  <div className="space-y-2">
                    {RULE_TEMPLATES.filter(t => t.category === category).map(template => (
                      <button
                        key={template.id}
                        onClick={() => handleCreateFromTemplate(template)}
                        className="w-full p-3 text-left bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="font-medium text-neutral-900 dark:text-white mb-1">
                              {template.name}
                            </div>
                            <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                              {template.description}
                            </div>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${getDataTypeColor(
                                template.dataType
                              )}`}
                            >
                              {getDataTypeLabel(template.dataType)}
                            </span>
                          </div>
                          <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Import Dialog */}
      {showImportDialog && (
        <ImportDialog
          onImport={handleImport}
          onCancel={() => setShowImportDialog(false)}
        />
      )}

      {/* Delete Confirmation */}
      {deletingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeletingRule(null)}
          />
          <div className="relative bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-md w-full border border-neutral-200 dark:border-neutral-800 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">
                  Delete Rule
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Are you sure you want to delete the rule{' '}
                  <span className="font-medium">{deletingRule.name}</span>?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingRule(null)}
                className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingRule.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
              Custom Classification Rules
            </h1>
          </div>
          <p className="text-neutral-600 dark:text-neutral-400">
            Define custom rules to override automatic classification
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <button
            onClick={() => setShowTemplateDialog(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Use Template
          </button>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Rule
          </button>
          {rules.length > 0 && (
            <>
              <button
                onClick={handleExport}
                className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={() => setShowImportDialog(true)}
                className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>
            </>
          )}
        </div>

        {/* Rules List */}
        {rules.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <div className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800 w-fit mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              No Custom Rules Yet
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto mb-4">
              Create custom rules to override automatic classification or use a template to get
              started quickly.
            </p>
            <button
              onClick={() => setShowTemplateDialog(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Browse Templates
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map(rule => (
              <div
                key={rule.id}
                className={`p-4 bg-white dark:bg-neutral-900 border rounded-lg transition-all ${
                  rule.enabled
                    ? 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                    : 'border-neutral-200 dark:border-neutral-800 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Rule Name */}
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {rule.name}
                      </h3>
                      {rule.enabled ? (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded">
                          Disabled
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                      {rule.description}
                    </p>

                    {/* Data Type & Priority */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${getDataTypeColor(
                          rule.dataType
                        )}`}
                      >
                        {getDataTypeLabel(rule.dataType)}
                      </span>
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">
                        Priority: {rule.priority}
                      </span>
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">
                        {rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggleEnabled(rule.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        rule.enabled
                          ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                      title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                    >
                      {rule.enabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setEditingRule(rule)}
                      className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Edit rule"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingRule(rule)}
                      className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete rule"
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

// Import Dialog Component
const ImportDialog: React.FC<{
  onImport: (json: string) => void;
  onCancel: () => void;
}> = ({ onImport, onCancel }) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setJsonText(text);
      setError('');
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    try {
      JSON.parse(jsonText); // Validate JSON
      onImport(jsonText);
    } catch {
      setError('Invalid JSON format');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-2xl w-full border border-neutral-200 dark:border-neutral-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Import Rules</h3>
          <button
            onClick={onCancel}
            className="p-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Upload JSON File
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="block w-full text-sm text-neutral-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900/30 dark:file:text-purple-300"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Or Paste JSON
          </label>
          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setError('');
            }}
            placeholder='{"version": 1, "rules": [...]}'
            className="w-full h-48 px-3 py-2 text-sm font-mono bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-neutral-900 dark:text-white"
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!jsonText}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
};
