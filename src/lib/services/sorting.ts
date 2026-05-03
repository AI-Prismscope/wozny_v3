import { RowData } from '../store/useWoznyStore';

export interface SortConfig {
    columnId: string;
    direction: 'asc' | 'desc';
}

/**
 * Compare two values from a specific column with type-aware logic
 */
const compareValues = (a: RowData, b: RowData, config: SortConfig): number => {
    const { columnId, direction } = config;
    const valA = String(a[columnId] || '').trim();
    const valB = String(b[columnId] || '').trim();

    // Handle missing values
    if (!valA && !valB) return 0;
    if (!valA) return direction === 'asc' ? 1 : -1;
    if (!valB) return direction === 'asc' ? -1 : 1;

    // 1. Currency/Number Check
    const cleanA = valA.replace(/[$,€£\s,]/g, '');
    const cleanB = valB.replace(/[$,€£\s,]/g, '');
    const numA = parseFloat(cleanA);
    const numB = parseFloat(cleanB);

    if (!isNaN(numA) && !isNaN(numB) && cleanA.length > 0 && cleanB.length > 0 && !isNaN(Number(cleanA)) && !isNaN(Number(cleanB))) {
        return direction === 'asc' ? numA - numB : numB - numA;
    }

    // 2. Date Check
    const dateA = Date.parse(valA);
    const dateB = Date.parse(valB);
    if (!isNaN(dateA) && !isNaN(dateB) && valA.length > 5 && valB.length > 5) {
        return direction === 'asc' ? dateA - dateB : dateB - dateA;
    }

    // 3. Text
    return direction === 'asc'
        ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
        : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
};

/**
 * Sort rows by multiple columns (multi-column sort)
 * Falls back to original index if all sort configs result in equality
 */
export const sortRows = (rows: RowData[], configs: SortConfig[]): RowData[] => {
    if (configs.length === 0) {
        // REVERT: Sort by the stable original index
        return [...rows].sort((a, b) => {
            const idxA = parseInt(a.__wozny_index || '0');
            const idxB = parseInt(b.__wozny_index || '0');
            return idxA - idxB;
        });
    }

    return [...rows].sort((a, b) => {
        // Try each sort config in order (primary, secondary, tertiary, etc.)
        for (const config of configs) {
            const result = compareValues(a, b, config);
            if (result !== 0) return result; // Found a difference, use it
        }
        
        // All columns equal, maintain stable sort by original index
        const idxA = parseInt(a.__wozny_index || '0');
        const idxB = parseInt(b.__wozny_index || '0');
        return idxA - idxB;
    });
};
