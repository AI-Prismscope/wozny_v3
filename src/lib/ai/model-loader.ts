import { MLRequest, MLResponse } from './ml-types';

export type ModelLoadingStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ModelLoadingState {
    status: ModelLoadingStatus;
    progress: number;
    device?: 'webgpu' | 'wasm';
    error?: string;
    embeddingsReady?: boolean;  // Embeddings model status
    llmReady?: boolean;          // LLM model status
}

type LoadingCallback = (state: ModelLoadingState) => void;

class ModelLoaderService {
    private worker: Worker | null = null;
    private callbacks: Set<LoadingCallback> = new Set();
    private currentState: ModelLoadingState = {
        status: 'idle',
        progress: 0,
        embeddingsReady: false,
        llmReady: false
    };

    /**
     * Subscribe to model loading state updates
     */
    subscribe(callback: LoadingCallback): () => void {
        this.callbacks.add(callback);
        // Immediately call with current state
        callback(this.currentState);
        
        // Return unsubscribe function
        return () => {
            this.callbacks.delete(callback);
        };
    }

    /**
     * Notify all subscribers of state change
     */
    private notifySubscribers(state: ModelLoadingState) {
        this.currentState = state;
        this.callbacks.forEach(callback => callback(state));
    }

    /**
     * Initialize the worker if not already created
     */
    private initializeWorker() {
        if (this.worker) return;

        this.worker = new Worker(
            new URL('./embeddings.worker.ts', import.meta.url),
            { type: 'module' }
        );

        this.worker.onmessage = (event: MessageEvent<MLResponse>) => {
            const { status, progress, device, error, task } = event.data;

            if (status === 'working' && task === 'loading-model') {
                this.notifySubscribers({
                    status: 'loading',
                    progress: progress || 0
                });
            }

            if (status === 'ready') {
                this.notifySubscribers({
                    status: 'ready',
                    progress: 100,
                    device: device,
                    embeddingsReady: true
                });
            }

            if (status === 'error') {
                this.notifySubscribers({
                    status: 'error',
                    progress: 0,
                    error: error || 'Unknown error occurred'
                });
            }
        };

        this.worker.onerror = (error) => {
            this.notifySubscribers({
                status: 'error',
                progress: 0,
                error: error.message || 'Worker error occurred'
            });
        };
    }

    /**
     * Load the ML models by triggering a test extraction
     */
    async loadModels(): Promise<void> {
        // If embeddings already ready, don't reload
        if (this.currentState.embeddingsReady) {
            console.log('✅ Embeddings model already loaded, skipping reload');
            return;
        }

        // If already loading, don't start again
        if (this.currentState.status === 'loading') {
            console.log('⏳ Embeddings model already loading, skipping duplicate request');
            return;
        }

        console.log('🆕 Loading embeddings model for the first time...');
        this.initializeWorker();

        this.notifySubscribers({
            status: 'loading',
            progress: 0
        });

        // Trigger model loading with a test request
        const request: MLRequest = {
            requestId: 'preload-models',
            type: 'feature-extraction',
            data: ['test']
        };

        this.worker?.postMessage(request);
    }

    /**
     * Get current loading state
     */
    getState(): ModelLoadingState {
        return this.currentState;
    }

    /**
     * Check if models are ready
     */
    isReady(): boolean {
        return this.currentState.embeddingsReady === true;
    }

    /**
     * Check if embeddings model is ready
     */
    isEmbeddingsReady(): boolean {
        return this.currentState.embeddingsReady === true;
    }

    /**
     * Get the worker instance (creates if needed)
     * This allows other parts of the app to reuse the same worker
     */
    getWorker(): Worker {
        this.initializeWorker();
        return this.worker!;
    }

    /**
     * Terminate the worker (cleanup)
     */
    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.callbacks.clear();
        this.currentState = {
            status: 'idle',
            progress: 0,
            embeddingsReady: false,
            llmReady: false
        };
    }
}

// Export singleton instance
export const modelLoader = new ModelLoaderService();
