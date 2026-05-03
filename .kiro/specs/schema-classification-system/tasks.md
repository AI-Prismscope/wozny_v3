# Implementation Tasks

## Overview

This document breaks down the Schema Classification System implementation into concrete, actionable tasks. Tasks are organized by phase and include acceptance criteria, file paths, and dependencies.

---

## Phase 1: Core Classification Logic

### Task 1.1: Create Schema Classifier Module Structure

**Status:** pending

**Description:** Create the base file and type definitions for the schema classifier.

**Files to Create:**
- `src/lib/schema-classifier.ts`

**Implementation Steps:**
1. Create new file `src/lib/schema-classifier.ts`
2. Add TypeScript enums: `DataType`, `DuplicateDetectionMode`
3. Add TypeScript interfaces: `ClassificationResult`, `ColumnIndicator`, `StoredClassification`, `ClassificationScore`
4. Export all types

**Acceptance Criteria:**
- [ ] File compiles without TypeScript errors
- [ ] All enums and interfaces are properly exported
- [ ] Types match the design document specifications

**Dependencies:** None

---

### Task 1.2: Implement Column Pattern Definitions

**Status:** pending

**Description:** Define the column name patterns for each data type.

**Files to Modify:**
- `src/lib/schema-classifier.ts`

**Implementation Steps:**
1. Create `COLUMN_PATTERNS` constant with patterns for all 4 data types
2. Create `PATTERN_WEIGHTS` constant defining strong (10), medium (5), weak (2) indicators
3. Add JSDoc comments explaining the pattern matching strategy

**Acceptance Criteria:**
- [ ] All 4 data types have comprehensive pattern lists
- [ ] Patterns cover common variations (underscore, hyphen, space separators)
- [ ] Pattern weights are clearly defined

**Dependencies:** Task 1.1

---

### Task 1.3: Implement Column Name Normalization

**Status:** pending

**Description:** Create function to normalize column names for pattern matching.

**Files to Modify:**
- `src/lib/schema-classifier.ts`

**Implementation Steps:**
1. Implement `normalizeColumnName(name: string): string`
2. Convert to lowercase
3. Replace hyphens and spaces with underscores
4. Trim whitespace
5. Add unit tests in `src/lib/schema-classifier.test.ts`

**Acceptance Criteria:**
- [ ] Function handles all separator types (underscore, hyphen, space)
- [ ] Function is case-insensitive
- [ ] Unit tests cover edge cases (empty string, special characters)

**Dependencies:** Task 1.1

---

### Task 1.4: Implement Column Name Analysis

**Status:** pending

**Description:** Analyze column names and calculate scores for each data type.

**Files to Modify:**
- `src/lib/schema-classifier.ts`

**Implementation Steps:**
1. Implement `matchColumnPattern(normalizedName: string, patterns: string[]): boolean`
2. Implement `analyzeColumnNames(columns: string[]): ClassificationScore[]`
3. For each data type, iterate through columns and match patterns
4. Calculate score based on pattern weights
5. Return array of scores (one per data type)
6. Add unit tests

**Acceptance Criteria:**
- [ ] Function returns scores for all 4 data types
- [ ] Scores range from 0-50 as specified in design
- [ ] Strong indicators add 10 points, medium 5, weak 2
- [ ] Unit tests verify scoring logic

**Dependencies:** Task 1.2, Task 1.3

---

### Task 1.5: Implement Uniqueness Ratio Calculation

**Status:** pending

**Description:** Calculate the ratio of unique values to total rows for a column.

**Files to Modify:**
- `src/lib/schema-classifier.ts`

**Implementation Steps:**
1. Implement `calculateUniquenessRatio(rows: Record<string, string>[], column: string): number`
2. Use Set to count unique values
3. Return ratio (unique count / total rows)
4. Add caching using Map to avoid redundant calculations
5. Add unit tests

