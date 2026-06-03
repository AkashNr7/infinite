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
      // Connect mobile client directly to the live deployed cloud server of this applet
      const liveCloudServer = 'https://ais-pre-dzyvhzwunjmz4ap4pswblq-119708154136.asia-southeast1.run.app';
      return `${liveCloudServer}${cleanPath}`;
    }
  }

  // 3. Default to relative paths for standard web environments
  return cleanPath;
}
