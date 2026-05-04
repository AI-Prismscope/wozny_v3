# File Re-upload Fix

## 🐛 Issue

After canceling the "Confirm Data Type" dialog, trying to upload the same file again would not work. The dialog wouldn't appear and the upload wouldn't happen.

## 🔍 Root Cause

The browser's file input element doesn't trigger the `onChange` event when you select the same file twice in a row. This is standard browser behavior - the input value hasn't changed, so no change event is fired.

```html
<!-- BEFORE -->
<input type="file" onChange={handleFile} />

User selects "data.csv" → onChange fires ✅
User cancels dialog
User selects "data.csv" again → onChange doesn't fire ❌ (same file!)
```

## ✅ Solution

Reset the input value to an empty string after handling the file. This allows the same file to be selected again and trigger the `onChange` event.

```typescript
// AFTER
<input 
  type="file" 
  onChange={(e) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
      e.target.value = '';  // ✅ Reset to allow re-upload
    }
  }}
/>
```

---

## 📝 Changes Made

### File: `src/features/upload/views/UploadView.tsx`

#### Updated File Input Handler

**Before:**
```tsx
<input
  type="file"
  accept=".csv"
  className="hidden"
  id="file-upload"
  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
/>
```

**After:**
```tsx
<input
  type="file"
  accept=".csv"
  className="hidden"
  id="file-upload"
  onChange={(e) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
      // Reset input value to allow re-uploading the same file
      e.target.value = '';
    }
  }}
/>
```

**Key Change:**
- Added `e.target.value = ''` after handling the file
- This resets the input, allowing the same file to be selected again

---

## 🎯 Expected Behavior

### Scenario 1: Cancel and Re-upload Same File
```
1. User uploads "data.csv"
   ↓
2. Dialog appears
   ↓
3. User clicks Cancel/X
   ↓
4. Dialog closes
   ↓
5. User uploads "data.csv" again
   ↓
6. ✅ onChange fires (input was reset)
   ↓
7. ✅ Dialog appears again
   ↓
8. User can confirm or cancel again
```

### Scenario 2: Cancel and Upload Different File
```
1. User uploads "data1.csv"
   ↓
2. Dialog appears
   ↓
3. User clicks Cancel/X
   ↓
4. Dialog closes
   ↓
5. User uploads "data2.csv"
   ↓
6. ✅ onChange fires (different file)
   ↓
7. ✅ Dialog appears
```

### Scenario 3: Confirm and Re-upload Same File
```
1. User uploads "data.csv"
   ↓
2. Dialog appears
   ↓
3. User clicks Confirm
   ↓
4. Navigate to Report tab
   ↓
5. User goes back to Upload tab
   ↓
6. User uploads "data.csv" again
   ↓
7. ✅ onChange fires (input was reset)
   ↓
8. ✅ Navigate to Report (stored classification)
```

---

## 🔄 Browser Behavior

### Standard File Input Behavior

**Without Reset:**
```
Select file A → onChange fires ✅
Select file A again → onChange doesn't fire ❌
Select file B → onChange fires ✅
Select file A again → onChange fires ✅ (different from last)
```

**With Reset (Our Fix):**
```
Select file A → onChange fires ✅ → Reset value
Select file A again → onChange fires ✅ → Reset value
Select file A again → onChange fires ✅ → Reset value
(Works every time!)
```

---

## 🧪 Testing Scenarios

### Test 1: Cancel and Re-upload Same File
- [x] Upload "test.csv"
- [x] Dialog appears
- [x] Click Cancel
- [x] Upload "test.csv" again
- [x] Dialog appears again ✅
- [x] Can confirm or cancel

### Test 2: Cancel Multiple Times
- [x] Upload "test.csv"
- [x] Click Cancel
- [x] Upload "test.csv" again
- [x] Click Cancel
- [x] Upload "test.csv" again
- [x] Dialog appears each time ✅

