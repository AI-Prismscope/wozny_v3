# Schema Confirmation Dialog Fix

## 🐛 Issue

When uploading a CSV file for the first time, the schema confirmation dialog was being skipped and the app went straight to the report tab. The dialog only appeared on the second upload.

## 🔍 Root Cause

In `src/lib/store/useWoznyStore.ts`, the `setCsvData` function had logic that auto-applied high-confidence classifications (>80%) without showing the confirmation dialog:

```typescript
// OLD LOGIC (INCORRECT)
if (classification && classification.confidence > 80) {
    // High confidence: auto-apply and show notification
    storeClassification(fileName, classification, false);
    state.showClassificationNotification = true;
    state.showClassificationDialog = false; // ❌ Dialog skipped!
} else if (classification) {
    // Low confidence: show confirmation dialog
    state.showClassificationDialog = true;
}
```

This meant:
- **First upload** with high confidence (>80%): Dialog skipped, went straight to report
- **Second upload** (same file): Used stored classification, showed notification
- **First upload** with low confidence (<80%): Dialog shown correctly

## ✅ Solution

Changed the logic to **always show the confirmation dialog** for first-time uploads, regardless of confidence level:

```typescript
// NEW LOGIC (CORRECT)
if (stored) {
    // File previously uploaded: show notification
    state.showClassificationNotification = true;
    state.showClassificationDialog = false;
} else {
    // First time upload: ALWAYS show confirmation dialog
    classification = classifySchema(data, columns);
    state.schemaClassification = classification;
    
    if (classification) {
        state.showClassificationNotification = false;
        state.showClassificationDialog = true; // ✅ Always show dialog
    }
}
```

## 📋 Changes Made

### File: `src/lib/store/useWoznyStore.ts`

#### 1. Simplified First-Time Upload Logic
**Before:**
- High confidence (>80%): Auto-apply, skip dialog
- Low confidence (<80%): Show dialog

**After:**
- All first-time uploads: Show dialog
- User must confirm or change the data type

#### 2. Fixed Analytics Tracking
**Before:**
```typescript
isChange ? { previousType: state.schemaClassification.dataType } : undefined
```
This was incorrect because `state.schemaClassification.dataType` was already updated to the new type.

**After:**
```typescript
const previousType = state.schemaClassification.dataType;
const isChange = previousType !== dataType;
// ...
isChange ? { previousType } : undefined
```
Now correctly captures the previous type before updating.

## 🎯 Expected Behavior

### First Upload (New File)
```
1. User uploads CSV
2. Schema classification runs
3. ✅ Confirmation dialog appears
4. User sees suggested type and confidence
5. User confirms or changes type
6. Classification stored
7. Notification shown
8. Navigate to report tab
```

### Subsequent Uploads (Same File)
```
1. User uploads same CSV
2. Stored classification retrieved
3. ✅ Notification shown (no dialog)
4. Navigate to report tab
```

### User Changes Classification
```
1. User clicks "Change Settings" in notification
2. ✅ Dialog appears
3. User selects different type
4. Analytics tracks as "CLASSIFICATION_CHANGED"
5. New classification stored
6. Notification updated
```

## 🧪 Testing Scenarios

### Test 1: First Upload
- [x] Upload a new CSV file
- [x] Confirmation dialog should appear
- [x] Dialog shows suggested data type
- [x] Dialog shows confidence percentage
- [x] Dialog shows indicators

### Test 2: Confirm Suggested Type
- [x] Click "Confirm" with suggested type
- [x] Dialog closes
- [x] Notification appears
- [x] Navigate to report tab
- [x] Analytics tracks "CLASSIFICATION_CONFIRMED"

### Test 3: Change Data Type
- [x] Select different data type in dialog
- [x] Click "Confirm"
- [x] Dialog closes
- [x] Notification shows new type
- [x] Analytics tracks "CLASSIFICATION_CHANGED"

### Test 4: Re-upload Same File
- [x] Upload the same CSV again
- [x] No dialog appears
- [x] Notification shows stored classification
- [x] Navigate to report tab

### Test 5: Change Settings from Notification
- [x] Click "Change Settings" in notification
- [x] Dialog appears
- [x] Can change data type
- [x] Confirmation updates stored classification

## 📊 User Flow Comparison

### Before Fix
```
Upload CSV (first time, high confidence)
  ↓
❌ No dialog shown
  ↓
Auto-applied classification
  ↓
Notification shown
  ↓
Report tab

Upload CSV (second time)
  ↓
✅ Dialog shown (from stored classification)
  ↓
User confused why dialog appears now
```

### After Fix
```
Upload CSV (first time)
  ↓
✅ Dialog shown
  ↓
User confirms or changes type
  ↓
Classification stored
  ↓
Notification shown
  ↓
Report tab

Upload CSV (second time)
  ↓
Notification shown (no dialog)
  ↓
Consistent experience
```

## 🎨 UI/UX Improvements

### Dialog Always Appears First
- ✅ User is always aware of classification
- ✅ User can review confidence and indicators
- ✅ User can change type if needed
- ✅ Consistent experience every time

### Notification for Stored Classifications
- ✅ Faster workflow for repeated uploads
- ✅ User can still change settings if needed
- ✅ Clear indication that classification is stored

### Analytics Tracking
- ✅ Tracks when user confirms suggested type
- ✅ Tracks when user changes type
- ✅ Correctly captures previous type on changes

## 🔄 Workflow Levels

This fix aligns with the three-level approach in the quickstart guide:

### Level 1: Out of the Box
1. Upload CSV
2. **See confirmation dialog** ✅
3. Click "Confirm" (accept suggestion)
4. View report
5. Go to Workshop
6. Export

### Level 2: Light Customization
1. Upload CSV
2. **See confirmation dialog** ✅
3. **Review and adjust data type** ✅
4. Click "Confirm"
5. Use AI features
6. Export

### Level 3: Full Control
1. Create custom rules (optional)
2. Upload CSV
3. **See confirmation dialog** ✅
4. **Change data type if needed** ✅
5. Fine-tune in Workshop
6. Advanced AI queries
7. Export

## 📝 Code Changes Summary

### Modified Functions

#### `setCsvData`
- Removed auto-apply logic for high confidence
- Always show dialog for first-time uploads
- Simplified conditional logic

#### `confirmClassification`
- Fixed analytics tracking for type changes
- Correctly captures previous type before update

### Removed Logic
- ❌ Auto-apply for high confidence (>80%)
- ❌ Automatic storage without user confirmation
- ❌ Automatic analytics tracking on auto-apply

### Added Logic
- ✅ Always show dialog for new files
- ✅ Store classification only after user confirmation
- ✅ Track analytics only after user action

## ✅ Verification

### Before Fix
```bash
# Upload new CSV
# Result: Goes straight to report (wrong)
```

### After Fix
```bash
# Upload new CSV
# Result: Shows confirmation dialog (correct)
```

## 🎉 Summary

The schema confirmation dialog now appears **every time** a user uploads a new CSV file, giving them the opportunity to:
- Review the suggested data type
- See the confidence level
- View the indicators
- Confirm or change the classification

This provides a consistent, predictable user experience that aligns with the three-level workflow described in the quickstart guide.

**Issue resolved!** ✅
