/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(
    JSON.parse(sessionStorage.getItem("AppUser")) || null
  );
  const [isLogin, setIsLogin] = useState(!!user);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLogin(!!user);
  }, [user]);

  const value = { user, isLogin, setUser, setIsLogin };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);