### Test 3: Confirm and Re-upload
- [x] Upload "test.csv"
- [x] Click Confirm
- [x] Navigate to Report
- [x] Go back to Upload
- [x] Upload "test.csv" again
- [x] Navigate to Report (stored) ✅

### Test 4: Different Files
- [x] Upload "file1.csv"
- [x] Click Cancel
- [x] Upload "file2.csv"
- [x] Dialog appears ✅
- [x] Works normally

### Test 5: Drag and Drop
- [x] Drag "test.csv"
- [x] Click Cancel
- [x] Drag "test.csv" again
- [x] Dialog appears ✅
- [x] Works normally

---

## 🎨 User Experience

### Before Fix
```
User uploads file
  ↓
User cancels dialog
  ↓
User tries to upload same file
  ↓
❌ Nothing happens
  ↓
❌ User confused
  ↓
❌ Must select different file or refresh page
```

### After Fix
```
User uploads file
  ↓
User cancels dialog
  ↓
User tries to upload same file
  ↓
✅ Upload works normally
  ↓
✅ Dialog appears again
  ✅ User can proceed
```

---

## 🔧 Technical Details

### File Input Reset

**Why Reset Works:**
```javascript
// Before reset
input.value = "C:\\fakepath\\data.csv"
// User selects same file
input.value = "C:\\fakepath\\data.csv"  // No change!
// onChange doesn't fire

// After reset
input.value = ""  // Reset to empty
// User selects file
input.value = "C:\\fakepath\\data.csv"  // Changed!
// onChange fires ✅
```

### Security Note

Resetting the input value is safe and doesn't affect:
- File data (already processed)
- File object (already passed to handler)
- User's file system (read-only access)

It only clears the input's internal value, allowing re-selection.

### Alternative Approaches

**Option 1: Reset on Cancel (Not Used)**
```typescript
// Reset only when user cancels
dismissClassificationNotification: () => {
  // Reset file input
  document.getElementById('file-upload').value = '';
}
```
❌ Requires DOM access from store (not ideal)

**Option 2: Reset After Handle (Used)**
```typescript
// Reset immediately after handling
onChange={(e) => {
  handleFile(e.target.files[0]);
  e.target.value = '';  // ✅ Clean, simple
}}
```
✅ Works for all scenarios (cancel, confirm, error)

**Option 3: Use Key Prop (Not Used)**
```tsx
// Force re-render with key
<input key={uploadKey} />
```
❌ More complex, unnecessary re-renders

---

## 📊 Impact

### Affected Scenarios

**Fixed:**
- ✅ Cancel and re-upload same file
- ✅ Error and re-upload same file
- ✅ Multiple cancels with same file
- ✅ Confirm and re-upload same file

**Unchanged:**
- ✅ Upload different files (already worked)
- ✅ Drag and drop (uses same handler)
- ✅ First-time upload (already worked)

---

## 📝 Code Changes Summary

### Modified Files

#### `src/features/upload/views/UploadView.tsx`
- Updated `onChange` handler for file input
- Added `e.target.value = ''` after handling file
- Added comment explaining the reset

### No Changes Needed

#### `src/lib/store/useWoznyStore.ts`
- No changes needed
- Store logic works correctly

#### `src/components/ui/ClassificationConfirmDialog.tsx`
- No changes needed
- Dialog works correctly

---

## ✅ Verification

### Before Fix
```bash
# Upload file, cancel, try to upload same file
# Result: Nothing happens (wrong)
```

### After Fix
```bash
# Upload file, cancel, try to upload same file
# Result: Upload works, dialog appears (correct)
```

---

## 🎉 Summary

The file re-upload issue is now fixed:
- ✅ Can upload the same file multiple times
- ✅ Works after canceling dialog
- ✅ Works after errors
- ✅ Works with both file picker and drag-and-drop
- ✅ Simple, clean solution (one line of code)

**Users can now re-upload the same file as many times as they want!** 🎉
