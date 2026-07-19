import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL} from '../config';

const AUTH_KEY = '@siteops/auth/v1';
const AUTH_TOKEN_KEY = '@siteops/auth-token/v1';

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

export interface StoredUser extends AppUser {
  password: string;
}

export type AuthErrorCode =
  | 'invalid-email'
  | 'weak-password'
  | 'missing-name'
  | 'missing-company'
  | 'password-mismatch'
  | 'email-exists'
  | 'network'
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

export async function getCurrentUser(): Promise<AppUser | null> {
  const value = await AsyncStorage.getItem(AUTH_KEY);
  return value ? JSON.parse(value) as AppUser : null;
}

async function saveSession(user: AppUser, token: string) {
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user));
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
}

async function requestAuth(
  path: '/api/auth/login' | '/api/auth/register',
  payload: Record<string, string>,
): Promise<AppUser> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AuthError('network');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = typeof data.error === 'string' ? data.error : '';
    if (code === 'email-exists') {
      throw new AuthError('email-exists');
    }
    if (code === 'invalid-email' || code === 'invalid-input') {
      throw new AuthError('invalid-email');
    }
    if (response.status === 401) {
      throw new AuthError('invalid-credentials');
    }
    throw new AuthError('network');
  }

  if (!data.user || typeof data.token !== 'string') {
    throw new AuthError('network');
  }

  await saveSession(data.user as AppUser, data.token);
  return data.user as AppUser;
}

export async function loginUser(email: string, password: string): Promise<AppUser> {
  const cleanEmail = email.trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    throw new AuthError('invalid-email');
  }
  return requestAuth('/api/auth/login', {email: cleanEmail, password});
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
  if (input.companyName.trim().length < 2) {
    throw new AuthError('missing-company');
  }
  return requestAuth('/api/auth/register', {
    email: cleanEmail,
    password: input.password,
    name: input.name.trim(),
    role: input.role,
    companyName: input.companyName.trim(),
  });
}

export async function logoutUser(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_KEY);
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
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