**Acceptance Criteria:**
- [ ] Function returns value between 0 and 1
- [ ] Caching works correctly (same column returns cached value)
- [ ] Unit tests verify calculation accuracy

**Dependencies:** Task 1.1

---

### Task 1.6: Implement Data Pattern Analysis

**Status:** pending

**Description:** Analyze data patterns (uniqueness ratios) and calculate scores.

**Files to Modify:**
- `src/lib/schema-classifier.ts`

**Implementation Steps:**
1. Implement `analyzeDataPatterns(rows: Record<string, string>[], columns: string[]): ClassificationScore[]`
2. For Customer type: Check if name/email/phone columns have uniqueness > 0.8 (+30 points)
3. For Transaction type: Check if customer/category < 0.3 (+20) AND transaction_id = 1.0 (+30)
4. For Inventory type: Check if SKU/ID > 0.95 (+30) AND category < 0.2 (+20)
5. For Time-Series type: Check if timestamp > 0.9 (+30) AND metric < 0.1 (+20)
6. Return array of scores (one per data type)
7. Add unit tests with sample data for each type

**Acceptance Criteria:**
- [ ] Function returns scores for all 4 data types
- [ ] Scores range from 0-50 as specified in design
- [ ] Logic correctly identifies each data type pattern
- [ ] Unit tests verify each data type is scored correctly

**Dependencies:** Task 1.5

---

### Task 1.7: Implement Score Combination and Confidence Calculation

**Status:** pending

**Description:** Combine column name and data pattern scores, calculate confidence.

**Files to Modify:**
- `src/lib/schema-classifier.ts`

**Implementation Steps:**
1. Implement `combineScores(columnScores: ClassificationScore[], patternScores: ClassificationScore[]): ClassificationScore[]`
2. Add column name score + data pattern score for each data type
3. Implement confidence calculation logic:
   - If highest score > 80: confidence = highest score
   - If highest score 60-80: confidence = highest score - 10
   - If highest score < 60: confidence = highest score - 20
   - If two scores within 10 points: confidence = min(both) - 20
4. Add unit tests

**Acceptance Criteria:**
- [ ] Total scores range from 0-100
- [ ] Confidence calculation follows design specification
- [ ] Ambiguous cases (close scores) reduce confidence
- [ ] Unit tests verify confidence calculation

**Dependencies:** Task 1.4, Task 1.6

---

### Task 1.8: Implement Classification Selection

**Status:** pending

**Description:** Select the best classification based on scores and map to detection mode.

**Files to Modify:**
- `src/lib/schema-classifier.ts`

**Implementation Steps:**
1. Implement `mapDataTypeToDetectionMode(dataType: DataType): DuplicateDetectionMode`
   - Customer → AGGRESSIVE
   - Transaction → CONSERVATIVE
   - Inventory → CONSERVATIVE
   - Time-Series → VERY_CONSERVATIVE
2. Implement `selectBestClassification(scores: ClassificationScore[]): ClassificationResult`
3. Sort scores by total score (descending)
4. Select highest score
5. Map data type to detection mode
6. Return ClassificationResult
7. Add unit tests

**Acceptance Criteria:**
- [ ] Function returns data type with highest score
- [ ] Detection mode is correctly mapped
- [ ] ClassificationResult includes all required fields
- [ ] Unit tests verify selection logic

**Dependencies:** Task 1.7

---

### Task 1.9: Implement Main Classification Function

**Status:** pending

**Description:** Create the main public API function that orchestrates classification.

**Files to Modify:**
- `src/lib/schema-classifier.ts`

**Implementation Steps:**
1. Implement `classifySchema(rows: Record<string, string>[], columns: string[]): ClassificationResult`
2. Handle edge case: < 3 columns → default to Customer with 50% confidence
3. Call `analyzeColumnNames(columns)`
4. Call `analyzeDataPatterns(rows, columns)` with sampled data if > 1000 rows
5. Call `combineScores(columnScores, patternScores)`
6. Call `selectBestClassification(scores)`
7. Add top 3 column indicators to result
8. Add unit tests with sample data for all 4 types

