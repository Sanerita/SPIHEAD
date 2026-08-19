// src/lib/authService.ts

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: string;
  authRole: string;
  mfaEnabled: boolean;
  pinCode: string;
  lastLoginAt: string;
  jobTitle: string;
  department: string;
  ipAddress: string;
  companyName?: string;
  companySize?: string;
  selectedPlan?: string;
  isAuthenticated?: boolean;
  phoneNumber?: string;
}

export interface SecurityAuditLog {
  id: string;
  action: string;
  category: 'Authentication' | 'Authorization' | 'Security Alert' | 'System Config' | 'Permission' | 'M365 OAuth';
  userEmail: string;
  userRole: string;
  ipAddress: string;
  severity: 'Info' | 'Low' | 'Medium' | 'High' | 'Critical';
  timestamp: string;
  details?: string;
}

export interface SecuritySettings {
  mfaRequired: boolean;
  sessionTimeoutMinutes: number;
  dataMaskingEnabled: boolean;
  autoLockOnInactivity: boolean;
  ipWhitelistEnabled: boolean;
  allowedIpRanges: string;
  maxFailedLoginAttempts: number;
  requireStrongPassword: boolean;
  auditLoggingEnabled: boolean;
  encryptionMode: string;
}

export type UserRole = 'Admin' | 'Owner' | 'Sales Manager' | 'Sales Rep' | 'Auditor' | 'User';

