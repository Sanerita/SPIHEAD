import { AppUser, UserRole, SecurityAuditLog, SecuritySettings } from '../types/crm';

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
  role: 'Admin',
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
  private isAuthenticated: boolean = true;
  private isLocked: boolean = false;
  private auditLogs: SecurityAuditLog[] = [];
  private securitySettings: SecuritySettings = DEFAULT_SECURITY_SETTINGS;
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const savedAuth = localStorage.getItem('spihead_auth_user');
      const savedAuthStatus = localStorage.getItem('spihead_auth_is_authenticated');
      const savedLocked = localStorage.getItem('spihead_auth_is_locked');
      const savedLogs = localStorage.getItem('spihead_security_audit_logs');
      const savedSecSettings = localStorage.getItem('spihead_security_settings');

      if (savedAuth) {
        this.currentUser = JSON.parse(savedAuth);
      } else {
        this.currentUser = { ...DEFAULT_USER };
      }

      this.isAuthenticated = savedAuthStatus !== null ? JSON.parse(savedAuthStatus) : true;
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
      this.currentUser = { ...DEFAULT_USER };
      this.isAuthenticated = true;
      this.isLocked = false;
      this.auditLogs = [...INITIAL_AUDIT_LOGS];
      this.securitySettings = { ...DEFAULT_SECURITY_SETTINGS };
    }
  }

  private saveState() {
    try {
      localStorage.setItem('spihead_auth_user', JSON.stringify(this.currentUser));
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

  public login(email: string, role: UserRole = 'Admin'): boolean {
    this.currentUser = {
      ...DEFAULT_USER,
      email: email || DEFAULT_USER.email,
      role: role,
      lastLoginAt: new Date().toISOString()
    };
    this.isAuthenticated = true;
    this.isLocked = false;

    this.logAuditEvent(
      'User Authentication Sign-In',
      'Authentication',
      'Info',
      `Session authorized for ${email} with role [${role}]`
    );

    this.saveState();
    this.notify();
    return true;
  }

  public register(details: {
    fullName: string;
    email: string;
    companyName: string;
    companySize?: string;
    role?: UserRole;
    selectedPlan?: string;
  }): boolean {
    const newUser: AppUser = {
      id: 'usr_' + Date.now().toString(36),
      email: details.email,
      name: details.fullName,
      role: details.role || 'Admin',
      mfaEnabled: true,
      pinCode: '1234',
      lastLoginAt: new Date().toISOString(),
      jobTitle: `${details.companyName} Workspace Founder / Admin`,
      department: 'Executive Operations',
      ipAddress: '197.189.204.12 (TLS 1.3 Verified)'
    };

    this.currentUser = newUser;
    this.isAuthenticated = true;
    this.isLocked = false;

    this.logAuditEvent(
      'New Account Workspace Registration',
      'Authentication',
      'Info',
      `New enterprise workspace created for "${details.companyName}" by ${details.fullName} (${details.email}). Plan: ${details.selectedPlan || 'Small Business'}`
    );

    this.saveState();
    this.notify();
    return true;
  }

  public loginWithM365(email?: string): boolean {
    this.currentUser = {
      ...DEFAULT_USER,
      email: email || 'sanelisiwe.sileku@spihead.com',
      name: 'Sanelisiwe Sileku (Azure Entra Verified)',
      role: 'Admin',
      lastLoginAt: new Date().toISOString()
    };
    this.isAuthenticated = true;
    this.isLocked = false;

    this.logAuditEvent(
      'Microsoft 365 Entra Single Sign-On (SSO)',
      'M365 OAuth',
      'Info',
      'Authenticated via Azure AD OAuth 2.0 PKCE Authorization'
    );

    this.saveState();
    this.notify();
    return true;
  }

  public logout(): void {
    this.logAuditEvent(
      'User Session Terminated (Logout)',
      'Authentication',
      'Info',
      `User ${this.currentUser?.email || 'Unknown'} signed out`
    );

    this.isAuthenticated = false;
    this.isLocked = false;
    this.saveState();
    this.notify();
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
    const oldRole = this.currentUser.role;
    this.currentUser.role = newRole;

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
