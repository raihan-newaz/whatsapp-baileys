const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Local client to run completely locally using the MySQL-backed Express server for authentication
class MockSupabaseClient {
  auth = {
    async getUser() {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('local_auth_user');
        if (stored) {
          try {
            const user = JSON.parse(stored);
            return { data: { user }, error: null };
          } catch (e) {}
        }
      }
      return { data: { user: null }, error: null };
    },
    
    async signInWithPassword({ email, password }: any) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Login failed');
        }
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('local_auth_user', JSON.stringify(data.user));
        }
        return { data: { user: data.user }, error: null };
      } catch (err: any) {
        console.error('[MockSupabaseClient] Sign in failed:', err);
        return { data: { user: null }, error: err };
      }
    },
    
    async signUp({ email, password, options }: any) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            full_name: options?.data?.full_name || ''
          })
        });
        
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Signup failed');
        }
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('local_auth_user', JSON.stringify(data.user));
        }
        return { data: { user: data.user }, error: null };
      } catch (err: any) {
        console.error('[MockSupabaseClient] Sign up failed:', err);
        return { data: { user: null }, error: err };
      }
    },
    
    async signOut() {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('local_auth_user');
      }
      return { error: null };
    }
  };

  storage = {
    from(bucket: string) {
      return {
        async upload(path: string, file: File) {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64data = reader.result;
              if (typeof window !== 'undefined') {
                sessionStorage.setItem(`mock_storage_${path}`, base64data as string);
              }
              resolve({ data: { path }, error: null });
            };
            reader.readAsDataURL(file);
          });
        },
        getPublicUrl(path: string) {
          let stored = null;
          if (typeof window !== 'undefined') {
            stored = sessionStorage.getItem(`mock_storage_${path}`);
          }
          return { data: { publicUrl: stored || 'https://picsum.photos/400/400' } };
        }
      };
    }
  };
}

export function createClient(): any {
  return new MockSupabaseClient();
}

