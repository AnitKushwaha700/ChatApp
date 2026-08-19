import React from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useModal } from "../context/ModalContext";
import { MessageSquare, Zap, Shield, Users } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();
  const { openLogin } = useModal();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 },
    },
  };

  return (
    <div className="h-[calc(100vh-65px)] bg-base-200 flex flex-col justify-center items-center px-4 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            rotate: [0, -90, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-secondary/20 blur-[100px]"
        />
      </div>

      <motion.div
        className="max-w-4xl w-full z-10 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={itemVariants}
          className="mb-6 flex justify-center"
        >
          <div className="p-4 bg-primary/10 rounded-full text-primary">
            <MessageSquare size={48} strokeWidth={1.5} />
          </div>
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-base-content"
        >
          Connect with{" "}
          <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            Anyone
          </span>
          ,<br />
          Anywhere.
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-xl text-base-content/70 mb-10 max-w-2xl mx-auto"
        >
          Experience lightning-fast, secure, and beautiful conversations. Join
          our community and start chatting today.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn btn-primary btn-lg shadow-xl shadow-primary/30 w-full sm:w-auto"
            onClick={openLogin}
          >
            Start Chatting Now
          </motion.button>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
        >
          <motion.div
            variants={itemVariants}
            className="card bg-base-100/60 backdrop-blur-md shadow-xl border border-white/10"
          >
            <div className="card-body">
              <Zap className="text-primary mb-2" size={32} />
              <h3 className="card-title">Lightning Fast</h3>
              <p className="text-base-content/70">
                Real-time messaging with zero latency. Feel the speed in every
                keystroke.
              </p>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="card bg-base-100/60 backdrop-blur-md shadow-xl border border-white/10"
          >
            <div className="card-body">
              <Shield className="text-secondary mb-2" size={32} />
              <h3 className="card-title">Secure</h3>
              <p className="text-base-content/70">
                Your conversations are protected with industry-standard
                encryption.
              </p>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="card bg-base-100/60 backdrop-blur-md shadow-xl border border-white/10"
          >
            <div className="card-body">
              <Users className="text-accent mb-2" size={32} />
              <h3 className="card-title">Community</h3>
              <p className="text-base-content/70">
                Connect with thousands of users in our growing ecosystem.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Home;
