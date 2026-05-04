import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, FileInput, Settings, BookOpen, Wifi, WifiOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useWoznyStore } from '@/lib/store/useWoznyStore';
import { modelLoader, ModelLoadingState } from '@/lib/ai/model-loader';
import { useWoznyLLM } from '@/lib/ai/useWoznyLLM';

interface AccordionSectionProps {
    title: string;
    icon: string;
    time?: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

const AccordionSection = ({ title, icon, time, defaultOpen = false, children }: AccordionSectionProps) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <div className="text-left">
                        <div className="font-bold text-sm text-neutral-900 dark:text-white">
                            {title}
                        </div>
                        {time && (
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                ⏱️ {time}
                            </div>
                        )}
                    </div>
                </div>
                {isOpen ? (
                    <ChevronDown className="w-5 h-5 text-neutral-500" />
                ) : (
                    <ChevronRight className="w-5 h-5 text-neutral-500" />
                )}
            </button>
            
            {isOpen && (
                <div className="p-4 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700">
                    {children}
                </div>
            )}
        </div>
    );
};

export const QuickstartSidebar = () => {
    const [showFullGuide, setShowFullGuide] = useState(false);
    const [modelState, setModelState] = useState<ModelLoadingState>({
        status: 'idle',
        progress: 0
    });
    const setActiveTab = useWoznyStore((state) => state.setActiveTab);
    
    // Get LLM state
    const { initialize: initializeLLM, isReady: isLLMReady, isLoading: isLLMLoading, progress: llmProgress } = useWoznyLLM();

    // Subscribe to model loading state
    useEffect(() => {
        const unsubscribe = modelLoader.subscribe(setModelState);
        return unsubscribe;
    }, []);

    const handleLoadModels = async () => {
        try {
            console.log('🔄 Load Models button clicked');
            
            // Load embeddings model first
            console.log('📦 Loading embeddings model...');
            await modelLoader.loadModels();
            console.log('✅ Embeddings model load complete');
            
            // Also load LLM model
            if (!isLLMReady && !isLLMLoading) {
                console.log('📦 Loading LLM model...');
                await initializeLLM();
                console.log('✅ LLM model load complete');
            } else if (isLLMReady) {
                console.log('✅ LLM already ready, skipping');
            } else if (isLLMLoading) {
                console.log('⏳ LLM already loading, waiting...');
            }
            
            console.log('🎉 All models loaded successfully');
        } catch (error) {
            console.error('❌ Failed to load models:', error);
        }
    };

    const getLoadButtonContent = () => {
        // Show LLM loading if it's loading
        if (isLLMLoading) {
            return (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading LLM... {llmProgress}
                </>
            );
        }
        
        // Show embeddings loading
        if (modelState.status === 'loading') {
            return (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading... {modelState.progress}%
                </>
            );
        }
        
        // Show ready if both are ready
        if (modelState.status === 'ready' && isLLMReady) {
            return (
                <>
                    <CheckCircle2 className="w-4 h-4" />
                    All Models Ready ({modelState.device?.toUpperCase()})
                </>
            );
        }
        
        // Show partial ready
        if (modelState.status === 'ready' && !isLLMReady) {
            return (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading LLM...
                </>
            );
        }
        
        if (modelState.status === 'error') {
            return (
                <>
                    <AlertCircle className="w-4 h-4" />
                    Retry Loading
                </>
            );
        }
        
        return (
            <>
                <Wifi className="w-4 h-4" />
                Load Models
            </>
        );
    };

    const getLoadButtonColor = () => {
        if (modelState.status === 'ready' && isLLMReady) {
            return 'bg-green-600 hover:bg-green-700';
        }
        if (modelState.status === 'error') {
            return 'bg-red-600 hover:bg-red-700';
        }
        if (modelState.status === 'loading' || isLLMLoading) {
            return 'bg-purple-600 cursor-wait';
        }
        return 'bg-purple-600 hover:bg-purple-700';
    };
    
    const isButtonDisabled = modelState.status === 'loading' || isLLMLoading || (modelState.status === 'ready' && isLLMReady);

    return (
        <>
            <div className="space-y-3">
                {/* Level 1: Out of the Box */}
                <AccordionSection
                    title="Level 1: Out of the Box"
                    icon="🟢"
                    time="2 minutes"
                    defaultOpen={true}
                >
                    <div className="space-y-3 text-sm">
                        <p className="text-neutral-600 dark:text-neutral-300">
                            Perfect for first-time users
                        </p>
                        
                        <div className="space-y-2">
                            <div className="font-semibold text-neutral-900 dark:text-white">Steps:</div>
                            <ol className="list-decimal list-inside space-y-1 text-neutral-600 dark:text-neutral-400">
                                <li>Upload CSV</li>
                                <li>Accept schema</li>
                                <li>View report</li>
                                <li>Go to Workshop</li>
                                <li>Export</li>
                            </ol>
                        </div>

                        <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                ✅ Zero configuration
                            </div>
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                ✅ Fully automatic
                            </div>
                        </div>

                        <button
                            onClick={() => setActiveTab('upload')}
                            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            <FileInput className="w-4 h-4" />
                            Try Level 1 Now
                        </button>
                    </div>
                </AccordionSection>

                {/* Level 2: Light Customization */}
                <AccordionSection
                    title="Level 2: Light Customization"
                    icon="🟡"
                    time="5 minutes"
                >
                    <div className="space-y-3 text-sm">
                        <p className="text-neutral-600 dark:text-neutral-300">
                            Add AI assistance & control
                        </p>
                        
                        <div className="space-y-2">
                            <div className="font-semibold text-neutral-900 dark:text-white">Steps:</div>
                            <ol className="list-decimal list-inside space-y-1 text-neutral-600 dark:text-neutral-400">
                                <li>Upload CSV</li>
                                <li>Review & adjust schema</li>
                                <li>Use AI features:
                                    <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                                        <li>Ask Wozny</li>
                                        <li>ML grouping</li>
                                        <li>Smart filters</li>
                                    </ul>
                                </li>
                                <li>Export</li>
                            </ol>
                        </div>

                        <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                ✅ AI-powered
                            </div>
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                ✅ Some control
                            </div>
                        </div>

                        <button
                            onClick={() => setActiveTab('upload')}
                            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            <FileInput className="w-4 h-4" />
                            Try Level 2 Now
                        </button>
                    </div>
                </AccordionSection>

                {/* Level 3: Full Control */}
                <AccordionSection
                    title="Level 3: Full Control"
                    icon="🔴"
                    time="15+ minutes"
                >
                    <div className="space-y-3 text-sm">
                        <p className="text-neutral-600 dark:text-neutral-300">
                            Power user features
                        </p>
                        
                        <div className="space-y-2">
                            <div className="font-semibold text-neutral-900 dark:text-white">Steps:</div>
                            <ol className="list-decimal list-inside space-y-1 text-neutral-600 dark:text-neutral-400">
                                <li>Create custom rules</li>
                                <li>Upload CSV</li>
                                <li>Fine-tune in Workshop</li>
                                <li>Advanced AI queries</li>
                                <li>Batch processing</li>
                                <li>Export</li>
                            </ol>
                        </div>

                        <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                ✅ Custom rules
                            </div>
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                ✅ Templates
                            </div>
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                ✅ Analytics
                            </div>
                        </div>

                        <button
                            onClick={() => setActiveTab('settings')}
                            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            <Settings className="w-4 h-4" />
                            Go to Settings
                        </button>
                    </div>
                </AccordionSection>

                {/* Working Offline */}
                <AccordionSection
                    title="Working Offline"
                    icon="🔌"
                >
                    <div className="space-y-3 text-sm">
                        <div className="space-y-2">
                            <div className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                                <Wifi className="w-4 h-4" />
                                First Time Setup:
                            </div>
                            <ol className="list-decimal list-inside space-y-1 text-neutral-600 dark:text-neutral-400">
                                <li>Connect to internet</li>
                                <li>Load models (see button below)</li>
                                <li>Embeddings model downloads (~50MB)</li>
                                <li>LLM model downloads (~600MB)</li>
                                <li>See "All models ready" indicator</li>
                                <li>Disconnect from internet</li>
                                <li>Upload CSV and proceed</li>
                            </ol>
                        </div>

                        <button
                            onClick={handleLoadModels}
                            disabled={isButtonDisabled}
                            className={`w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-75 ${getLoadButtonColor()}`}
                        >
                            {getLoadButtonContent()}
                        </button>

                        {modelState.status === 'error' && modelState.error && (
                            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
                                Error: {modelState.error}
                            </div>
                        )}

                        {modelState.status === 'ready' && isLLMReady && (
                            <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs text-green-700 dark:text-green-300 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                All models ready for offline use!
                            </div>
                        )}

                        <div className="space-y-2">
                            <div className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                                <WifiOff className="w-4 h-4" />
                                After Setup:
                            </div>
                            <div className="space-y-1 text-xs">
                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                    ✅ Works offline
                                </div>
                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                    ✅ 100% private
                                </div>
                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                    ✅ All features available
                                </div>
                            </div>
                        </div>
                    </div>
                </AccordionSection>

                {/* Full Guide Link */}
                <button
                    onClick={() => setShowFullGuide(true)}
                    className="w-full flex items-center justify-center gap-2 p-4 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors border border-neutral-200 dark:border-neutral-700"
                >
                    <BookOpen className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                    <span className="font-semibold text-sm text-neutral-900 dark:text-white">
                        View Full Guide
                    </span>
                </button>
            </div>

            {/* Full Guide Modal */}
            {showFullGuide && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
                            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                                Quick Start Guide
                            </h2>
                            <button
                                onClick={() => setShowFullGuide(false)}
                                className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 text-2xl"
                            >
                                ×
                            </button>
                        </div>
                        <div className="overflow-y-auto p-6">
                            <div className="prose dark:prose-invert max-w-none">
                                <p className="text-lg text-neutral-600 dark:text-neutral-300">
                                    For detailed documentation, see the <code>QUICK-START-GUIDE.md</code> file in the project root.
                                </p>
                                <p className="text-neutral-600 dark:text-neutral-400">
                                    This guide covers all three levels in detail, including examples, FAQs, and advanced features.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
