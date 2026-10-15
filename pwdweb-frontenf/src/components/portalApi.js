export const PORTAL_API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

export async function portalRequest(path, options = {}) {
  const token = localStorage.getItem('portalToken');
  const response = await fetch(`${PORTAL_API}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!(response.headers.get('content-type') || '').includes('application/json')) {
    throw new Error(`API returned ${response.status}. Import the supplied SQL, register the new routes, and restart the backend.`);
  }
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || 'Unable to complete your request.');
  return data;
}

export function formatPortalDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-PH', { dateStyle:'medium',timeStyle:'short' });
}

export function notifyPortalRefresh() {
  window.dispatchEvent(new Event('pwd-portal-refresh'));
}
