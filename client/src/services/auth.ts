import { apiGet, apiPatchForm, apiPost } from './http';
import type { User, UserRole } from '@/types';

const API_BASE_URL = process.env.API_BASE_URL || '/api';

export interface LoginPayload {
  email: string;
  password: string;
  role?: UserRole;
}

export interface RegisterPayload {
  fullName: string;
  studentCode: string;
  email: string;
  phone?: string;
  password: string;
}

export interface AuthMessageResponse {
  message?: string;
}

export interface AvatarUploadResponse {
  message?: string;
  avatarUrl?: string;
  avatar?: string;
  data?: { avatarUrl?: string; avatar?: string };
}

type RawUser = Partial<User> & {
  id?: string | number;
  name?: string;
  full_name?: string;
  avatar_url?: string;
  avatarUrl?: string;
  trust_score?: number;
  trustScore?: number;
  trust_rank?: string;
  trustRank?: string;
  good_return_streak?: number;
  goodReturnStreak?: number;
  studentId?: string | number;
  student_id?: string | number;
  studentCode?: string;
  student_code?: string;
  className?: string;
  class_name?: string;
  phone?: string;
  borrowLocked?: boolean;
  borrow_locked?: boolean;
  borrowLockUntil?: string;
  borrow_lock_until?: string;
  borrowLockReason?: string;
  borrow_lock_reason?: string;
  isPermanentlyLocked?: boolean;
  is_permanently_locked?: boolean;
  permanentLockReason?: string;
  permanent_lock_reason?: string;
  student?: Partial<User> & {
    id?: string | number;
    studentId?: string | number;
    student_id?: string | number;
    fullName?: string;
    full_name?: string;
    name?: string;
    avatar?: string;
    avatarUrl?: string;
    avatar_url?: string;
    trustScore?: number;
    trust_score?: number;
    trustRank?: string;
    trust_rank?: string;
    goodReturnStreak?: number;
    good_return_streak?: number;
    studentCode?: string;
    student_code?: string;
    className?: string;
    class_name?: string;
    phone?: string;
    borrowLocked?: boolean;
    borrow_locked?: boolean;
    borrowLockUntil?: string;
    borrow_lock_until?: string;
    borrowLockReason?: string;
    borrow_lock_reason?: string;
    isPermanentlyLocked?: boolean;
    is_permanently_locked?: boolean;
    permanentLockReason?: string;
    permanent_lock_reason?: string;
  };
  data?: RawUser;
};

interface DemoAccount {
  email: string;
  password: string;
  user: User;
}

interface MeResponse {
  message?: string;
  data?: RawUser;
}

// FE-only demo fallback for deployments where the backend/database is not online yet.
const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'admin@school.edu.vn',
    password: 'password',
    user: {
      id: 'demo-admin',
      fullName: 'Admin Demo',
      name: 'Admin Demo',
      email: 'admin@school.edu.vn',
      role: 'admin',
      token: 'demo-token-admin'
    }
  },
  {
    email: 'phanhaiduc1262006@gmail.com',
    password: '120606',
    user: {
      id: 'demo-student-1',
      studentId: 'demo-student-1',
      fullName: 'Phan Hải Đức',
      name: 'Phan Hải Đức',
      email: 'phanhaiduc1262006@gmail.com',
      role: 'student',
      studentCode: 'DEMO001',
      className: 'Demo',
      token: 'demo-token-student',
      trustScore: 100,
      trustRank: 'diamond',
      goodReturnStreak: 0,
      borrowLocked: false,
      isPermanentlyLocked: false
    }
  },
  {
    email: 'pdd150999@gmail.com',
    password: '654321',
    user: {
      id: 'demo-student-2',
      studentId: 'demo-student-2',
      fullName: 'Sinh viên Demo',
      name: 'Sinh viên Demo',
      email: 'pdd150999@gmail.com',
      role: 'student',
      studentCode: 'DEMO002',
      className: 'Demo',
      token: 'demo-token-student',
      trustScore: 88,
      trustRank: 'gold',
      goodReturnStreak: 0,
      borrowLocked: false,
      isPermanentlyLocked: false
    }
  }
];

function getApiOrigin() {
  if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
    try {
      return new URL(API_BASE_URL).origin;
    } catch {
      return '';
    }
  }

  return '';
}

export function normalizeUploadUrl(value?: string | null) {
  const rawUrl = value?.trim();
  if (!rawUrl) return undefined;

  if (/^(https?:|data:|blob:)/i.test(rawUrl)) return rawUrl;

  const normalizedPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  const apiOrigin = getApiOrigin();

  if (normalizedPath.startsWith('/uploads/')) {
    return apiOrigin ? `${apiOrigin}${normalizedPath}` : normalizedPath;
  }

  if (normalizedPath.startsWith('/api/uploads/')) {
    const uploadPath = normalizedPath.replace(/^\/api/, '');
    return apiOrigin ? `${apiOrigin}${uploadPath}` : uploadPath;
  }

  return apiOrigin ? `${apiOrigin}${normalizedPath}` : normalizedPath;
}

