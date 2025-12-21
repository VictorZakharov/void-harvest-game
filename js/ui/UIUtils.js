/**
 * Shared UI Utility Functions
 */

/**
 * Robust formatter for display values.
 * Handles floating point precision and integer rounding.
 * @param {number|string} v - Value to format
 * @returns {number|string} Formatted value
 */
export const formatVal = (v) => {
    if (typeof v === 'number') {
        if (Math.abs(v % 1) < 0.001) return Math.floor(v);
        return parseFloat(v.toFixed(1));
    }
    return v;
};