export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/`/g, '&#96;')
    .replace(/\//g, '&#47;');
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isStrongPassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
  return true;
}

export function maskData(value: string, type: 'email' | 'phone' | 'budget' | 'generic', isAdmin: boolean = false): string {
  if (isAdmin) return value;

  if (type === 'email') {
    const [local, domain] = value.split('@');
    if (!domain) return '***@***.com';
    return `${local.charAt(0)}***@${domain}`;
  }

  if (type === 'phone') {
    return value.replace(/\d(?=\d{4})/g, '*');
  }

  if (type === 'budget') {
    return '**** (Restricted)';
  }

  return '*****';
}

export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars.charAt(array[i] % chars.length);
  }
  return result;
}

export const M365_OAUTH_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'User.Read',
  'Mail.ReadWrite',
  'Mail.Send',
  'Calendars.ReadWrite',
  'Contacts.Read',
  'Contacts.ReadWrite',
  'OnlineMeetings.ReadWrite',
];

export const GOOGLE_OAUTH_SCOPES = [
  'openid',
  'profile',
  'email',
];

const DEFAULT_USER: AppUser = {
  id: 'usr_001',
  email: 'demo@spihead.com',
  name: 'Demo User',
  role: 'Admin',
  authRole: 'Admin',
  mfaEnabled: false,
  pinCode: '',
  lastLoginAt: new Date().toISOString(),
  jobTitle: 'Administrator',
  department: 'Operations',
  ipAddress: '127.0.0.1'
};

const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  mfaRequired: false,
  sessionTimeoutMinutes: 30,
  dataMaskingEnabled: false,
  autoLockOnInactivity: true,
  ipWhitelistEnabled: false,
  allowedIpRanges: '127.0.0.1',
  maxFailedLoginAttempts: 5,
  requireStrongPassword: true,
  auditLoggingEnabled: true,
  encryptionMode: 'AES-256-GCM'
};

class AuthService {
  private currentUser: AppUser | null = null;
  private isAuthenticated: boolean = false;
  private isLocked: boolean = false;
  private sessionToken: string | null = null;
  private auditLogs: SecurityAuditLog[] = [];
  private securitySettings: SecuritySettings = DEFAULT_SECURITY_SETTINGS;
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadState();
    this.verifyBackendSession();
  }

  getSessionToken(): string | null {
    return this.sessionToken;
  }

  private loadState() {
    try {
      // Use sessionStorage instead of localStorage for better security (cleared on tab close)
      const savedAuth = sessionStorage.getItem('spihead_auth_user');
      const savedAuthStatus = sessionStorage.getItem('spihead_auth_is_authenticated');
      const savedToken = sessionStorage.getItem('spihead_auth_session_token');
      const savedLocked = sessionStorage.getItem('spihead_auth_is_locked');
      const savedLogs = localStorage.getItem('spihead_security_audit_logs');
      const savedSecSettings = localStorage.getItem('spihead_security_settings');

      if (savedToken) {
        this.sessionToken = savedToken;
      }

      if (savedAuth && savedToken) {
        this.currentUser = JSON.parse(savedAuth);
        if (this.currentUser && !this.currentUser.authRole) {
          this.currentUser.authRole = this.currentUser.role || 'Admin';
        }
        this.isAuthenticated = savedAuthStatus ? JSON.parse(savedAuthStatus) : false;
      } else {
        this.currentUser = null;
        this.isAuthenticated = false;
      }

      this.isLocked = savedLocked !== null ? JSON.parse(savedLocked) : false;

      if (savedLogs) {
        this.auditLogs = JSON.parse(savedLogs);
      } else {
        this.auditLogs = [];
      }

      if (savedSecSettings) {
        this.securitySettings = JSON.parse(savedSecSettings);
      }
    } catch (e) {
      this.currentUser = null;
      this.isAuthenticated = false;
      this.isLocked = false;
      this.sessionToken = null;
      this.auditLogs = [];
      this.securitySettings = { ...DEFAULT_SECURITY_SETTINGS };
    }
  }

  private async verifyBackendSession() {
    if (!this.sessionToken) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${this.sessionToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.user) {
          this.currentUser = data.user;
          this.isAuthenticated = true;
          this.saveState();
          this.notify();
        } else {
          this.clearSession();
        }
      } else {
        this.clearSession();
      }
    } catch (err) {
      console.warn('Backend session check skipped:', err);
    }
  }

  private clearSession() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.sessionToken = null;
    this.isLocked = false;
    this.saveState();
    this.notify();
  }

  private saveState() {
    try {
      if (this.currentUser) {
        sessionStorage.setItem('spihead_auth_user', JSON.stringify(this.currentUser));
      } else {
        sessionStorage.removeItem('spihead_auth_user');
      }

      if (this.sessionToken) {
        sessionStorage.setItem('spihead_auth_session_token', this.sessionToken);
      } else {
        sessionStorage.removeItem('spihead_auth_session_token');
      }

      sessionStorage.setItem('spihead_auth_is_authenticated', JSON.stringify(this.isAuthenticated));
      sessionStorage.setItem('spihead_auth_is_locked', JSON.stringify(this.isLocked));
      localStorage.setItem('spihead_security_audit_logs', JSON.stringify(this.auditLogs));
      localStorage.setItem('spihead_security_settings', JSON.stringify(this.securitySettings));
    } catch (e) {
      console.error('Failed to save auth state:', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public getCurrentUser(): AppUser | null {
    return this.currentUser;
  }

  public hasAdminOrOwnerAccess(): boolean {
    if (!this.currentUser) return false;
    const role = this.currentUser.authRole || this.currentUser.role;
    return role === 'Admin' || role === 'Owner';
  }

  public getIsAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  public getIsLocked(): boolean {
    return this.isLocked;
  }

  public getSecuritySettings(): SecuritySettings {
    return { ...this.securitySettings };
  }

  public getAuditLogs(): SecurityAuditLog[] {
    return [...this.auditLogs].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Login with credentials - uses backend API
   */
  public async login(email: string, role?: UserRole, password?: string): Promise<boolean> {
    const cleanEmail = sanitizeInput(email.trim().toLowerCase());
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: cleanEmail, 
          password: password || 'Password123!' 
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        this.sessionToken = data.token;
        this.currentUser = data.user;
        this.isAuthenticated = true;
        this.isLocked = false;

        sessionStorage.setItem('spihead_auth_session_token', data.token);
        sessionStorage.setItem('spihead_auth_user', JSON.stringify(data.user));
        sessionStorage.setItem('spihead_auth_is_authenticated', 'true');

        this.logAuditEvent(
          'User Authentication Sign-In',
          'Authentication',
          'Info',
          `Session authorized for ${cleanEmail}`
        );

        this.saveState();
        this.notify();
        return true;
      }

      throw new Error(data.error || 'Authentication failed');
    } catch (err: any) {
      console.error('Login error:', err);
      throw new Error(err.message || 'Authentication failed. Please check your credentials.');
    }
  }

  /**
   * Register a new user - uses backend API
   */
  public async register(details: {
    fullName: string;
    email: string;
    companyName?: string;
    companySize?: string;
    role?: UserRole;
    selectedPlan?: string;
    password?: string;
  }): Promise<boolean> {
    const cleanName = sanitizeInput(details.fullName.trim());
    const cleanEmail = sanitizeInput(details.email.trim().toLowerCase());
    const cleanCompany = details.companyName ? sanitizeInput(details.companyName.trim()) : '';

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: cleanName,
          email: cleanEmail,
          companyName: cleanCompany,
          companySize: details.companySize || '1-10',
          role: details.role || 'Admin',
          selectedPlan: details.selectedPlan || 'business',
          password: details.password || 'Password123!'
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        this.sessionToken = data.token;
        this.currentUser = data.user;
        this.isAuthenticated = true;
        this.isLocked = false;

        sessionStorage.setItem('spihead_auth_session_token', data.token);
        sessionStorage.setItem('spihead_auth_user', JSON.stringify(data.user));
        sessionStorage.setItem('spihead_auth_is_authenticated', 'true');

        this.logAuditEvent(
          'New Account Registration',
          'Authentication',
          'Info',
          `New account created for ${cleanName} (${cleanEmail})`
        );

        this.saveState();
        this.notify();
        return true;
      }

      throw new Error(data.error || 'Registration failed');
    } catch (err: any) {
      console.error('Registration error:', err);
      throw new Error(err.message || 'Failed to create account. Please try again.');
    }
  }

  public async loginWithOAuthProvider(provider: 'google' | 'microsoft'): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const authWindow = window.open(
        `/api/auth/oauth/url?provider=${provider}`,
        `${provider}_oauth_popup`,
        'width=600,height=700,scrollbars=yes'
      );

      if (!authWindow) {
        reject(new Error('Popup was blocked. Please allow popups for this site.'));
        return;
      }

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          const { token, user } = event.data;
          if (token && user) {
            this.sessionToken = token;
            this.currentUser = user;
            this.isAuthenticated = true;
            this.isLocked = false;

            sessionStorage.setItem('spihead_auth_session_token', token);
            sessionStorage.setItem('spihead_auth_user', JSON.stringify(user));
            sessionStorage.setItem('spihead_auth_is_authenticated', 'true');

            this.logAuditEvent(
              `${provider} OAuth Sign-In Success`,
              'Authentication',
              'Info',
              `User ${user.email} authenticated via OAuth`
            );

            this.saveState();
            this.notify();
            resolve(true);
          }
        }
      };

      window.addEventListener('message', handleMessage);

      const popupTimer = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(popupTimer);
          if (!this.isAuthenticated) {
            window.removeEventListener('message', handleMessage);
            reject(new Error('OAuth sign-in was cancelled or the window was closed.'));
          }
        }
      }, 1000);
    });
  }

  public async logout(): Promise<void> {
    if (this.sessionToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.sessionToken}` }
        });
      } catch (e) {
        // Ignore logout fetch errors
      }
    }

    this.logAuditEvent(
      'User Session Terminated',
      'Authentication',
      'Info',
      `User ${this.currentUser?.email || 'Unknown'} signed out`
    );

    this.clearSession();
  }

  public lockSession(): void {
    if (!this.isAuthenticated) return;
    this.isLocked = true;
    this.logAuditEvent(
      'Session Locked',
      'Security Alert',
      'Low',
      'Session locked due to user request'
    );
    this.saveState();
    this.notify();
  }

  public unlockSession(pin: string): boolean {
    const validPin = this.currentUser?.pinCode || '';
    if (pin === validPin || pin === '1234') { // Allow default PIN for testing
      this.isLocked = false;
      this.logAuditEvent(
        'Session Unlocked',
        'Authentication',
        'Info',
        'Session PIN verification successful'
      );
      this.saveState();
      this.notify();
      return true;
    } else {
      this.logAuditEvent(
        'Failed Session Unlock Attempt',
        'Security Alert',
        'Medium',
        `Incorrect PIN entered for account ${this.currentUser?.email}`
      );
      return false;
    }
  }

  public updateUserRole(newRole: UserRole): void {
    if (!this.currentUser) return;
    const oldRole = this.currentUser.authRole || this.currentUser.role;
    this.currentUser.role = newRole;
    this.currentUser.authRole = newRole;

    this.logAuditEvent(
      'Role Changed',
      'Permission',
      'High',
      `Role changed from ${oldRole} to ${newRole}`
    );

    this.saveState();
    this.notify();
  }

  public updateSecuritySettings(settings: Partial<SecuritySettings>): void {
    this.securitySettings = { ...this.securitySettings, ...settings };
    this.logAuditEvent(
      'Security Settings Updated',
      'System Config',
      'Medium',
      `Updated settings: ${Object.keys(settings).join(', ')}`
    );
    this.saveState();
    this.notify();
  }

  public logAuditEvent(
    action: string,
    category: SecurityAuditLog['category'],
    severity: SecurityAuditLog['severity'],
    details?: string
  ): void {
    if (!this.securitySettings.auditLoggingEnabled) return;

    const newLog: SecurityAuditLog = {
      id: 'log_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      action,
      category,
      userEmail: this.currentUser?.email || 'system@spihead.com',
      userRole: this.currentUser?.role || 'System',
      ipAddress: this.currentUser?.ipAddress || '127.0.0.1',
      severity,
      timestamp: new Date().toISOString(),
      details
    };

    this.auditLogs = [newLog, ...this.auditLogs].slice(0, 100);
    this.saveState();
    this.notify();
  }

  public clearAuditLogs(): void {
    this.auditLogs = [];
    this.logAuditEvent('Audit Logs Cleared', 'System Config', 'High', 'Audit trail reset');
    this.saveState();
    this.notify();
  }

  public async refreshToken(): Promise<boolean> {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.sessionToken })
      });

      if (res.ok) {
        const data = await res.json();
        this.sessionToken = data.token;
        sessionStorage.setItem('spihead_auth_session_token', data.token);
        this.saveState();
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Refresh user data from the backend
   * Updates currentUser with latest profile information
   */
  public async refreshUser(): Promise<boolean> {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${this.sessionToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.user) {
          this.currentUser = data.user;
          this.saveState();
          this.notify();
          return true;
        }
      }
      return false;
    } catch (err) {
      console.warn('Failed to refresh user:', err);
      return false;
    }
  }

  // Helper methods for SSO
  public async loginWithM365(email?: string): Promise<boolean> {
    return this.loginWithOAuthProvider('microsoft');
  }

  public async loginWithGoogle(email?: string): Promise<boolean> {
    return this.loginWithOAuthProvider('google');
  }
}

export const authService = new AuthService();

export const getCurrentUser = () => authService.getCurrentUser();
export const isAuthenticated = () => authService.getIsAuthenticated();
export const logout = () => authService.logout();
export const refreshToken = () => authService.refreshToken();
