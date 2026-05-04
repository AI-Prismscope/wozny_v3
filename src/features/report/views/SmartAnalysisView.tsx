
import React, { useState } from 'react';
import { useWoznyStore } from '@/lib/store/useWoznyStore';
import { useAnalysisStore } from '@/lib/store/useAnalysisStore';
import { useMLWorker } from '@/lib/ai/useEmbeddingsWorker';
import { Sparkles, Play, Loader2 } from 'lucide-react';

export const SmartAnalysisView = () => {
    const columns = useWoznyStore((state) => state.columns);
    const rows = useWoznyStore((state) => state.rows);
    const addColumn = useWoznyStore((state) => state.addColumn);
    const { groupTexts, status, progress } = useMLWorker();

    const [analyzingColumn, setAnalyzingColumn] = useState<string | null>(null);
    const ignoredColumns = useAnalysisStore((state) => state.ignoredColumns);

    // Filter for "interesting" text columns (has more than 5 unique values, logic could be improved)
    const textColumns = columns.filter(col => {
        // Skip ignored columns
        if (ignoredColumns.includes(col)) return false;

        // Just a simple heuristic: is it a string?
        // CSV is always string. Maybe skip 'ID' columns?
        return true;
    });

    const handleAnalyze = async (col: string) => {
        setAnalyzingColumn(col);
        const texts = rows.map(r => r[col] || '');

        try {
            // Check if this is categorical data (few unique values relative to total rows)
            const uniqueValues = new Set(texts.filter(t => t.trim() !== ''));
            const uniqueCount = uniqueValues.size;
            const totalCount = texts.length;
            const uniqueRatio = uniqueCount / totalCount;

            // If less than 20% unique values, treat as categorical (exact grouping)
            // Examples: City names, Status values, Categories
            if (uniqueRatio < 0.2 || uniqueCount <= 10) {
                console.log(`📊 Detected categorical column: ${col} (${uniqueCount} unique values)`);
                
                // Small delay to show UI feedback
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Create a mapping of unique values to cluster IDs
                const valueToCluster = new Map<string, number>();
                const sortedUniqueValues = Array.from(uniqueValues).sort();
                sortedUniqueValues.forEach((value, index) => {
                    valueToCluster.set(value, index);
                });

                // Assign cluster IDs based on exact match
                const groupValues = texts.map(text => {
                    const trimmedText = text.trim();
                    if (trimmedText === '') return 'Cluster 0 (Empty)';
                    const clusterId = valueToCluster.get(trimmedText);
                    return `Cluster ${(clusterId ?? 0) + 1}`;
                });

                addColumn(`${col} Group`, groupValues);
            } else {
                // Use semantic clustering for text with high variability
                // Examples: Addresses, Descriptions, Comments
                console.log(`🔍 Using semantic clustering for: ${col} (${uniqueCount} unique values)`);
                
                // Run K-Means (k=5 default for now)
                const clusterIds = await groupTexts(texts, 5);

                // Map IDs to Group Names
                const groupValues = Array.from(clusterIds).map(id => `Cluster ${id + 1}`);

                addColumn(`${col} Group`, groupValues);
            }

        } catch (e) {
            console.error(e);
            alert("Analysis failed. See console.");
        } finally {
            setAnalyzingColumn(null);
        }
    };

    // Helper to determine clustering type for display
    const getClusteringType = (col: string): 'categorical' | 'semantic' => {
        const texts = rows.map(r => r[col] || '');
        const uniqueValues = new Set(texts.filter(t => t.trim() !== ''));
        const uniqueCount = uniqueValues.size;
        const totalCount = texts.length;
        const uniqueRatio = uniqueCount / totalCount;
        
        return (uniqueRatio < 0.2 || uniqueCount <= 10) ? 'categorical' : 'semantic';
    };

    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    Smart Analysis
                </h2>
                <p className="text-neutral-500 text-sm">
                    Use machine learning to discover patterns, group similar items, and clean your data automatically.
                </p>
            </div>

            <div className="space-y-4">
                {textColumns.map(col => {
                    const clusteringType = getClusteringType(col);
                    const uniqueCount = new Set(rows.map(r => r[col] || '').filter(t => t.trim() !== '')).size;
                    
                    return (
                        <div key={col} className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold">{col}</h3>
                                <p className="text-xs text-neutral-400">
                                    {rows.length} entries • {uniqueCount} unique values
                                </p>
                                <p className="text-xs text-neutral-500 mt-1">
                                    {clusteringType === 'categorical' ? (
                                        <span className="text-blue-600 dark:text-blue-400">
                                            📊 Categorical grouping (exact match)
                                        </span>
                                    ) : (
                                        <span className="text-purple-600 dark:text-purple-400">
                                            🔍 Semantic clustering (similarity)
                                        </span>
                                    )}
                                </p>
                            </div>

                            {analyzingColumn === col ? (
                                <div className="flex items-center gap-3">
                                    <div className="text-xs text-purple-500 font-medium">
                                        {clusteringType === 'categorical' 
                                            ? 'Grouping...' 
                                            : (status === 'working' ? `Analyzing ${progress}%` : 'Finalizing...')
                                        }
                                    </div>
                                    <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleAnalyze(col)}
                                    disabled={status === 'working'}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 rounded hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors text-sm font-medium disabled:opacity-50"
                                >
                                    <Play className="w-4 h-4" />
                                    Group by Similarity
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
