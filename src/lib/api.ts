const BACKEND_URL = typeof window !== 'undefined'
  ? ''
  : (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000');

export async function apiFetch(path: string, options?: RequestInit) {
  try {
    const isFormData = options?.body instanceof FormData;
    const headers: Record<string, string> = { ...options?.headers as any };
    
    // Only set application/json if not sending FormData
    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    // Propagate authenticated user ID to the backend via headers
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('local_auth_user');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          if (user && user.id) {
            headers['X-User-Id'] = user.id;
          }
        } catch (e) {}
      }
    }

    const res = await fetch(`${BACKEND_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `API Error: ${res.status} ${res.statusText}`);
    }
    
    return res.json();
  } catch (err: any) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Backend server unreachable. Please ensure it is running on ' + BACKEND_URL);
    }
    throw err;
  }
}

