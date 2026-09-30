import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { UserRole } from "@/types";
import { apiService } from "@/lib/api";

type StoredUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
};

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
}

interface LoginPayload {
  email: string;
  password: string;
  role?: UserRole;
}

interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  logout: () => void;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const CURRENT_USER_KEY = "hotel_current_user";
const USERS_KEY = "hotel_users";

const defaultAccounts: StoredUser[] = [
  {
    id: "admin-default",
    name: "Grand Admin",
    email: "",
    password: "",
    role: "admin", // admin can control room cleaning
  },
  {
    id: "reception-default",
    name: "Grand Reception",
    email: "",
    password: "",
    role: "reception", // reception handles bookings and admin tasks
  },
  {
    id: "customer-default",
    name: "Demo Customer",
    email: "",
    password: "",
    role: "customer",
    phone: "+1 555 000 1111",
  },
];

const generateId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `user-${Date.now()}`);

const sanitizeUser = (user: StoredUser): AuthUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStoredUsers = useCallback((): StoredUser[] => {
    const stored = localStorage.getItem(USERS_KEY);
    if (!stored) {
      return [...defaultAccounts];
    }

    try {
      const parsed = JSON.parse(stored) as StoredUser[];
      return [...defaultAccounts, ...parsed.filter((u) => !defaultAccounts.some((d) => d.email === u.email))];
    } catch {
      return [...defaultAccounts];
    }
  }, []);

  const persistCustomUsers = useCallback((users: StoredUser[]) => {
    const customUsers = users.filter(
      (user) => !defaultAccounts.some((account) => account.email === user.email)
    );
    localStorage.setItem(USERS_KEY, JSON.stringify(customUsers));
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem(CURRENT_USER_KEY);
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as AuthUser;
        setUser(parsed);
      } catch {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(
    async ({ email, password, role }: LoginPayload) => {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();

      // Try backend API first
      try {
        const response = await apiService.login({
          email: normalizedEmail,
          password: normalizedPassword,
        });
        
        if (response.data && response.data.user) {
          const backendUser = response.data.user;
          // Map backend user to frontend format
          const authUser: AuthUser = {
            id: String(backendUser.id),
            name: `${backendUser.first_name || ''} ${backendUser.last_name || ''}`.trim() || backendUser.username || normalizedEmail,
            email: backendUser.email || normalizedEmail,
            role: (backendUser.role as UserRole) || 'customer',
            phone: backendUser.phone,
          };
          
          // Check role if specified
          if (role && authUser.role !== role) {
            throw new Error(`No ${role} account found for that email/password`);
          }
          
          setUser(authUser);
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authUser));
          return authUser;
        }
      } catch (apiError) {
        // If backend fails (401, 404, etc.), silently fall back to localStorage (for demo accounts)
        // Don't log 401 errors as they're expected for demo accounts that don't exist in database
      }

      // Fallback to localStorage-based auth (for demo accounts)
      const allUsers = loadStoredUsers();
      const matches = allUsers.filter(
        (u) => u.email.toLowerCase() === normalizedEmail && u.password === normalizedPassword
      );

      if (!matches.length) {
        throw new Error("Invalid email or password");
      }

      const match = role ? matches.find((u) => u.role === role) ?? null : matches[0];

      if (!match) {
        throw new Error(`No ${role} account found for that email/password`);
      }

      const sanitized = sanitizeUser(match);
      setUser(sanitized);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sanitized));
      return sanitized;
    },
    [loadStoredUsers]
  );

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  }, []);

  const register = useCallback(
    async ({ name, email, phone, password }: RegisterPayload) => {
      const normalizedEmail = email.trim().toLowerCase();
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const username = normalizedEmail.split('@')[0]; // Use email prefix as username

      // Try backend API first
      try {
        const response = await apiService.register({
          username,
          email: normalizedEmail,
          password: password.trim(),
          first_name: firstName,
          last_name: lastName,
          phone: phone || '',
        });
        
        if (response.data && response.data.user) {
          const backendUser = response.data.user;
          const authUser: AuthUser = {
            id: String(backendUser.id),
            name: `${backendUser.first_name || ''} ${backendUser.last_name || ''}`.trim() || backendUser.username || normalizedEmail,
            email: backendUser.email || normalizedEmail,
            role: (backendUser.role as UserRole) || 'customer',
            phone: backendUser.phone,
          };
          
          setUser(authUser);
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authUser));
          return authUser;
        }
      } catch (apiError) {
        // If backend fails, fall back to localStorage
        console.log('Backend registration failed, using localStorage fallback:', apiError);
      }

      // Fallback to localStorage-based registration
      const allUsers = loadStoredUsers();
      const emailExists = allUsers.some((u) => u.email.toLowerCase() === normalizedEmail);

      if (emailExists) {
        throw new Error("An account with that email already exists");
      }

      const newUser: StoredUser = {
        id: generateId(),
        name,
        email: normalizedEmail,
        phone,
        password: password.trim(),
        role: "customer",
      };

      const updatedUsers = [...allUsers, newUser];
      persistCustomUsers(updatedUsers);

      const sanitized = sanitizeUser(newUser);
      setUser(sanitized);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sanitized));
      return sanitized;
    },
    [loadStoredUsers, persistCustomUsers]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      logout,
      register,
    }),
    [user, loading, login, logout, register]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;