**Acceptance Criteria:**
- [ ] Function correctly classifies customer data (>80% confidence)
- [ ] Function correctly classifies transaction data (>80% confidence)
- [ ] Function correctly classifies inventory data (>80% confidence)
- [ ] Function correctly classifies time-series data (>80% confidence)
- [ ] Function handles edge cases (minimal columns, ambiguous data)
- [ ] Unit tests achieve >90% code coverage

**Dependencies:** Task 1.4, Task 1.6, Task 1.7, Task 1.8

---

### Task 1.10: Implement Row Sampling for Large Files

**Status:** pending

**Description:** Add sampling logic to handle large files efficiently.

**Files to Modify:**
- `src/lib/schema-classifier.ts`

**Implementation Steps:**
1. Implement `sampleRows(rows: Record<string, string>[], maxSamples: number): Record<string, string>[]`
2. If rows.length <= maxSamples, return all rows
3. Otherwise, sample evenly (every Nth row) to get maxSamples rows
4. Integrate into `classifySchema` function
5. Add unit tests

**Acceptance Criteria:**
- [ ] Function returns all rows if count <= maxSamples
- [ ] Function returns evenly distributed sample if count > maxSamples
- [ ] Sample size never exceeds maxSamples
- [ ] Unit tests verify sampling distribution

**Dependencies:** Task 1.9

---

## Phase 2: Duplicate Detector Refactoring

### Task 2.1: Add Detection Mode Parameter to findDuplicateGroups

**Status:** pending

**Description:** Modify the duplicate detection function to accept an optional detection mode.

**Files to Modify:**
- `src/lib/data-quality.ts`

**Implementation Steps:**
1. Add optional parameter `detectionMode?: DuplicateDetectionMode` to `findDuplicateGroups`
2. Default to `DuplicateDetectionMode.AGGRESSIVE` for backward compatibility
3. Import types from `schema-classifier.ts`
4. Update function signature and JSDoc

**Acceptance Criteria:**
- [ ] Function signature includes optional detectionMode parameter
- [ ] Default value is AGGRESSIVE (preserves current behavior)
- [ ] TypeScript compiles without errors
- [ ] Existing tests still pass

**Dependencies:** Task 1.1

---

### Task 2.2: Implement Conservative Detection Mode

**Status:** pending

**Description:** Add logic for conservative mode (exact matching only).

**Files to Modify:**
- `src/lib/data-quality.ts`

**Implementation Steps:**
1. Wrap existing partial duplicate logic in conditional: `if (detectionMode === DuplicateDetectionMode.AGGRESSIVE)`
2. For CONSERVATIVE mode, skip partial matching entirely
3. Only return exact duplicates
4. Add unit tests with transaction data

**Acceptance Criteria:**
- [ ] Conservative mode only finds exact duplicates
- [ ] Conservative mode does NOT flag repeated customer names as duplicates
- [ ] Unit tests verify transaction data with repeated customers has 0 partial duplicates
- [ ] Exact duplicates are still found in conservative mode

**Dependencies:** Task 2.1

---

### Task 2.3: Implement Very Conservative Detection Mode

**Status:** pending

**Description:** Add logic for very conservative mode (timestamp + metric matching).

**Files to Modify:**
- `src/lib/data-quality.ts`

**Implementation Steps:**
1. Add case for `DuplicateDetectionMode.VERY_CONSERVATIVE`
2. Find columns matching timestamp patterns (timestamp, datetime, date, time)
3. Find columns matching metric patterns (metric, value, measurement, reading)
4. If both found, use partial matching on those columns only
5. Otherwise, fall back to exact matching only
6. Add unit tests with time-series data

**Acceptance Criteria:**
- [ ] Very conservative mode matches on timestamp + metric columns
- [ ] If timestamp/metric columns not found, falls back to exact matching
- [ ] Unit tests verify time-series data is handled correctly
- [ ] Different timestamps with same metric are NOT flagged as duplicates

