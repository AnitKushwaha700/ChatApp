/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";

const ModalContext = createContext();

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [initialLoginView, setInitialLoginView] = useState("login");

  const openLogin = (view) => {
    setIsRegisterOpen(false);
    const targetView = typeof view === "string" ? view : "login";
    setInitialLoginView(targetView);
    setIsLoginOpen(true);
  };

  const closeLogin = () => {
    setIsLoginOpen(false);
    setInitialLoginView("login");
  };

  const openForgotPassword = () => {
    setIsRegisterOpen(false);
    setInitialLoginView("forgot_password_email");
    setIsLoginOpen(true);
  };

  const openRegister = () => {
    setIsLoginOpen(false);
    setIsRegisterOpen(true);
  };

  const closeRegister = () => setIsRegisterOpen(false);

  return (
    <ModalContext.Provider
      value={{
        isLoginOpen,
        openLogin,
        closeLogin,
        openForgotPassword,
        initialLoginView,
        setInitialLoginView,
        isRegisterOpen,
        openRegister,
        closeRegister,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};
