import crypto from 'crypto';

export interface ServerUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
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
}

export const SEED_USERS: ServerUser[] = [
  {
    id: "usr_001_exec",
    email: "sanelisiwe.sileku@spihead.com",
    name: "Sanelisiwe Sileku",
    passwordHash: crypto.createHash("sha256").update("Password123!").digest("hex"),
    role: "Owner",
    authRole: "Owner",
    mfaEnabled: true,
    pinCode: "1234",
    lastLoginAt: new Date().toISOString(),
    jobTitle: "Chief Executive Officer / Founder",
    department: "Executive Operations",
    ipAddress: "197.189.204.12",
    companyName: "SPIHEAD Enterprise",
    selectedPlan: "small-business"
  },
  {
    id: "usr_002_admin",
    email: "admin@spihead.com",
    name: "SPIHEAD Administrator",
    passwordHash: crypto.createHash("sha256").update("Password123!").digest("hex"),
    role: "Admin",
    authRole: "Admin",
    mfaEnabled: true,
    pinCode: "1234",
    lastLoginAt: new Date().toISOString(),
    jobTitle: "Enterprise Systems Administrator",
    department: "IT Security",
    ipAddress: "127.0.0.1",
    companyName: "SPIHEAD Corp",
    selectedPlan: "enterprise"
  },
  {
    id: "usr_003_demo",
    email: "user@company.com",
    name: "Demo Sales Executive",
    passwordHash: crypto.createHash("sha256").update("Password123!").digest("hex"),
    role: "Sales Rep",
    authRole: "Sales Rep",
    mfaEnabled: true,
    pinCode: "1234",
    lastLoginAt: new Date().toISOString(),
    jobTitle: "Senior Account Executive",
    department: "Global Revenue",
    ipAddress: "192.168.1.1",
    companyName: "Acme Corp",
    selectedPlan: "small-business"
  }
];

export const usersDb = new Map<string, ServerUser>();
SEED_USERS.forEach((u) => usersDb.set(u.email.toLowerCase(), u));

export const activeSessions = new Map<string, { userEmail: string; expiresAt: number }>();
