/**
 * Utilities for file operations
 */

/**
 * Download data as a file
 * @param {string} content - File content
 * @param {string} fileName - File name
 * @param {string} contentType - MIME type
 */
export function downloadFile(content, fileName, contentType) {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}
