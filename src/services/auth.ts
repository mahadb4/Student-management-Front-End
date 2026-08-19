import { apiRequest } from "./api";
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

interface UsersApiResponse extends Array<User> {}

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

export async function getUsers(): Promise<User[]> {
  const token = getAccessToken();
  return await apiRequest<UsersApiResponse>("/users/", {
    method: "GET",
    token: token || undefined,
  });
}

export async function getMockUsers(): Promise<User[]> {
  return getUsers();
}

// Fetches only users with status=pending from the dedicated backend endpoint.
export async function getPendingUsers(): Promise<User[]> {
  const token = getAccessToken();
  return await apiRequest<UsersApiResponse>("/users/pending/", {
    method: "GET",
    token: token || undefined,
  });
}

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