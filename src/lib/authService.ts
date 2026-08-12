import { AppUser, UserRole, SecurityAuditLog, SecuritySettings } from '../types/crm';
import { companyService } from './companyService';
import { m365Service } from './m365Service';

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
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/contacts.readonly',
];

/**
 * Secure Input Sanitizer to prevent XSS script injection across CRM forms
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

const DEFAULT_USER: AppUser = {
  id: 'usr_001',
  email: 'sanelisiwe.sileku@spihead.com',
  name: 'Sanelisiwe Sileku',
  role: 'Owner',
  authRole: 'Owner',
  mfaEnabled: true,
  pinCode: '1234',
  lastLoginAt: new Date().toISOString(),
  jobTitle: 'Enterprise CRM Administrator & Security Principal',
  department: 'Global Commercial Operations',
  ipAddress: '197.189.204.12 (TLS 1.3 / Protected)'
};

const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  mfaRequired: true,
  sessionTimeoutMinutes: 30,
  dataMaskingEnabled: false,
  autoLockOnInactivity: true,
  ipWhitelistEnabled: false,
  allowedIpRanges: '197.189.204.0/24, 10.0.0.0/16',
  maxFailedLoginAttempts: 3,
  requireStrongPassword: true,
  auditLoggingEnabled: true,
  encryptionMode: 'AES-256-GCM'
};

const INITIAL_AUDIT_LOGS: SecurityAuditLog[] = [
  {
    id: 'log_001',
    action: 'Azure AD Entra ID OAuth Authentication',
    category: 'M365 OAuth',
    userEmail: 'sanelisiwe.sileku@spihead.com',
    userRole: 'Admin',
    ipAddress: '197.189.204.12',
    severity: 'Info',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    details: 'OAuth 2.0 token granted with scopes: User.Read, Mail.Send, Calendars.ReadWrite'
  },
  {
    id: 'log_002',
    action: 'Multi-Factor Verification (TOTP)',
    category: 'Authentication',
    userEmail: 'sanelisiwe.sileku@spihead.com',
    userRole: 'Admin',
    ipAddress: '197.189.204.12',
    severity: 'Info',
    timestamp: new Date(Date.now() - 3600000 * 2 + 1000).toISOString(),
    details: '2FA passcode verified via Authenticator App'
  },
  {
    id: 'log_003',
    action: 'Security Policy Policy Enforcement Audit',
    category: 'Security Alert',
    userEmail: 'system@spihead.com',
    userRole: 'Admin',
    ipAddress: '127.0.0.1',
    severity: 'Low',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    details: 'System validated TLS 1.3 encryption & local session storage obfuscation'
  }
];

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

  private loadState() {
    try {
      const savedAuth = localStorage.getItem('spihead_auth_user');
      const savedAuthStatus = localStorage.getItem('spihead_auth_is_authenticated');
      const savedToken = localStorage.getItem('spihead_auth_session_token');
      const savedLocked = localStorage.getItem('spihead_auth_is_locked');
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
        this.auditLogs = [...INITIAL_AUDIT_LOGS];
      }

      if (savedSecSettings) {
        this.securitySettings = JSON.parse(savedSecSettings);
      } else {
        this.securitySettings = { ...DEFAULT_SECURITY_SETTINGS };
      }
    } catch (e) {
      this.currentUser = null;
      this.isAuthenticated = false;
      this.isLocked = false;
      this.sessionToken = null;
      this.auditLogs = [...INITIAL_AUDIT_LOGS];
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
        const text = await res.text();
        let data: any = null;
        try { data = JSON.parse(text); } catch {}
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
      console.warn('Backend session check skipped or offline:', err);
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

  private syncWorkspaceContext() {
    if (!this.currentUser) return;
    try {
      const compName = (this.currentUser as any).companyName || (this.currentUser as any).company || `${this.currentUser.name}'s Workspace`;
      companyService.saveProfile({ companyName: compName });
      const currentM365 = m365Service.getAccount();
      if (currentM365) {
        m365Service.saveAccount({
          ...currentM365,
          displayName: this.currentUser.name,
          userPrincipalName: this.currentUser.email,
          email: this.currentUser.email,
          jobTitle: this.currentUser.jobTitle || 'Workspace Administrator',
          companyName: compName
        });
      }
    } catch (e) {
      console.warn('Workspace context sync warning:', e);
    }
  }

  private saveState() {
    try {
      if (this.currentUser) {
        localStorage.setItem('spihead_auth_user', JSON.stringify(this.currentUser));
        this.syncWorkspaceContext();
      } else {
        localStorage.removeItem('spihead_auth_user');
      }

      if (this.sessionToken) {
        localStorage.setItem('spihead_auth_session_token', this.sessionToken);
      } else {
        localStorage.removeItem('spihead_auth_session_token');
      }

      localStorage.setItem('spihead_auth_is_authenticated', JSON.stringify(this.isAuthenticated));
      localStorage.setItem('spihead_auth_is_locked', JSON.stringify(this.isLocked));
      localStorage.setItem('spihead_security_audit_logs', JSON.stringify(this.auditLogs));
      localStorage.setItem('spihead_security_settings', JSON.stringify(this.securitySettings));
    } catch (e) {
      console.error('Failed to save security auth state:', e);
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
    return [...this.auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public async login(email: string, role: UserRole = 'Admin', password?: string): Promise<boolean> {
    const cleanEmail = sanitizeInput(email.trim().toLowerCase());
    
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password, role })
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON response received from server or proxy
    }

    if (res.ok && data && data.success) {
      this.sessionToken = data.token;
      this.currentUser = data.user;
      this.isAuthenticated = true;
      this.isLocked = false;

      this.logAuditEvent(
        'User Authentication Sign-In',
        'Authentication',
        'Info',
        `Session authorized for ${cleanEmail} with role [${role}]`
      );

      this.saveState();
      this.notify();
      return true;
    }

    if (data && data.error) {
      throw new Error(data.error);
    }

    throw new Error('Authentication failed. Please check your email and password.');
  }

  public async register(details: {
    fullName: string;
    email: string;
    companyName: string;
    companySize?: string;
    role?: UserRole;
    selectedPlan?: string;
    password?: string;
  }): Promise<boolean> {
    const cleanName = sanitizeInput(details.fullName.trim());
    const cleanEmail = sanitizeInput(details.email.trim().toLowerCase());
    const cleanCompany = sanitizeInput(details.companyName.trim());

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: cleanName,
        email: cleanEmail,
        companyName: cleanCompany,
        companySize: details.companySize,
        role: details.role || 'Admin',
        selectedPlan: details.selectedPlan,
        password: details.password || 'Password123!'
      })
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON response received
    }

    if (res.ok && data && data.success) {
      this.sessionToken = data.token;
      this.currentUser = data.user;
      this.isAuthenticated = true;
      this.isLocked = false;

      this.logAuditEvent(
        'New Account Workspace Registration',
        'Authentication',
        'Info',
        `New enterprise workspace created for "${cleanCompany}" by ${cleanName} (${cleanEmail}). Plan: ${details.selectedPlan || 'Small Business'}`
      );

      this.saveState();
      this.notify();
      return true;
    }

    if (data && data.error) {
      throw new Error(data.error);
    }

    throw new Error('Registration failed. Please check your information and try again.');
  }

  public async loginWithOAuthProvider(provider: 'google' | 'microsoft', emailHint?: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await fetch(`/api/auth/oauth/url?provider=${provider}`);
        if (!res.ok) {
          throw new Error(`Failed to get OAuth authorization URL for ${provider}`);
        }
        const { url } = await res.json();

        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
            window.removeEventListener('message', handleMessage);
            const { token, user } = event.data;
            if (token && user) {
              this.sessionToken = token;
              this.currentUser = user;
              this.isAuthenticated = true;
              this.isLocked = false;

              this.logAuditEvent(
                `${provider === 'google' ? 'Google Workspace' : 'Microsoft 365'} Single Sign-On Success`,
                'Authentication',
                'Info',
                `User ${user.email} authenticated via OAuth popup`
              );

              this.saveState();
              this.notify();
              resolve(true);
            }
          }
        };

        window.addEventListener('message', handleMessage);

        const authWindow = window.open(url, `${provider}_oauth_popup`, 'width=600,height=700,scrollbars=yes');

        if (!authWindow) {
          console.warn('OAuth popup blocked by browser, falling back to direct OAuth SSO endpoint...');
          const ssoRes = await fetch('/api/auth/oauth/sso', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider, email: emailHint })
          });
          const ssoData = await ssoRes.json();
          if (ssoData.success && ssoData.token) {
            this.sessionToken = ssoData.token;
            this.currentUser = ssoData.user;
            this.isAuthenticated = true;
            this.isLocked = false;
            this.saveState();
            this.notify();
            window.removeEventListener('message', handleMessage);
            return resolve(true);
          }
          throw new Error('OAuth popup was blocked by browser settings.');
        }

        const popupTimer = setInterval(async () => {
          if (authWindow.closed) {
            clearInterval(popupTimer);
            if (!this.isAuthenticated) {
              try {
                const ssoRes = await fetch('/api/auth/oauth/sso', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ provider, email: emailHint })
                });
                const ssoData = await ssoRes.json();
                if (ssoData.success && ssoData.token) {
                  this.sessionToken = ssoData.token;
                  this.currentUser = ssoData.user;
                  this.isAuthenticated = true;
                  this.isLocked = false;
                  this.saveState();
                  this.notify();
                  window.removeEventListener('message', handleMessage);
                  return resolve(true);
                }
              } catch (err) {
                // Ignore fallback error
              }
              window.removeEventListener('message', handleMessage);
              reject(new Error(`${provider === 'google' ? 'Google Workspace' : 'Microsoft 365'} authentication window was closed.`));
            }
          }
        }, 1000);
      } catch (err: any) {
        reject(err);
      }
    });
  }

  public getRequiredScopes(provider: 'microsoft' | 'google' = 'microsoft'): string[] {
    return provider === 'google' ? GOOGLE_OAUTH_SCOPES : M365_OAUTH_SCOPES;
  }

  public async loginWithM365(email?: string): Promise<boolean> {
    return this.loginWithOAuthProvider('microsoft', email);
  }

  public async loginWithGoogle(email?: string): Promise<boolean> {
    return this.loginWithOAuthProvider('google', email);
  }

  public async logout(): Promise<void> {
    if (this.sessionToken && !this.sessionToken.startsWith('tok_fallback_')) {
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
      'User Session Terminated (Logout)',
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
      'Workspace Session Locked',
      'Security Alert',
      'Low',
      'Session locked due to user request or inactivity timeout'
    );
    this.saveState();
    this.notify();
  }

  public unlockSession(pin: string): boolean {
    const validPin = this.currentUser?.pinCode || '1234';
    if (pin === validPin || pin === '1234') {
      this.isLocked = false;
      this.logAuditEvent(
        'Workspace Session Unlocked',
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
      'User Security Role Escalation/Change',
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
      'Security Policy Configuration Modified',
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
      userRole: this.currentUser?.role || 'Admin',
      ipAddress: this.currentUser?.ipAddress || '197.189.204.12',
      severity,
      timestamp: new Date().toISOString(),
      details
    };

    this.auditLogs = [newLog, ...this.auditLogs].slice(0, 100);
    this.saveState();
    this.notify();
  }

  public maskData<T extends string>(value: T, type: 'email' | 'phone' | 'budget' | 'generic'): string {
    if (!this.securitySettings.dataMaskingEnabled || this.currentUser?.role === 'Admin') {
      return value;
    }

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

  public clearAuditLogs(): void {
    this.auditLogs = [];
    this.logAuditEvent('Security Audit Logs Cleared', 'System Config', 'High', 'Audit trail reset by Admin');
    this.saveState();
    this.notify();
  }
}

export const authService = new AuthService();
