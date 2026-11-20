/**
 * ACCESSPREP-X — Centralised REST API Client Service
 */

export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.error || `GET ${endpoint} failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function apiPost<T, B = unknown>(endpoint: string, body: B, extraHeaders?: Record<string, string>): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(extraHeaders || {})
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.error || `POST ${endpoint} failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function apiPut<T, B = unknown>(endpoint: string, body: B): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.error || `PUT ${endpoint} failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.error || `DELETE ${endpoint} failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}
