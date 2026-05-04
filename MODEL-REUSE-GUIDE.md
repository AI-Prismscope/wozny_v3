# Model Reuse - Implementation Guide

## 🎯 Goal

Ensure that once models are loaded (via "Load Models" button or first use), they are reused across all features (Ask Wozny, clustering, etc.) without reloading.

## ✅ Solution

The `modelLoader` service is a singleton that manages a single worker instance. All features should use this shared worker to avoid creating multiple workers and reloading models.

---

## 📝 Current Implementation

### Model Loader Service (`src/lib/ai/model-loader.ts`)

The service provides:

1. **Singleton Worker**: One worker instance shared across the app
2. **State Management**: Tracks loading status (idle/loading/ready/error)
3. **Worker Reuse**: Checks if worker exists before creating new one

```typescript
class ModelLoaderService {
    private worker: Worker | null = null;
    
    private initializeWorker() {
        if (this.worker) return;  // ✅ Reuses existing worker
        
        this.worker = new Worker(
            new URL('./embeddings.worker.ts', import.meta.url),
            { type: 'module' }
        );
    }
    
    getWorker(): Worker {
        this.initializeWorker();
        return this.worker!;
    }
}

export const modelLoader = new ModelLoaderService();
```

### Embeddings Worker (`src/lib/ai/embeddings.worker.ts`)

The worker caches the loaded model:

```typescript
let extractor: unknown = null;  // ✅ Cached model

async function getExtractor(requestId: string) {
    if (!extractor) {  // ✅ Only load if not already loaded
        extractor = await pipeline('feature-extraction', ...);
    }
    return extractor;
}
```

---

## 🔧 How to Use the Shared Worker

### ✅ Correct Usage (Reuses Worker)

```typescript
import { modelLoader } from '@/lib/ai/model-loader';

// Get the shared worker instance
const worker = modelLoader.getWorker();

// Send request
worker.postMessage({
    requestId: 'my-request',
    type: 'feature-extraction',
    data: ['text to process']
});

// Listen for response
worker.onmessage = (event) => {
    const { status, data } = event.data;
    if (status === 'complete') {
        // Use the embeddings
    }
};
```

### ❌ Incorrect Usage (Creates New Worker)

```typescript
// DON'T DO THIS - Creates a new worker!
const worker = new Worker(
    new URL('@/lib/ai/embeddings.worker.ts', import.meta.url)
);
```

---

## 📊 Model Loading Flow

### First Use (Load Models Button)

```
User clicks "Load Models"
  ↓
modelLoader.loadModels()
  ↓
initializeWorker() creates worker
  ↓
Worker loads model (~50MB download)
  ↓
extractor = pipeline(...)  // Cached in worker
  ↓
Status: 'ready'
```

### Subsequent Use (Ask Wozny, Clustering)

```
User uses Ask Wozny
  ↓
Feature calls modelLoader.getWorker()
  ↓
initializeWorker() checks: if (this.worker) return  // ✅ Reuses!
  ↓
Returns existing worker
  ↓
Worker receives request
  ↓
getExtractor() checks: if (!extractor) ...  // ✅ Already loaded!
  ↓
Returns cached extractor
  ↓
No download, instant processing ⚡
```

---

## 🎯 Features That Should Use Shared Worker

### 1. Ask Wozny
**Location:** `src/features/ask-wozny/`

**Should use:**
```typescript
import { modelLoader } from '@/lib/ai/model-loader';

const worker = modelLoader.getWorker();
// Use worker for NLP queries
```

### 2. ML Clustering
**Location:** Wherever clustering is implemented

**Should use:**
```typescript
import { modelLoader } from '@/lib/ai/model-loader';

const worker = modelLoader.getWorker();
worker.postMessage({
    type: 'cluster-texts',
    data: textsToCluster,
    options: { k: 5 }
});
```

### 3. Any Feature Using Embeddings
**Should use:**
```typescript
import { modelLoader } from '@/lib/ai/model-loader';

const worker = modelLoader.getWorker();
// Use for any ML task
```

---

## 🧪 Testing Model Reuse

### Test 1: Load Models Then Use Feature
```
1. Click "Load Models" button
2. Wait for "Models Ready"
3. Go to Ask Wozny
4. Type a query
5. ✅ Should process instantly (no loading)
```

