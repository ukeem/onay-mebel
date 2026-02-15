import { z } from "zod/v4";
import { create } from "zustand";

const UserSchema = z.object({
  id: z.string(),
  phone: z.string(),
  role: z.enum(["SUPER", "ADMIN", "USER"]),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]),
  activeUntil: z.string().nullable().optional(),
});

export type User = z.infer<typeof UserSchema>;

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;

  setUser: (user: User) => void;
  logout: () => void;
  loadFromStorage: () => void;
}

const isBrowser = typeof window !== "undefined";

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  setUser: (user) => {
    if (isBrowser) {
      localStorage.setItem("user", JSON.stringify(user));
    }
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    if (isBrowser) {
      localStorage.removeItem("user");
    }
    set({ user: null, isAuthenticated: false });
  },

  loadFromStorage: () => {
    if (!isBrowser) return;
    const userStr = localStorage.getItem("user");
    if (!userStr) return;

    try {
      const parsed = JSON.parse(userStr);
      const result = UserSchema.safeParse(parsed);
      if (result.success) {
        set({ user: result.data, isAuthenticated: true });
      } else {
        // Invalid data in localStorage → clean up
        localStorage.removeItem("user");
        set({ user: null, isAuthenticated: false });
      }
    } catch {
      localStorage.removeItem("user");
      set({ user: null, isAuthenticated: false });
    }
  },
}));
