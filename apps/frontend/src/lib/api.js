const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export async function apiRequest(path, { method = 'GET', token, body, headers = {}, formData } = {}) {
  const init = {
    method,
    headers: { ...headers },
  };

  if (token) {
    init.headers.Authorization = `Bearer ${token}`;
  }

  if (formData) {
    init.body = formData;
  } else if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, init);
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const detail = typeof payload === 'string' ? payload : payload?.detail || '요청 처리에 실패했어.';
    throw new Error(detail);
  }

  return payload;
}

export const apiBaseUrl = API_BASE_URL;
