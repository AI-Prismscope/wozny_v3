# Requirements Document

## Introduction

The Schema Classification System automatically analyzes uploaded CSV data to determine its data type (Customer, Transaction, Inventory, or Time-Series) and applies appropriate duplicate detection logic. The system uses a hybrid approach: auto-applying classification when confidence exceeds 80%, and requesting user confirmation when confidence is below 80%. This addresses the current limitation where duplicate detection logic designed for customer data incorrectly flags normal business patterns in transactional data as duplicates.

## Glossary

- **Schema_Classifier**: The component that analyzes CSV column names and data patterns to determine data type
- **Duplicate_Detector**: The component that identifies duplicate rows based on the classified data type
- **Classification_Store**: The persistent storage that retains classification decisions across sessions
- **Confidence_Score**: A numerical value (0-100) representing the system's certainty about a data type classification
- **Data_Type**: One of four categories: Customer, Transaction, Inventory, or Time-Series
- **Column_Indicator**: A column name pattern that suggests a specific data type (e.g., "email" suggests Customer data)
- **Uniqueness_Ratio**: The proportion of unique values to total rows in a column (unique values / total rows)
- **Notification_UI**: The user interface component that displays auto-applied classifications
- **Confirmation_Dialog**: The user interface component that requests user validation of low-confidence classifications
- **Duplicate_Detection_Mode**: The matching strategy applied based on data type (Aggressive, Conservative, or Very Conservative)

## Requirements

### Requirement 1: Column Name Analysis

**User Story:** As a data analyst, I want the system to analyze column names in my CSV file, so that it can infer the likely data type without requiring manual configuration.

#### Acceptance Criteria

1. WHEN a CSV file is uploaded, THE Schema_Classifier SHALL extract all column names
2. THE Schema_Classifier SHALL calculate a score for each Data_Type based on presence of Column_Indicators
3. FOR Customer data type, THE Schema_Classifier SHALL assign positive score weight to columns matching patterns: first_name, last_name, email, phone, address, contact
4. FOR Transaction data type, THE Schema_Classifier SHALL assign positive score weight to columns matching patterns: date, order_id, transaction_id, quantity, amount, customer_name, invoice
5. FOR Inventory data type, THE Schema_Classifier SHALL assign positive score weight to columns matching patterns: sku, product_id, item_id, category, price, stock, inventory
6. FOR Time-Series data type, THE Schema_Classifier SHALL assign positive score weight to columns matching patterns: timestamp, datetime, date, metric, value, measurement, sensor
7. THE Schema_Classifier SHALL normalize column names to lowercase and handle common separators (underscore, hyphen, space) when matching patterns

### Requirement 2: Data Pattern Analysis

**User Story:** As a data analyst, I want the system to analyze the actual data values in my CSV, so that classification is based on content patterns rather than column names alone.

#### Acceptance Criteria

1. WHEN a CSV file is uploaded, THE Schema_Classifier SHALL calculate the Uniqueness_Ratio for each column
2. FOR Customer data type detection, THE Schema_Classifier SHALL check if name/email/phone columns have Uniqueness_Ratio greater than 0.8
3. FOR Transaction data type detection, THE Schema_Classifier SHALL check if customer/category columns have Uniqueness_Ratio less than 0.3 AND transaction_id columns have Uniqueness_Ratio equal to 1.0
4. FOR Inventory data type detection, THE Schema_Classifier SHALL check if SKU/ID columns have Uniqueness_Ratio greater than 0.95 AND category columns have Uniqueness_Ratio less than 0.2
5. FOR Time-Series data type detection, THE Schema_Classifier SHALL check if timestamp columns have Uniqueness_Ratio greater than 0.9 AND metric columns have Uniqueness_Ratio less than 0.1
6. THE Schema_Classifier SHALL combine column name scores and data pattern scores to produce a final Confidence_Score for each Data_Type
7. THE Schema_Classifier SHALL select the Data_Type with the highest combined score as the classification result

### Requirement 3: High-Confidence Auto-Application

**User Story:** As a data analyst, I want the system to automatically apply the correct duplicate detection logic when it's confident about the data type, so that I don't need to manually configure obvious cases.

#### Acceptance Criteria

1. WHEN the highest Confidence_Score is greater than 80, THE Schema_Classifier SHALL automatically apply the corresponding Data_Type classification
2. WHEN a classification is auto-applied, THE Notification_UI SHALL display a message showing the detected Data_Type and the Duplicate_Detection_Mode being used
3. THE Notification_UI SHALL include a "Change Settings" action that allows users to override the auto-applied classification
4. WHEN the user clicks "Change Settings", THE Confirmation_Dialog SHALL open with all four Data_Type options available for manual selection
5. THE Notification_UI SHALL display for at least 5 seconds and remain visible until dismissed by the user or overridden

