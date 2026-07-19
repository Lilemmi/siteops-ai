import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_KEY = '@siteops/auth/v1';
const USERS_KEY = '@siteops/users/v1';

export type UserRole = 'owner' | 'manager' | 'foreman' | 'accountant' | 'worker';

export type Permission =
  | 'site.create'
  | 'site.delete'
  | 'finance.view'
  | 'finance.edit'
  | 'report.create'
  | 'task.manage'
  | 'data.backup';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
  companyName: string;
  siteIds: 'all' | string[];
  createdAt: string;
}

interface StoredUser extends AppUser {
  password: string;
}

export type AuthErrorCode =
  | 'invalid-email'
  | 'weak-password'
  | 'missing-name'
  | 'email-exists'
  | 'invalid-credentials';

export class AuthError extends Error {
  code: AuthErrorCode;

  constructor(code: AuthErrorCode) {
    super(code);
    this.code = code;
  }
}

export const testAccounts: Array<StoredUser> = [
  {id: 'judge-owner', email: 'owner@siteops.ai', password: 'demo123', name: 'Owner Demo', role: 'owner', companyId: 'demo-company', companyName: 'SiteOps Demo', siteIds: 'all', createdAt: '2026-07-19T00:00:00.000Z'},
  {id: 'judge-manager', email: 'manager@siteops.ai', password: 'demo123', name: 'Manager Demo', role: 'manager', companyId: 'demo-company', companyName: 'SiteOps Demo', siteIds: 'all', createdAt: '2026-07-19T00:00:00.000Z'},
  {id: 'judge-foreman', email: 'foreman@siteops.ai', password: 'demo123', name: 'Foreman Demo', role: 'foreman', companyId: 'demo-company', companyName: 'SiteOps Demo', siteIds: 'all', createdAt: '2026-07-19T00:00:00.000Z'},
  {id: 'judge-accountant', email: 'accountant@siteops.ai', password: 'demo123', name: 'Accountant Demo', role: 'accountant', companyId: 'demo-company', companyName: 'SiteOps Demo', siteIds: 'all', createdAt: '2026-07-19T00:00:00.000Z'},
  {id: 'judge-worker', email: 'worker@siteops.ai', password: 'demo123', name: 'Worker Demo', role: 'worker', companyId: 'demo-company', companyName: 'SiteOps Demo', siteIds: 'all', createdAt: '2026-07-19T00:00:00.000Z'},
];

const permissions: Record<UserRole, Permission[]> = {
  owner: ['site.create', 'site.delete', 'finance.view', 'finance.edit', 'report.create', 'task.manage', 'data.backup'],
  manager: ['site.create', 'finance.view', 'finance.edit', 'report.create', 'task.manage', 'data.backup'],
  foreman: ['report.create', 'task.manage'],
  accountant: ['finance.view', 'finance.edit', 'data.backup'],
  worker: ['report.create'],
};

function publicUser(user: StoredUser): AppUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
    companyName: user.companyName,
    siteIds: user.siteIds,
    createdAt: user.createdAt,
  };
}

async function getStoredUsers(): Promise<StoredUser[]> {
  const value = await AsyncStorage.getItem(USERS_KEY);
  const customUsers = value ? JSON.parse(value) as StoredUser[] : [];
  const byEmail = new Map<string, StoredUser>();
  [...testAccounts, ...customUsers].forEach(user => byEmail.set(user.email.toLowerCase(), user));
  return [...byEmail.values()];
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const value = await AsyncStorage.getItem(AUTH_KEY);
  return value ? JSON.parse(value) as AppUser : null;
}

export async function loginUser(email: string, password: string): Promise<AppUser> {
  const cleanEmail = email.trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    throw new AuthError('invalid-email');
  }
  const user = (await getStoredUsers()).find(item => item.email.toLowerCase() === cleanEmail && item.password === password);
  if (!user) {
    throw new AuthError('invalid-credentials');
  }
  const safeUser = publicUser(user);
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(safeUser));
  return safeUser;
}

export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  companyName: string;
}): Promise<AppUser> {
  const cleanEmail = input.email.trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    throw new AuthError('invalid-email');
  }
  if (input.password.length < 6) {
    throw new AuthError('weak-password');
  }
  if (input.name.trim().length < 2) {
    throw new AuthError('missing-name');
  }
  const users = await getStoredUsers();
  if (users.some(user => user.email.toLowerCase() === cleanEmail)) {
    throw new AuthError('email-exists');
  }
  const user: StoredUser = {
    id: `user-${Date.now()}`,
    email: cleanEmail,
    password: input.password,
    name: input.name.trim(),
    role: input.role,
    companyId: `company-${Date.now()}`,
    companyName: input.companyName.trim() || 'SiteOps Company',
    siteIds: 'all',
    createdAt: new Date().toISOString(),
  };
  const customUsers = users.filter(item => !testAccounts.some(test => test.email === item.email));
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify([user, ...customUsers]));
  const safeUser = publicUser(user);
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(safeUser));
  return safeUser;
}

export async function logoutUser(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_KEY);
}

export function can(user: AppUser | null | undefined, permission: Permission): boolean {
  return Boolean(user && permissions[user.role].includes(permission));
}

export function roleLabelKey(role: UserRole) {
  return `auth.roles.${role}`;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
}