function normalizeUser(raw: RawUser): User {
  const source = raw.data ?? raw;
  const student = source.student;
  const fullName = source.fullName ?? source.full_name ?? source.name ?? student?.fullName ?? student?.full_name ?? student?.name ?? '';

  return {
    id: source.id ?? '',
    fullName,
    name: source.name ?? fullName,
    email: source.email ?? '',
    role: source.role ?? 'student',
    studentId: source.studentId ?? source.student_id ?? student?.studentId ?? student?.student_id ?? student?.id,
    studentCode: source.studentCode ?? source.student_code ?? student?.studentCode ?? student?.student_code,
    className: source.className ?? source.class_name ?? student?.className ?? student?.class_name,
    phone: source.phone ?? student?.phone,
    token: source.token,
    avatar: normalizeUploadUrl(source.avatar ?? source.avatarUrl ?? source.avatar_url ?? student?.avatar ?? student?.avatarUrl ?? student?.avatar_url),
    avatarUrl: normalizeUploadUrl(source.avatarUrl ?? source.avatar_url ?? source.avatar ?? student?.avatarUrl ?? student?.avatar_url ?? student?.avatar),
    trustScore: source.trustScore ?? source.trust_score ?? student?.trustScore ?? student?.trust_score,
    trustRank: source.trustRank ?? source.trust_rank ?? student?.trustRank ?? student?.trust_rank,
    goodReturnStreak: source.goodReturnStreak ?? source.good_return_streak ?? student?.goodReturnStreak ?? student?.good_return_streak,
    borrowLocked: source.borrowLocked ?? source.borrow_locked ?? student?.borrowLocked ?? student?.borrow_locked,
    borrowLockUntil: source.borrowLockUntil ?? source.borrow_lock_until ?? student?.borrowLockUntil ?? student?.borrow_lock_until,
    borrowLockReason: source.borrowLockReason ?? source.borrow_lock_reason ?? student?.borrowLockReason ?? student?.borrow_lock_reason,
    isPermanentlyLocked: source.isPermanentlyLocked ?? source.is_permanently_locked ?? student?.isPermanentlyLocked ?? student?.is_permanently_locked,
    permanentLockReason: source.permanentLockReason ?? source.permanent_lock_reason ?? student?.permanentLockReason ?? student?.permanent_lock_reason
  };
}

export function login(payload: LoginPayload) {
  return apiPost<RawUser>('/auth/login', payload).then(normalizeUser);
}

function findDemoAccount(payload: LoginPayload) {
  const email = payload.email.trim().toLowerCase();
  return DEMO_ACCOUNTS.find((account) => account.email.toLowerCase() === email && account.password === payload.password);
}

export function isDemoLoginEnabled() {
  if (process.env.UMI_APP_DEMO_MODE === 'true') return true;
  if (typeof window === 'undefined') return false;

  return window.location.hostname.includes('vercel.app');
}

export function isDemoAuthUser(user?: User | null) {
  return Boolean(user?.token?.startsWith('demo-token-'));
}

export async function loginWithDemoFallback(payload: LoginPayload) {
  const demoAccount = isDemoLoginEnabled() ? findDemoAccount(payload) : undefined;
  if (demoAccount) return { ...demoAccount.user };

  return login(payload);
}

export function getMe() {
  return apiGet<MeResponse | RawUser>('/auth/me').then((response) => normalizeUser('data' in response && response.data ? response.data : (response as RawUser)));
}

export function register(payload: RegisterPayload) {
  return apiPost<AuthMessageResponse>('/auth/register', payload);
}

export function forgotPassword(email: string) {
  return apiPost<AuthMessageResponse>('/auth/forgot-password', { email });
}

export function resetPassword(token: string, newPassword: string) {
  return apiPost<AuthMessageResponse>('/auth/reset-password', { token, newPassword });
}

export function uploadMyAvatar(file: File) {
  const formData = new FormData();
  formData.append('avatar', file);

  return apiPatchForm<AvatarUploadResponse>('/students/me/avatar', formData).then((response) => ({
    ...response,
    avatarUrl: normalizeUploadUrl(response.avatarUrl ?? response.avatar ?? response.data?.avatarUrl ?? response.data?.avatar)
  }));
}

export function uploadCurrentUserAvatar(file: File) {
  const formData = new FormData();
  formData.append('avatar', file);

  return apiPatchForm<AvatarUploadResponse>('/auth/me/avatar', formData).then((response) => ({
    ...response,
    avatarUrl: normalizeUploadUrl(response.avatarUrl ?? response.avatar ?? response.data?.avatarUrl ?? response.data?.avatar)
  }));
}
