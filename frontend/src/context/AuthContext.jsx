import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import api from "../services/api";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [voter, setVoter] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.data.user);
      setVoter(data.data.voter);
    } catch {
      setUser(null);
      setVoter(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchMe();
  }, [fetchMe]);
  const login = async (_tokens, userData) => {
    setUser(userData);
    await fetchMe();
  };
  const logout = async () => {
    try {
      await api.post("/auth/logout", {});
    } catch {}
    setUser(null);
    setVoter(null);
  };
  const isAdmin = () =>
    ["SUPER_ADMIN", "ELECTION_COMMISSION", "AUDITOR", "FRAUD_ANALYST"].includes(
      user?.role,
    );
  const isVerifiedVoter = () => voter?.status === "VERIFIED";
  return (
    <AuthContext.Provider
      value={{
        user,
        voter,
        loading,
        login,
        logout,
        fetchMe,
        isAdmin,
        isVerifiedVoter,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
};
