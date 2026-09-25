/**
 * Shared utility functions for KO-TI frontend.
 * Include this script BEFORE any inline scripts that render user data.
 */

/**
 * Escapes HTML special characters to prevent XSS when injecting
 * user-supplied data into innerHTML / template literals.
 *
 * @param {*} str - The value to escape (coerced to string)
 * @returns {string} HTML-safe string
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const text = String(str);
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, ch => map[ch]);
}
