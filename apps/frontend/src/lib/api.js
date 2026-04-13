const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// 401 발생 시 호출할 콜백. AuthContext에서 등록한다.
let _onUnauthorized = null;
export function registerUnauthorizedHandler(cb) {
  _onUnauthorized = cb;
}

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
    if (response.status === 401) {
      _onUnauthorized?.();
      throw new Error('인증이 만료됐어. 다시 로그인해줘.');
    }
    const detail = typeof payload === 'string' ? payload : payload?.detail || '요청 처리에 실패했어.';
    throw new Error(detail);
  }

  return payload;
}

export const apiBaseUrl = API_BASE_URL;
