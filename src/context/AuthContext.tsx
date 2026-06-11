import { createContext, useContext, useState, type ReactNode } from "react";

export type LicenseStatus = "free" | "pro" | "trial";

interface AuthUser {
  name: string;
  email: string;
}

interface AuthState {
  user: AuthUser | null;
  credits: number;
  licenseStatus: LicenseStatus;
  signIn: (name?: string) => void;
  signOut: () => void;
  upgrade: () => void;
  spendCredit: () => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [credits, setCredits] = useState(3);
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus>("free");

  const value: AuthState = {
    user,
    credits,
    licenseStatus,
    signIn: (name = "Demo Dev") => setUser({ name, email: "demo@prodready.dev" }),
    signOut: () => {
      setUser(null);
      setLicenseStatus("free");
    },
    upgrade: () => setLicenseStatus("pro"),
    spendCredit: () => {
      if (licenseStatus === "pro") return true;
      if (credits <= 0) return false;
      setCredits(c => c - 1);
      return true;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
