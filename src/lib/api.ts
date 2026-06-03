/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utility to resolve API URLs dynamically.
 * Helps full-stack React + Express apps run cleanly both inside a standard web browser (using relative paths)
 * and in packaged Capacitor.js/Android APK clients (using the absolute cloud server URL).
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // 1. Under mobile build, use explicitly set VITE_API_URL environment variable if provided
  const envApiUrl = (import.meta as any).env?.VITE_API_URL;
  if (envApiUrl) {
    const trimmed = envApiUrl.replace(/\/$/, '');
    return `${trimmed}${cleanPath}`;
  }

  // 2. Detect if running inside a native mobile webview / Capacitor environment
  if (typeof window !== 'undefined') {
    const loc = window.location;
    const isCapacitorPlugin = (window as any).Capacitor;
    const isCapacitorScheme = loc.protocol.startsWith('capacitor') || loc.protocol.startsWith('file');
    
    // Webview local host name triggers (e.g. localhost with no standard dev port)
    const isWebViewHost = loc.hostname === 'localhost' && (loc.port === '' || loc.port === '80');

    if (isCapacitorPlugin || isCapacitorScheme || isWebViewHost) {
      // Allow overriding the API server URL dynamically for convenient developer testing
      const customApiUrl = localStorage.getItem('CUSTOM_API_URL');
      if (customApiUrl && customApiUrl.trim() !== '') {
        const trimmed = customApiUrl.trim().replace(/\/$/, '');
        return `${trimmed}${cleanPath}`;
      }
      
      // Connect mobile client directly to the live production server on Cloud Run
      const liveCloudServer = 'https://remix-billing-inventory-management-system-641549369794.asia-southeast1.run.app';
      return `${liveCloudServer}${cleanPath}`;
    }
  }

  // 3. Default to relative paths for standard web environments
  return cleanPath;
}
