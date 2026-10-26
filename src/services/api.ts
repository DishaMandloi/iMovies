// Client-side API Service

// Generate or retrieve persistent client session ID for anonymous seat locking
function getClientId(): string {
  let clientId = localStorage.getItem('imovies_client_id');
  if (!clientId) {
    clientId = 'client-' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('imovies_client_id', clientId);
  }
  return clientId;
}

export function getToken(): string | null {
  return localStorage.getItem('imovies_token');
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem('imovies_token', token);
  } else {
    localStorage.removeItem('imovies_token');
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const clientId = getClientId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-client-id': clientId,
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({
    success: false,
    message: 'Invalid server response.',
  }));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export { getClientId };
