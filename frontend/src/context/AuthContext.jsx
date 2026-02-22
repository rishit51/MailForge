import {
    createContext,
    useState,
    useEffect,
    useContext,
  } from "react";
  
  const api_url = import.meta.env.VITE_BASE_URL;
  
  const AuthContext = createContext(null);
  
  export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const fetchUser = async (token) => {
      const res = await fetch(`${api_url}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      if (!res.ok) throw new Error("Invalid token");
      return res.json();
    };
  
    useEffect(() => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setIsLoading(false);
        return;
      }
  
      fetchUser(token)
        .then(setUser)
        .catch(() => {
          localStorage.removeItem("access_token");
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    }, []);
  
    const login = async (token) => {
      localStorage.setItem("access_token", token);
      setIsLoading(true);
  
      try {
        const user = await fetchUser(token);
        setUser(user);
      } finally {
        setIsLoading(false);
      }
    };
  
    const logout = () => {
      localStorage.removeItem("access_token");
      setUser(null);
    };
  
    return (
      <AuthContext.Provider value={{ user, isLoading, login, logout }}>
        {children}
      </AuthContext.Provider>
    );
  };
  
  export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
  };