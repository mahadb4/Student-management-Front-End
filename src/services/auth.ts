import { apiRequest } from "./api";
import { clearScheduledTokenRefresh } from "./tokenScheduler";
import type { User } from "../types/user";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: "student" | "teacher" | "staff";
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

interface LoginApiResponse {
  user: User;
  access: string;
  refresh: string;
}

interface RegisterApiResponse {
  user: User;
}


const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "user";

export async function loginUser(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  try {
    const response = await apiRequest<LoginApiResponse>("/users/login/", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    localStorage.setItem(ACCESS_TOKEN_KEY, response.access);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));

    return {
      success: true,
      user: response.user,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Login failed.",
    };
  }
}

export async function registerUser(
  credentials: RegisterCredentials
): Promise<AuthResponse> {
  try {
    if (credentials.password !== credentials.confirmPassword) {
      return {
        success: false,
        error: "Passwords do not match.",
      };
    }

    const response = await apiRequest<RegisterApiResponse>(
      "/users/register/",
      {
        method: "POST",
        body: JSON.stringify({
          name: credentials.name,
          email: credentials.email,
          password: credentials.password,
          confirm_password: credentials.confirmPassword,
          role: credentials.role,
        }),
      }
    );

    return {
      success: true,
      user: response.user,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Registration failed.",
    };
  }
}

export async function getUsers(signal?: AbortSignal): Promise<User[]> {
  const token = getAccessToken();
  const res = await apiRequest<any>("/users/?page=1&page_size=500", {
    method: "GET",
    token: token || undefined,
    signal,
  });
  return res.results || [];
}

export async function getMockUsers(signal?: AbortSignal): Promise<User[]> {
  return getUsers(signal);
}

// Fetches only users with status=pending from the dedicated backend endpoint.
export async function getPendingUsers(signal?: AbortSignal): Promise<User[]> {
  const token = getAccessToken();
  const res = await apiRequest<any>("/users/pending/?page=1&page_size=500", {
    method: "GET",
    token: token || undefined,
    signal,
  });
  return res.results || [];
}

// One-click for every role - approval only grants login + Group access.
// Student/Teacher profile completion happens separately, by the user
// themself, via the onboarding flow after their first login.
export async function approveUser(userId: string): Promise<boolean> {
  try {
    const token = getAccessToken();

    await apiRequest(`/users/${userId}/approve/`, {
      method: "PATCH",
      token: token || undefined,
    });

    return true;
  } catch {
    return false;
  }
}

// Called by a newly-approved student/teacher on their first login to create
// and link their own Student/Teacher profile. Updates the cached user so
// ProtectedRoute immediately sees student_id/teacher_id without a re-login.
export async function completeOnboarding(profile: Record<string, unknown>): Promise<AuthResponse> {
  try {
    const token = getAccessToken();

    const response = await apiRequest<{ user: User }>("/users/onboarding/", {
      method: "POST",
      token: token || undefined,
      body: JSON.stringify(profile),
    });

    localStorage.setItem(USER_KEY, JSON.stringify(response.user));

    return { success: true, user: response.user };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to complete onboarding.",
    };
  }
}

export async function rejectUser(userId: string): Promise<boolean> {
  try {
    const token = getAccessToken();

    await apiRequest(`/users/${userId}/reject/`, {
      method: "PATCH",
      token: token || undefined,
    });

    return true;
  } catch {
    return false;
  }
}

export async function logoutUser(): Promise<void> {
  const refreshToken = getRefreshToken();

  try {
    if (refreshToken) {
      await apiRequest("/users/logout/", {
        method: "POST",
        body: JSON.stringify({
          refresh: refreshToken,
        }),
      });
    }
  } finally {
    clearScheduledTokenRefresh();
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getCurrentUser(): User | null {
  const user = localStorage.getItem(USER_KEY);

  if (!user) {
    return null;
  }

  try {
    return JSON.parse(user) as User;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}