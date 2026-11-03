// Tyros Admin - API Client Wrapper (js/api.js)
import { API_BASE_URL, Config } from './config.js';
import { Toast } from './toast.js';

class ApiClientClass {
  constructor() {
    this.token = null;
    this.activeControllers = new Set();
  }

  setToken(token) {
    this.token = token;
  }

  getToken() {
    return this.token;
  }

  clearToken() {
    this.token = null;
  }

  // Abort all in-flight requests (e.g., when route changes)
  abortAll() {
    for (const controller of this.activeControllers) {
      try {
        controller.abort();
      } catch (_) {}
    }
    this.activeControllers.clear();
  }

  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      body,
      headers = {},
      params,
      timeout = Config.requestTimeoutMs,
      skipAuth = false,
      signal: callerSignal
    } = options;

    // Build URL with query params
    let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    if (params && Object.keys(params).length > 0) {
      const sp = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') {
          sp.append(k, v);
        }
      }
      const qs = sp.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }

    // Set up AbortController for timeout & caller signal
    const controller = new AbortController();
    this.activeControllers.add(controller);

    if (callerSignal) {
      callerSignal.addEventListener('abort', () => controller.abort());
    }

    const timeoutTimer = setTimeout(() => {
      controller.abort();
    }, timeout);

    // Build headers
    const reqHeaders = {
      'Accept': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      ...headers
    };

    if (body && !(body instanceof FormData)) {
      reqHeaders['Content-Type'] = 'application/json';
    }

    if (!skipAuth && this.token) {
      reqHeaders['Authorization'] = `Bearer ${this.token}`;
    }

    const fetchOptions = {
      method,
      headers: reqHeaders,
      cache: 'no-store',
      signal: controller.signal
    };

    if (body) {
      fetchOptions.body = (body instanceof FormData) ? body : JSON.stringify(body);
    }

    // Execute with retry logic for idempotent GET
    let attempts = 0;
    const maxAttempts = (method === 'GET') ? Config.maxGetRetries + 1 : 1;

    try {
      while (attempts < maxAttempts) {
        attempts++;
        try {
          const res = await fetch(url, fetchOptions);
          clearTimeout(timeoutTimer);
          this.activeControllers.delete(controller);

          // Handle 401 Unauthorized
          if (res.status === 401) {
            this.handleUnauthorized();
            throw this.normalizeError(res, { message: 'Session expired. Please log in again.' });
          }

          // Handle 403 Forbidden
          if (res.status === 403) {
            let errJson;
            try { errJson = await res.json(); } catch (_) {}
            const msg = errJson?.message || 'Access denied by server policy.';
            Toast.error(msg);
            throw this.normalizeError(res, { message: msg });
          }

          // Parse response
          let responseData = null;
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            try {
              responseData = await res.json();
            } catch (_) {
              responseData = null;
            }
          } else {
            responseData = await res.text();
          }

          if (!res.ok) {
            throw this.normalizeError(res, responseData);
          }

          return responseData;
        } catch (fetchErr) {
          // If aborted by user/timeout, don't retry
          if (fetchErr.name === 'AbortError') {
            throw new Error('Request timed out or cancelled');
          }

          // If last attempt or not GET, throw
          if (attempts >= maxAttempts || method !== 'GET') {
            throw fetchErr;
          }

          // Backoff before retry
          await new Promise(r => setTimeout(r, 400 * attempts));
        }
      }
    } finally {
      clearTimeout(timeoutTimer);
      this.activeControllers.delete(controller);
    }
  }

  normalizeError(res, responseData) {
    const error = new Error();
    error.status = res?.status || 0;
    error.statusText = res?.statusText || 'Error';
    error.data = responseData;
    error.message = (typeof responseData === 'object' && responseData?.message)
      ? responseData.message
      : (typeof responseData === 'string' && responseData)
        ? responseData
        : `Request failed with status ${error.status}`;
    return error;
  }

  handleUnauthorized() {
    this.clearToken();
    window.dispatchEvent(new CustomEvent('tyros:unauthorized'));
  }

  // Convenience methods
  get(endpoint, params, options = {}) {
    return this.request(endpoint, { method: 'GET', params, ...options });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { method: 'POST', body, ...options });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { method: 'PATCH', body, ...options });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { method: 'PUT', body, ...options });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }
}

export const ApiClient = new ApiClientClass();
