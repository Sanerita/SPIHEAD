interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isAuthenticated: boolean;
}

class AuthService {
  private user: User | null = null;
  private token: string | null = null;
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadFromStorage();
    this.verifySession();
  }

  private loadFromStorage() {
    try {
      const token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('auth_user');
      
      if (token && userStr) {
        this.token = token;
        this.user = JSON.parse(userStr);
      }
    } catch (error) {
      console.warn('Failed to load auth state:', error);
    }
  }

  private saveToStorage() {
    if (this.token && this.user) {
      localStorage.setItem('auth_token', this.token);
      localStorage.setItem('auth_user', JSON.stringify(this.user));
    } else {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
  }

  private async verifySession() {
    if (!this.token) return;
    
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      
      if (!res.ok) {
        this.logout();
      }
    } catch (error) {
      console.warn('Session verification failed:', error);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public async login(email: string, password: string): Promise<void> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    this.token = data.token;
    this.user = data.user;
    this.user.isAuthenticated = true;
    
    this.saveToStorage();
    this.notify();
  }

  public async register(name: string, email: string, password: string): Promise<void> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: name, email, password })
    });

    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    this.token = data.token;
    this.user = data.user;
    this.user.isAuthenticated = true;
    
    this.saveToStorage();
    this.notify();
  }

  public logout(): void {
    this.token = null;
    this.user = null;
    this.saveToStorage();
    this.notify();
  }

  public getUser(): User | null {
    return this.user;
  }

  public isAuthenticated(): boolean {
    return !!this.user && !!this.token;
  }

  public getToken(): string | null {
    return this.token;
  }

  public async refreshToken(): Promise<void> {
    if (!this.token) return;
    
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.token })
      });
      
      if (res.ok) {
        const data = await res.json();
        this.token = data.token;
        this.saveToStorage();
        this.notify();
      }
    } catch (error) {
      console.warn('Token refresh failed:', error);
    }
  }
}

export const authService = new AuthService();
