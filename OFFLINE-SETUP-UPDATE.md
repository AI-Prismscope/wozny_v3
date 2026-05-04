# Offline Setup - Updated Instructions

## ✅ Changes Made

### Updated Offline Section in QuickstartSidebar

**Location:** `src/features/about/components/QuickstartSidebar.tsx`

### New Instructions (Corrected)

#### First Time Setup:
1. Connect to internet
2. **Load models** (click button)
3. Models download (~50MB)
4. See "Ready" indicator
5. Disconnect from internet
6. Upload CSV and proceed

#### Previous (Incorrect):
1. Connect to internet
2. ~~Upload any CSV~~ ❌
3. Models download (~50MB)
4. See "Ready" indicator

---

## 🆕 Load Models Button

### Visual Design
```
┌──────────────────────────────────┐
│ 🔌 Working Offline               │
│ [Collapse ▲]                     │
│                                  │
│ First Time Setup:                │
│ 1. Connect to internet           │
│ 2. Load models (see below)       │
│ 3. Models download (~50MB)       │
│ 4. See "Ready" indicator         │
│ 5. Disconnect from internet      │
│ 6. Upload CSV and proceed        │
│                                  │
│ ┌──────────────────────────────┐ │
│ │  🌐 Load Models              │ │
│ └──────────────────────────────┘ │
│                                  │
│ After Setup:                     │
│ ✅ Works offline                 │
│ ✅ 100% private                  │
│ ✅ All features available        │
└──────────────────────────────────┘
```

### Button Styling
- **Color**: Purple (`bg-purple-600`)
- **Icon**: Wifi icon
- **Text**: "Load Models"
- **Full width** within the accordion section
- **Hover effect**: Darker purple (`hover:bg-purple-700`)

---

## 🔧 Implementation Status

### Current State
The button is implemented with a **placeholder action** that shows an alert:

```tsx
onClick={() => {
    alert('Model loading will be implemented. This will download ~50MB of AI models for offline use.');
}}
```

### TODO: Connect to Model Loading Logic

The button needs to be connected to the embeddings worker. Here's the implementation plan:

```tsx
// Example implementation (to be added)
const loadModels = async () => {
    // 1. Create worker instance
    const worker = new Worker(
        new URL('@/lib/ai/embeddings.worker.ts', import.meta.url)
    );
    
    // 2. Listen for progress and ready status
    worker.onmessage = (event: MessageEvent<MLResponse>) => {
        const { status, progress, device } = event.data;
        
        if (status === 'working' && progress) {
            // Update UI with progress (0-100)
            console.log(`Loading: ${progress}%`);
        }
        
        if (status === 'ready') {
            // Show "Ready" indicator
            console.log(`Models loaded on ${device}`);
            // Update UI to show ready state
        }
        
        if (status === 'error') {
            // Show error message
            console.error('Model loading failed');
        }
    };
    
    // 3. Trigger model loading with a test request
    worker.postMessage({
        type: 'feature-extraction',
        data: ['test'],
        requestId: 'preload-models'
    } as MLRequest);
};
```

### Integration Points

1. **State Management**: Add loading state to track:
   - `isLoading: boolean` - Models are downloading
   - `isReady: boolean` - Models are cached and ready
   - `progress: number` - Download progress (0-100)
   - `device: 'webgpu' | 'wasm'` - Which device is being used

2. **UI Updates**:
   - Show progress bar during download
   - Change button to "Loading... 45%" during download
   - Show "✅ Ready" indicator when complete
   - Disable button when already loaded

3. **Persistence**: Check if models are already cached:
   - Use IndexedDB or localStorage to track if models were loaded
   - Skip download if already cached
   - Show "Already Loaded" state

---

## 📝 Updated Documentation

### QUICK-START-GUIDE.md
Updated the offline section to reflect the correct process:

```markdown
## 🔌 Working Offline (All Levels)

### First-Time Setup (One-Time, 2-3 minutes)
1. Connect to internet
2. Click "Load Models" button (in About page offline section)
3. AI models download automatically (~50MB)
4. Wait for "Ready" indicator
5. Disconnect from internet
6. Upload your CSV and proceed
```

---

## 🎯 User Experience Flow

### Before Implementation (Current)
```
User clicks "Load Models"
  ↓
Alert shows: "Model loading will be implemented..."
  ↓
User clicks OK
  ↓
Nothing happens (placeholder)
```

### After Implementation (Target)
```
User clicks "Load Models"
  ↓
Button changes to "Loading... 0%"
  ↓
Progress updates: "Loading... 25%", "Loading... 50%", etc.
  ↓
Models download (~50MB, 2-3 minutes)
  ↓
Button changes to "✅ Models Ready"
  ↓
"Ready" indicator appears in section
  ↓
User can now work offline
```

---

## 🚀 Next Steps

### To Complete the Implementation:

1. **Create a model loading service** (e.g., `src/lib/ai/model-loader.ts`)
   - Wrap worker communication
   - Handle progress updates
   - Manage loading state

2. **Add state management** to QuickstartSidebar
   - Track loading progress
   - Show ready indicator
   - Persist loaded state

3. **Update UI components**
   - Progress bar during download
   - Success/error messages
   - Disable button when loaded

4. **Test offline functionality**
   - Verify models are cached
   - Test with network disabled
   - Confirm all features work

5. **Add error handling**
   - Network errors
   - Storage quota exceeded
   - WebGPU not available (fallback to WASM)

---

## 📚 Related Files

### Modified
- `src/features/about/components/QuickstartSidebar.tsx` - Added Load Models button
- `QUICK-START-GUIDE.md` - Updated offline instructions

### Reference
- `src/lib/ai/embeddings.worker.ts` - Model loading implementation
- `src/lib/ai/ml-types.ts` - Type definitions for ML requests/responses

### To Create
- `src/lib/ai/model-loader.ts` - Service to manage model loading (recommended)

---

## 💡 Technical Notes

### Model Loading Process
The embeddings worker (`embeddings.worker.ts`) handles model loading automatically when a request is made:

1. **First Request**: Triggers model download
   - Tries WebGPU first (faster)
   - Falls back to WASM if WebGPU unavailable
   - Reports progress via `progress_callback`
   - Sends 'ready' status when complete

2. **Subsequent Requests**: Uses cached model
   - Models cached in browser (IndexedDB)
   - No re-download needed
   - Instant initialization

### Model Details
- **Model**: `Xenova/all-MiniLM-L6-v2`
- **Size**: ~50MB
- **Purpose**: Feature extraction for ML grouping
- **Quantized**: Yes (smaller size, faster)
- **Cache**: Browser cache (persistent)

---

## ✅ Summary

The offline section has been updated with:
- ✅ Correct instructions (Load Models button, not upload CSV)
- ✅ Purple "Load Models" button added
- ✅ Placeholder action with alert
- ✅ Updated documentation
- ⏳ TODO: Connect to actual model loading logic

**The UI is ready, the worker exists, just needs to be connected!**