**Dependencies:** Task 2.1

---

### Task 2.4: Update Duplicate Detection Tests

**Status:** pending

**Description:** Add comprehensive tests for all detection modes.

**Files to Modify:**
- `src/lib/data-quality.test.ts` (or create if doesn't exist)

**Implementation Steps:**
1. Add test suite for detection modes
2. Test AGGRESSIVE mode with customer data (should find partial matches)
3. Test CONSERVATIVE mode with transaction data (should NOT find partial matches)
4. Test CONSERVATIVE mode with inventory data (should NOT find partial matches)
5. Test VERY_CONSERVATIVE mode with time-series data (should match timestamp + metric)
6. Test that exact duplicates are found in ALL modes

**Acceptance Criteria:**
- [ ] All 3 detection modes have dedicated test cases
- [ ] Tests verify mode-specific behavior
- [ ] Tests use realistic sample data for each data type
- [ ] All tests pass

**Dependencies:** Task 2.2, Task 2.3

---

## Phase 3: Storage and Persistence

### Task 3.1: Implement Classification Storage Functions

**Status:** pending

**Description:** Create localStorage-based persistence for classification decisions.

**Files to Modify:**
- `src/lib/schema-classifier.ts`

**Implementation Steps:**
1. Define storage constants: `STORAGE_KEY = 'wozny_schema_classifications'`, `STORAGE_VERSION = 1`
2. Define `ClassificationStorage` interface
3. Implement `getStoredClassification(fileName: string): StoredClassification | null`
4. Implement `storeClassification(fileName: string, result: ClassificationResult, userConfirmed: boolean): void`
5. Add try-catch error handling for localStorage failures
6. Add console warnings for storage errors
7. Add unit tests (mock localStorage)

**Acceptance Criteria:**
- [ ] Functions read/write to localStorage correctly
- [ ] Storage format matches design specification
- [ ] Errors are caught and logged without crashing
- [ ] Unit tests verify storage and retrieval
- [ ] Unit tests verify error handling

**Dependencies:** Task 1.1

---

### Task 3.2: Implement Clear Classification Functions

**Status:** pending

**Description:** Add functions to clear stored classifications.

**Files to Modify:**
- `src/lib/schema-classifier.ts`

**Implementation Steps:**
1. Implement `clearStoredClassification(fileName: string): void`
2. Implement `clearAllStoredClassifications(): void`
3. Add error handling
4. Add unit tests

**Acceptance Criteria:**
- [ ] clearStoredClassification removes single entry
- [ ] clearAllStoredClassifications removes all entries
- [ ] Functions handle missing storage gracefully
- [ ] Unit tests verify clearing behavior

**Dependencies:** Task 3.1

---

## Phase 4: UI Components

### Task 4.1: Create ClassificationNotification Component

**Status:** pending

**Description:** Create toast-style notification for auto-applied classifications.

**Files to Create:**
- `src/components/ui/ClassificationNotification.tsx`

**Implementation Steps:**
1. Create component with props: `result`, `onChangeSettings`, `onDismiss`
2. Display data type name and confidence percentage
3. Display detection mode being used
4. Add "Change Settings" button
5. Add "Dismiss" button (X icon)
6. Add auto-dismiss after 5 seconds (unless hovered)
7. Add info icon with tooltip showing top 3 column indicators
8. Style as toast notification (fixed position, top of screen)
9. Add fade-in/fade-out animations

**Acceptance Criteria:**
- [ ] Component displays all required information
- [ ] Auto-dismiss works correctly (5 seconds)
- [ ] Hovering prevents auto-dismiss
- [ ] Buttons trigger correct callbacks
- [ ] Tooltip shows column indicators
- [ ] Component is responsive (mobile-friendly)
- [ ] Animations are smooth

**Dependencies:** Task 1.1

---

### Task 4.2: Create ClassificationConfirmDialog Component

**Status:** pending

**Description:** Create modal dialog for user confirmation of classifications.

**Files to Create:**
- `src/components/ui/ClassificationConfirmDialog.tsx`

**Implementation Steps:**
1. Create component with props: `suggestedType`, `confidence`, `indicators`, `onConfirm`, `onCancel`
2. Display suggested data type and confidence
3. Display top 3 column indicators
4. Add quick action buttons: "Yes", "No, it's [Alternative]", "Show Options"
5. Implement expandable view showing all 4 data types
6. For each data type option, show:
   - Radio button
   - Data type name
   - Description
   - Example columns
   - Detection mode explanation
7. Add "Cancel" and "Confirm" buttons
8. Style as modal dialog (centered, overlay background)
9. Add keyboard support (Escape to cancel, Enter to confirm)

**Acceptance Criteria:**
- [ ] Component displays all required information
- [ ] Quick actions work correctly
- [ ] Expandable view shows all options
- [ ] Radio buttons allow single selection
- [ ] Confirm button triggers callback with selected type
- [ ] Cancel button triggers cancel callback
- [ ] Keyboard shortcuts work
- [ ] Component is accessible (ARIA labels, focus management)
- [ ] Component is responsive (mobile-friendly)

**Dependencies:** Task 1.1

---

### Task 4.3: Add UI Component Tests

**Status:** pending

**Description:** Create tests for both UI components.

**Files to Create:**
- `src/components/ui/ClassificationNotification.test.tsx`
- `src/components/ui/ClassificationConfirmDialog.test.tsx`

**Implementation Steps:**
1. Test ClassificationNotification rendering
2. Test auto-dismiss behavior
3. Test hover prevents dismiss
4. Test button callbacks
5. Test ClassificationConfirmDialog rendering
6. Test quick actions
7. Test expandable view
8. Test radio button selection
9. Test keyboard shortcuts

**Acceptance Criteria:**
- [ ] All component features are tested
- [ ] Tests use React Testing Library
- [ ] Tests verify accessibility
- [ ] All tests pass

**Dependencies:** Task 4.1, Task 4.2

---

## Phase 5: Store Integration

### Task 5.1: Add Classification State to Wozny Store

**Status:** pending

**Description:** Add state fields for schema classification.

**Files to Modify:**
- `src/lib/store/useWoznyStore.ts`

**Implementation Steps:**
1. Import types from `schema-classifier.ts`
2. Add to state interface:
   - `schemaClassification: ClassificationResult | null`
   - `showClassificationNotification: boolean`
   - `showClassificationDialog: boolean`
3. Initialize all fields to null/false in initial state

**Acceptance Criteria:**
- [ ] State fields are properly typed
- [ ] Initial values are correct
- [ ] TypeScript compiles without errors

**Dependencies:** Task 1.1

---

### Task 5.2: Add Classification Actions to Wozny Store

**Status:** pending

**Description:** Create actions for classification workflow.

**Files to Modify:**
- `src/lib/store/useWoznyStore.ts`

**Implementation Steps:**
1. Implement `confirmClassification(dataType: DataType): void`
   - Update classification with user-selected type
   - Store classification with userConfirmed=true
   - Close dialog, show notification
   - Re-run duplicate detection with new mode
2. Implement `dismissClassificationNotification(): void`
   - Set showClassificationNotification to false
3. Implement `openClassificationSettings(): void`
   - Close notification, open dialog
4. Add unit tests for all actions

**Acceptance Criteria:**
- [ ] confirmClassification updates state correctly
- [ ] confirmClassification re-runs duplicate detection
- [ ] dismissClassificationNotification hides notification
- [ ] openClassificationSettings shows dialog
- [ ] Unit tests verify all actions

**Dependencies:** Task 5.1, Task 3.1

---

### Task 5.3: Integrate Classification into setCsvData Action

**Status:** pending

**Description:** Modify setCsvData to perform classification and handle results.

**Files to Modify:**
- `src/lib/store/useWoznyStore.ts`

**Implementation Steps:**
1. Import `classifySchema`, `getStoredClassification`, `storeClassification` from schema-classifier
2. Import `findDuplicateGroups` from data-quality
3. After setting CSV data and calculating column widths:
   - Check for stored classification using fileName
   - If stored, use it and show notification
   - If not stored, call classifySchema
   - If confidence > 80, auto-apply and show notification
   - If confidence ≤ 80, show confirmation dialog
4. Run duplicate detection with appropriate mode
5. Add integration tests

**Acceptance Criteria:**
- [ ] Stored classifications are retrieved and used
- [ ] High-confidence classifications are auto-applied
- [ ] Low-confidence classifications trigger dialog
- [ ] Duplicate detection uses correct mode
- [ ] Integration tests verify complete flow
- [ ] Existing functionality is not broken

**Dependencies:** Task 5.2, Task 1.9, Task 2.1, Task 3.1

---

## Phase 6: Upload View Integration

### Task 6.1: Add Classification UI to Upload View

**Status:** pending

**Description:** Render classification components in the upload view.

**Files to Modify:**
- `src/features/upload/views/UploadView.tsx`

**Implementation Steps:**
1. Import `ClassificationNotification` and `ClassificationConfirmDialog`
2. Import classification state and actions from store
3. Add conditional rendering for notification (when showClassificationNotification is true)
4. Add conditional rendering for dialog (when showClassificationDialog is true)
5. Wire up event handlers to store actions

**Acceptance Criteria:**
- [ ] Notification appears when classification is auto-applied
- [ ] Dialog appears when confirmation is needed
- [ ] "Change Settings" button opens dialog
- [ ] "Dismiss" button hides notification
- [ ] Dialog confirmation updates classification
- [ ] UI updates are smooth and responsive

**Dependencies:** Task 4.1, Task 4.2, Task 5.3

---

### Task 6.2: Add End-to-End Tests

**Status:** pending

**Description:** Create comprehensive end-to-end tests for the complete feature.

**Files to Create:**
- `src/features/upload/views/UploadView.e2e.test.tsx`

**Implementation Steps:**
1. Test high-confidence customer data upload
   - Verify notification appears
   - Verify aggressive duplicate detection is used
   - Verify duplicates are found
2. Test high-confidence transaction data upload
   - Verify notification appears
   - Verify conservative duplicate detection is used
   - Verify repeated customers are NOT flagged as duplicates
3. Test low-confidence ambiguous data upload
   - Verify dialog appears
   - Verify user can select data type
   - Verify duplicate detection uses selected mode
4. Test stored classification reuse
   - Upload file, confirm classification
   - Upload same file again
   - Verify stored classification is used
5. Test manual override
   - Auto-apply classification
   - Click "Change Settings"
   - Select different type
   - Verify duplicate detection re-runs

**Acceptance Criteria:**
- [ ] All user flows are tested end-to-end
- [ ] Tests use realistic sample data
- [ ] Tests verify UI interactions
- [ ] Tests verify duplicate detection results
- [ ] All tests pass

**Dependencies:** Task 6.1

---

## Phase 7: Documentation and Polish

### Task 7.1: Add JSDoc Comments

**Status:** pending

**Description:** Add comprehensive documentation to all public functions.

**Files to Modify:**
- `src/lib/schema-classifier.ts`
- `src/lib/data-quality.ts`

**Implementation Steps:**
1. Add JSDoc comments to all exported functions
2. Include parameter descriptions
3. Include return value descriptions
4. Include usage examples
5. Document edge cases and error handling

**Acceptance Criteria:**
- [ ] All public functions have JSDoc comments
- [ ] Comments are clear and helpful
- [ ] Examples are accurate
- [ ] TypeScript IntelliSense shows documentation

**Dependencies:** All implementation tasks

---

### Task 7.2: Update User Documentation

**Status:** pending

**Description:** Create user-facing documentation for the classification feature.

**Files to Create:**
- `docs/schema-classification.md`

**Implementation Steps:**
1. Explain what schema classification is
2. Describe the 4 data types
3. Explain how classification works (column names + data patterns)
4. Explain the 3 detection modes
5. Show examples of each data type
6. Explain how to override classifications
7. Explain how to clear stored classifications
8. Add screenshots of UI components

**Acceptance Criteria:**
- [ ] Documentation is clear and comprehensive
- [ ] Examples are realistic and helpful
- [ ] Screenshots show actual UI
- [ ] Documentation is accessible to non-technical users

**Dependencies:** Task 6.1

---

### Task 7.3: Add Performance Monitoring

**Status:** pending

**Description:** Add logging to track classification performance.

**Files to Modify:**
- `src/lib/schema-classifier.ts`

**Implementation Steps:**
1. Add console.time/console.timeEnd around classification
2. Log classification results (data type, confidence, time taken)
3. Add warning if classification takes > 2 seconds
4. Make logging conditional (only in development mode)

**Acceptance Criteria:**
- [ ] Classification time is logged in development
- [ ] Slow classifications trigger warnings
- [ ] Logging does not appear in production builds
- [ ] Logs are helpful for debugging

**Dependencies:** Task 1.9

---

### Task 7.4: Add Error Boundary

**Status:** pending

**Description:** Add error boundary to gracefully handle classification failures.

**Files to Modify:**
- `src/features/upload/views/UploadView.tsx`

**Implementation Steps:**
1. Wrap classification UI in error boundary
2. If classification fails, show error message
3. Provide "Retry" button
4. Provide "Use Default (Customer)" button
5. Log error details for debugging

**Acceptance Criteria:**
- [ ] Classification errors don't crash the app
- [ ] User sees helpful error message
- [ ] User can retry or proceed with default
- [ ] Errors are logged for debugging

**Dependencies:** Task 6.1

---

## Phase 8: Testing and Validation

### Task 8.1: Run Full Test Suite

**Status:** pending

**Description:** Execute all tests and verify coverage.

**Implementation Steps:**
1. Run `npm test` to execute all unit tests
2. Run `npm run test:coverage` to check code coverage
3. Verify coverage is > 90% for new code
4. Fix any failing tests
5. Add tests for uncovered code paths

**Acceptance Criteria:**
- [ ] All tests pass
- [ ] Code coverage > 90% for schema-classifier.ts
- [ ] Code coverage > 90% for modified data-quality.ts
- [ ] No TypeScript errors
- [ ] No ESLint warnings

**Dependencies:** All test tasks

---

### Task 8.2: Manual Testing with Real Data

**Status:** pending

**Description:** Test the feature with realistic datasets.

**Test Cases:**
1. Upload customer data (names, emails, phones)
   - Verify classified as Customer
   - Verify aggressive duplicate detection
   - Verify partial matches are found
2. Upload transaction data (orders with repeated customers)
   - Verify classified as Transaction
   - Verify conservative duplicate detection
   - Verify repeated customers are NOT flagged
3. Upload inventory data (products with categories)
   - Verify classified as Inventory
   - Verify conservative duplicate detection
4. Upload time-series data (timestamps with metrics)
   - Verify classified as Time-Series
   - Verify very conservative duplicate detection
5. Upload ambiguous data (generic columns)
   - Verify confirmation dialog appears
   - Verify user can select type
6. Test stored classification reuse
7. Test manual override
8. Test "Change Settings" flow

**Acceptance Criteria:**
- [ ] All test cases pass
- [ ] UI is responsive and smooth
- [ ] No console errors
- [ ] Classification is accurate
- [ ] Duplicate detection behaves correctly

**Dependencies:** Task 6.1

---

### Task 8.3: Performance Testing

**Status:** pending

**Description:** Verify classification performance meets requirements.

**Test Cases:**
1. Upload file with 100 rows
   - Verify classification completes in < 500ms
2. Upload file with 1000 rows
   - Verify classification completes in < 500ms
3. Upload file with 5000 rows
   - Verify classification completes in < 2 seconds
   - Verify sampling is used
4. Upload file with 10000 rows
   - Verify classification completes in < 2 seconds
   - Verify UI remains responsive

**Acceptance Criteria:**
- [ ] All performance requirements are met
- [ ] Large files don't block UI
- [ ] Sampling works correctly
- [ ] No performance regressions in existing features

**Dependencies:** Task 6.1

---

### Task 8.4: Accessibility Testing

**Status:** pending

**Description:** Verify UI components are accessible.

**Test Cases:**
1. Test keyboard navigation
   - Tab through notification buttons
   - Tab through dialog options
   - Press Escape to close dialog
   - Press Enter to confirm
2. Test screen reader compatibility
   - Verify ARIA labels are present
   - Verify focus management works
   - Verify announcements are clear
3. Test color contrast
   - Verify text is readable
   - Verify buttons have sufficient contrast
4. Test with browser zoom
   - Verify UI scales correctly at 200%

**Acceptance Criteria:**
- [ ] All keyboard shortcuts work
- [ ] Screen reader announces content correctly
- [ ] Color contrast meets WCAG AA standards
- [ ] UI is usable at 200% zoom
- [ ] No accessibility violations in automated tests

**Dependencies:** Task 4.1, Task 4.2

---

## Phase 9: Deployment

### Task 9.1: Create Migration Guide

**Status:** pending

**Description:** Document any breaking changes or migration steps.

**Files to Create:**
- `docs/migration-schema-classification.md`

**Implementation Steps:**
1. Document changes to `findDuplicateGroups` signature
2. Explain backward compatibility (default to AGGRESSIVE)
3. Document new store state fields
4. Explain localStorage usage
5. Provide migration checklist

**Acceptance Criteria:**
- [ ] Migration guide is clear and complete
- [ ] Breaking changes are documented
- [ ] Backward compatibility is explained
- [ ] Checklist helps developers migrate

**Dependencies:** All implementation tasks

---

### Task 9.2: Update CHANGELOG

**Status:** pending

**Description:** Add feature to project changelog.

**Files to Modify:**
- `CHANGELOG.md` (or create if doesn't exist)

**Implementation Steps:**
1. Add new section for this feature
2. List all new functionality
3. List any breaking changes
4. List any bug fixes
5. Credit contributors

**Acceptance Criteria:**
- [ ] Changelog entry is complete
- [ ] All changes are documented
- [ ] Format follows existing conventions

**Dependencies:** All implementation tasks

---

### Task 9.3: Final Code Review

**Status:** pending

**Description:** Conduct comprehensive code review before merge.

**Review Checklist:**
- [ ] All tasks are completed
- [ ] All tests pass
- [ ] Code coverage meets requirements
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Code follows project conventions
- [ ] Functions have JSDoc comments
- [ ] UI components are accessible
- [ ] Performance requirements are met
- [ ] Error handling is comprehensive
- [ ] Edge cases are handled
- [ ] Documentation is complete

**Dependencies:** All tasks

---

## Summary

**Total Tasks:** 43
**Estimated Effort:** 5-7 days for experienced developer

**Critical Path:**
1. Phase 1 (Core Logic) → Phase 2 (Detector) → Phase 5 (Store) → Phase 6 (UI Integration)
2. Phase 3 (Storage) can be done in parallel with Phase 2
3. Phase 4 (UI Components) can be done in parallel with Phase 2-3
4. Phase 7-9 must be done after Phase 6

**Risk Areas:**
- Performance with very large files (>10k rows)
- Ambiguous data that doesn't fit any category well
- Browser compatibility for localStorage
- Accessibility of modal dialog

**Success Criteria:**
- All 43 tasks completed
- All tests passing
- Code coverage > 90%
- Performance requirements met
- Accessibility requirements met
- User documentation complete