### Test 2: Use Feature Without Pre-loading
```
1. Don't click "Load Models"
2. Go to Ask Wozny
3. Type a query
4. ✅ Models load automatically (first time)
5. Type another query
6. ✅ Should process instantly (reuses loaded models)
```

### Test 3: Multiple Features
```
1. Click "Load Models"
2. Use Ask Wozny
3. ✅ Instant (reuses models)
4. Use Clustering
5. ✅ Instant (reuses models)
6. Use Ask Wozny again
7. ✅ Instant (reuses models)
```

---

## 🔍 Debugging Model Reuse

### Check if Worker is Reused

Add logging to `model-loader.ts`:

```typescript
private initializeWorker() {
    if (this.worker) {
        console.log('✅ Reusing existing worker');
        return;
    }
    
    console.log('🆕 Creating new worker');
    this.worker = new Worker(...);
}
```

### Check if Model is Reused

Add logging to `embeddings.worker.ts`:

```typescript
async function getExtractor(requestId: string) {
    if (!extractor) {
        console.log('🆕 Loading model...');
        extractor = await pipeline(...);
    } else {
        console.log('✅ Reusing cached model');
    }
    return extractor;
}
```

### Expected Console Output

**First Use:**
```
🆕 Creating new worker
🆕 Loading model...
(download progress...)
✅ Model ready
```

**Second Use:**
```
✅ Reusing existing worker
✅ Reusing cached model
(instant processing)
```

---

## 🚨 Common Issues

### Issue 1: Models Reload Every Time

**Cause:** Features creating their own workers instead of using `modelLoader.getWorker()`

**Solution:** Update features to use shared worker:
```typescript
// BEFORE (wrong)
const worker = new Worker(new URL('./embeddings.worker.ts', import.meta.url));

// AFTER (correct)
import { modelLoader } from '@/lib/ai/model-loader';
const worker = modelLoader.getWorker();
```

### Issue 2: Worker Terminated Between Uses

**Cause:** Something calling `modelLoader.terminate()`

**Solution:** Don't terminate the worker unless app is closing:
```typescript
// Only terminate on cleanup
useEffect(() => {
    return () => {
        // Only if component unmounts permanently
        modelLoader.terminate();
    };
}, []);
```

### Issue 3: Multiple Worker Instances

**Cause:** Not using the singleton `modelLoader`

**Solution:** Always import and use the singleton:
```typescript
import { modelLoader } from '@/lib/ai/model-loader';
// NOT: import { ModelLoaderService } from ...
```

---

## 📝 Implementation Checklist

### For Each Feature Using ML:

- [ ] Import `modelLoader` singleton
- [ ] Call `modelLoader.getWorker()` to get worker
- [ ] Use the returned worker for all ML operations
- [ ] Don't create new workers
- [ ] Don't terminate the worker (unless app closing)

### Example Implementation:

```typescript
// src/features/ask-wozny/hooks/useMLQuery.ts
import { modelLoader } from '@/lib/ai/model-loader';
import { useEffect, useState } from 'react';

export function useMLQuery() {
    const [worker, setWorker] = useState<Worker | null>(null);
    
    useEffect(() => {
        // Get shared worker
        const sharedWorker = modelLoader.getWorker();
        setWorker(sharedWorker);
        
        // Don't terminate on unmount - other features might be using it
    }, []);
    
    const query = async (text: string) => {
        if (!worker) return;
        
        worker.postMessage({
            requestId: Date.now().toString(),
            type: 'feature-extraction',
            data: [text]
        });
    };
    
    return { query };
}
```

---

## ✅ Benefits of Shared Worker

1. **Faster Performance**: No model reloading between features
2. **Lower Memory**: One model instance instead of multiple
3. **Better UX**: Instant responses after first load
4. **Consistent State**: Single source of truth for model status
5. **Easier Debugging**: One worker to monitor

---

## 🎉 Summary

The `modelLoader` service provides a singleton worker that:
- ✅ Creates worker once
- ✅ Reuses worker across all features
- ✅ Caches loaded models in worker
- ✅ Provides `getWorker()` method for features to use
- ✅ Tracks loading state globally

**All features should use `modelLoader.getWorker()` to ensure models are loaded once and reused!**
