import React, { useEffect } from "react";
import { useModal } from "../context/ModalContext";
import { AnimatePresence, motion } from "motion/react";
import LoginModal from "./LoginModal";
import RegisterModal from "./RegisterModal";

const AuthModals = () => {
  const { isLoginOpen, isRegisterOpen, closeLogin, closeRegister } = useModal();

  // Prevent scrolling when a modal is open
  useEffect(() => {
    if (isLoginOpen || isRegisterOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isLoginOpen, isRegisterOpen]);

  return (
    <AnimatePresence>
      {(isLoginOpen || isRegisterOpen) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => {
            if (isLoginOpen) closeLogin();
            if (isRegisterOpen) closeRegister();
          }}
        >
          {isLoginOpen && <LoginModal key="login" />}
          {isRegisterOpen && <RegisterModal key="register" />}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AuthModals;