### Requirement 4: Low-Confidence User Confirmation

**User Story:** As a data analyst, I want the system to ask for my confirmation when it's uncertain about the data type, so that incorrect classification doesn't silently corrupt my duplicate detection results.

#### Acceptance Criteria

1. WHEN the highest Confidence_Score is less than or equal to 80, THE Schema_Classifier SHALL pause processing and display the Confirmation_Dialog
2. THE Confirmation_Dialog SHALL show the detected Data_Type and the Confidence_Score as a percentage
3. THE Confirmation_Dialog SHALL provide action buttons: "Yes", "No, it's [Alternative Type]", and "Show Options"
4. WHEN the user clicks "Yes", THE Schema_Classifier SHALL apply the suggested Data_Type classification
5. WHEN the user clicks "No, it's [Alternative Type]", THE Schema_Classifier SHALL apply the alternative Data_Type selected by the user
6. WHEN the user clicks "Show Options", THE Confirmation_Dialog SHALL expand to show all four Data_Type options with descriptions
7. THE Schema_Classifier SHALL NOT proceed with duplicate detection until the user provides confirmation

### Requirement 5: Adaptive Duplicate Detection Logic

**User Story:** As a data analyst, I want duplicate detection to behave differently based on the data type, so that normal business patterns in transactional data are not incorrectly flagged as duplicates.

#### Acceptance Criteria

1. WHEN Data_Type is Customer, THE Duplicate_Detector SHALL use Aggressive mode with partial matching on name, email, and phone columns
2. WHEN Data_Type is Transaction, THE Duplicate_Detector SHALL use Conservative mode with exact matching only on all columns
3. WHEN Data_Type is Inventory, THE Duplicate_Detector SHALL use Conservative mode with exact matching only on unique identifier columns (SKU, product_id, item_id)
4. WHEN Data_Type is Time-Series, THE Duplicate_Detector SHALL use Very Conservative mode with exact matching on timestamp AND metric columns combined
5. THE Duplicate_Detector SHALL NOT flag rows as duplicates in Transaction, Inventory, or Time-Series data types when only non-identifier columns match
6. THE Duplicate_Detector SHALL continue to flag exact duplicates (all columns match) regardless of Data_Type
7. WHEN duplicate detection completes, THE Duplicate_Detector SHALL report the number of duplicate groups found and the Duplicate_Detection_Mode used

### Requirement 6: Classification Persistence

**User Story:** As a data analyst, I want my classification decisions to be remembered across sessions, so that I don't need to re-confirm the data type every time I work with similar files.

#### Acceptance Criteria

1. WHEN a classification is confirmed (either auto-applied or user-confirmed), THE Classification_Store SHALL persist the decision with the file name as the key
2. THE Classification_Store SHALL store: file name, Data_Type, Confidence_Score, timestamp, and whether it was user-confirmed or auto-applied
3. WHEN a file with a previously classified name is uploaded, THE Schema_Classifier SHALL retrieve the stored classification
4. WHEN a stored classification exists, THE Schema_Classifier SHALL apply it automatically regardless of current Confidence_Score
5. THE Notification_UI SHALL indicate when a stored classification is being reused and display the original classification date
6. THE Classification_Store SHALL provide a method to clear stored classifications for a specific file or all files
7. THE Classification_Store SHALL use browser localStorage or IndexedDB for persistence

### Requirement 7: Manual Override Capability

**User Story:** As a data analyst, I want to manually change the data type classification at any time, so that I can correct misclassifications or handle edge cases the system doesn't recognize.

#### Acceptance Criteria

1. THE Notification_UI SHALL provide a "Change Settings" button visible whenever a classification is active
2. WHEN the user clicks "Change Settings", THE Confirmation_Dialog SHALL open with the current Data_Type pre-selected
3. THE Confirmation_Dialog SHALL allow the user to select any of the four Data_Type options
4. WHEN the user selects a different Data_Type, THE Schema_Classifier SHALL immediately re-classify the data
5. WHEN the user confirms a manual override, THE Duplicate_Detector SHALL re-run with the new Duplicate_Detection_Mode
6. THE Classification_Store SHALL update the stored classification with the user's manual selection and mark it as user-confirmed
7. WHEN a classification is user-confirmed, THE Schema_Classifier SHALL prioritize the user's choice over automatic analysis in future sessions

### Requirement 8: Classification Transparency

**User Story:** As a data analyst, I want to understand why the system classified my data a certain way, so that I can trust the classification and make informed override decisions.

#### Acceptance Criteria

