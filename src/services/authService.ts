import AsyncStorage from '@react-native-async-storage/async-storage';
import {apiFetch, clearAuthToken, setAuthToken} from './apiClient';

const AUTH_KEY = '@siteops/auth/v1';
const MIN_PASSWORD_LENGTH = 8;

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

export type DemoAccount = {
  email: string;
  name: string;
  role: UserRole;
};

export type AuthErrorCode =
  | 'invalid-email'
  | 'weak-password'
  | 'missing-name'
  | 'missing-company'
  | 'password-mismatch'
  | 'email-exists'
  | 'network'
  | 'invalid-credentials'
  | 'demo-disabled';

export class AuthError extends Error {
  code: AuthErrorCode;

  constructor(code: AuthErrorCode) {
    super(code);
    this.code = code;
  }
}

/** Public demo account labels — passwords are NOT shipped in the app binary. */
export const testAccounts: DemoAccount[] = [
  {email: 'owner@siteops.ai', name: 'Owner Demo', role: 'owner'},
  {email: 'manager@siteops.ai', name: 'Manager Demo', role: 'manager'},
  {email: 'foreman@siteops.ai', name: 'Foreman Demo', role: 'foreman'},
  {email: 'accountant@siteops.ai', name: 'Accountant Demo', role: 'accountant'},
  {email: 'worker@siteops.ai', name: 'Worker Demo', role: 'worker'},
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
  await setAuthToken(token);
}

async function parseAuthResponse(response: Response): Promise<AppUser> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = typeof data.error === 'string' ? data.error : '';
    if (code === 'email-exists') {
      throw new AuthError('email-exists');
    }
    if (code === 'invalid-email' || code === 'invalid-input') {
      throw new AuthError('invalid-email');
    }
    if (code === 'demo-disabled') {
      throw new AuthError('demo-disabled');
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

async function requestAuth(
  path: '/api/auth/login' | '/api/auth/register' | '/api/auth/demo',
  payload: Record<string, string>,
): Promise<AppUser> {
  let response: Response;
  try {
    response = await apiFetch(path, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AuthError('network');
  }

  return parseAuthResponse(response);
}

export async function loginUser(email: string, password: string): Promise<AppUser> {
  const cleanEmail = email.trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    throw new AuthError('invalid-email');
  }
  return requestAuth('/api/auth/login', {email: cleanEmail, password});
}

export async function loginDemoUser(role: UserRole): Promise<AppUser> {
  return requestAuth('/api/auth/demo', {role});
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
  if (input.password.length < MIN_PASSWORD_LENGTH) {
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
  try {
    await apiFetch('/api/auth/logout', {method: 'POST'});
  } catch {
    // Local logout must succeed even if the network call fails.
  }
  await AsyncStorage.removeItem(AUTH_KEY);
  await clearAuthToken();
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

export function minPasswordLength() {
  return MIN_PASSWORD_LENGTH;
}