1. THE Notification_UI SHALL display the detected Data_Type name and a brief description of what it means
2. THE Notification_UI SHALL show the Confidence_Score as a percentage
3. WHEN the user hovers over or clicks an info icon, THE Notification_UI SHALL display the top 3 Column_Indicators that influenced the classification
4. THE Confirmation_Dialog SHALL display descriptions for each Data_Type option explaining when to use it
5. THE Confirmation_Dialog SHALL show example column patterns for each Data_Type (e.g., "Customer: email, phone, name")
6. THE Confirmation_Dialog SHALL explain the Duplicate_Detection_Mode that will be applied for each Data_Type option
7. THE Notification_UI SHALL provide a link to documentation explaining the classification system in detail

### Requirement 9: Classification Performance

**User Story:** As a data analyst, I want schema classification to complete quickly, so that it doesn't significantly delay my workflow when uploading files.

#### Acceptance Criteria

1. WHEN a CSV file with fewer than 1000 rows is uploaded, THE Schema_Classifier SHALL complete analysis within 500 milliseconds
2. WHEN a CSV file with 1000-5000 rows is uploaded, THE Schema_Classifier SHALL complete analysis within 2 seconds
3. THE Schema_Classifier SHALL sample a maximum of 1000 rows when calculating Uniqueness_Ratio for files larger than 1000 rows
4. THE Schema_Classifier SHALL perform column name analysis and data pattern analysis in parallel when possible
5. THE Schema_Classifier SHALL cache Uniqueness_Ratio calculations for columns to avoid redundant computation
6. WHEN classification is in progress, THE Notification_UI SHALL display a loading indicator with the message "Analyzing file structure..."
7. THE Schema_Classifier SHALL not block the UI thread during analysis

### Requirement 10: Integration with Existing Duplicate Detection

**User Story:** As a developer, I want the classification system to integrate cleanly with the existing duplicate detection code, so that minimal refactoring is required and existing functionality is preserved.

#### Acceptance Criteria

1. THE Schema_Classifier SHALL provide a function `classifySchema(rows, columns)` that returns a Data_Type and Confidence_Score
2. THE Duplicate_Detector SHALL accept an optional `detectionMode` parameter that overrides the default Aggressive mode
3. WHEN `detectionMode` is not provided, THE Duplicate_Detector SHALL use Aggressive mode (preserving current behavior)
4. THE existing `findDuplicateGroups` function SHALL be refactored to accept a `detectionMode` parameter
5. THE `findDuplicateGroups` function SHALL conditionally execute partial matching logic only when `detectionMode` is Aggressive
6. THE Schema_Classifier SHALL be invoked in the `setCsvData` action in the Wozny store after column width calculation
7. THE classification result SHALL be stored in the Wozny store state alongside existing CSV data

### Requirement 11: Error Handling and Edge Cases

**User Story:** As a data analyst, I want the system to handle unusual or ambiguous data gracefully, so that classification failures don't prevent me from using the application.

#### Acceptance Criteria

1. WHEN a CSV file has fewer than 3 columns, THE Schema_Classifier SHALL default to Customer data type with Confidence_Score of 50
2. WHEN a CSV file has no recognizable Column_Indicators, THE Schema_Classifier SHALL default to Customer data type and display the Confirmation_Dialog
3. WHEN two or more Data_Types have Confidence_Scores within 10 points of each other, THE Schema_Classifier SHALL display the Confirmation_Dialog regardless of the highest score
4. WHEN the Schema_Classifier encounters an error during analysis, THE Schema_Classifier SHALL log the error and default to Customer data type with Aggressive duplicate detection
5. WHEN the Classification_Store fails to persist a decision, THE Schema_Classifier SHALL log a warning but continue with the current session classification
6. WHEN the Classification_Store fails to retrieve a stored decision, THE Schema_Classifier SHALL perform fresh analysis without blocking the user
7. THE Notification_UI SHALL display an error message if classification fails, with an option to retry or proceed with default settings

### Requirement 12: Testing and Validation

**User Story:** As a developer, I want comprehensive tests for the classification system, so that I can confidently deploy it without introducing regressions.

#### Acceptance Criteria

1. THE Schema_Classifier SHALL have unit tests covering all four Data_Type classifications with known sample data
2. THE Schema_Classifier SHALL have property-based tests verifying that Confidence_Score is always between 0 and 100
3. THE Schema_Classifier SHALL have property-based tests verifying that column name matching is case-insensitive and handles all separator types
4. THE Duplicate_Detector SHALL have unit tests verifying that Aggressive mode produces more matches than Conservative mode on the same dataset
5. THE Duplicate_Detector SHALL have unit tests verifying that Transaction data with repeated customer names does not produce false positive duplicates
6. THE Classification_Store SHALL have unit tests verifying that persistence and retrieval work correctly across browser sessions
7. THE integration between Schema_Classifier and Duplicate_Detector SHALL have end-to-end tests covering the complete workflow from upload to duplicate detection

