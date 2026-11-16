import React from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useModal } from "../context/ModalContext";
import { MessageSquare, Shield, Zap, Video, Palette } from "lucide-react";
import heroBgImage from "../assets/chatApp-image.png";
import InstallAppCard from "../components/ui/InstallAppCard";

const Home = () => {
  const { isLogin } = useAuth();
  const navigate = useNavigate();
  const { openLogin } = useModal();

  const handleStartChatting = () => {
    if (isLogin) {
      navigate("/chat");
    } else {
      openLogin();
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100, damping: 14 },
    },
  };

  return (
    <div className="min-h-[calc(100dvh-64px)] w-full bg-base-100 text-base-content flex flex-col justify-between items-center py-6 sm:py-10 px-4 overflow-x-hidden relative select-none transition-colors duration-200">
      {/* Background 3D Illustration & Radial Green Ambient Glow */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <motion.img
          src={heroBgImage}
          alt="ChatApp Background"
          animate={{
            scale: [1.02, 1.05, 1.02],
            x: ["-1%", "1%", "-1%"],
            y: ["-0.5%", "0.5%", "-0.5%"],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="w-full h-full object-cover object-center opacity-20 dark:opacity-35 grayscale contrast-110 brightness-95 mix-blend-luminosity"
        />

        {/* Ambient Dark Gradient Layer */}
        <div className="absolute inset-0 bg-gradient-to-b from-base-100/60 via-transparent to-base-100/90" />

        {/* Emerald green radial glow */}
        <div className="absolute top-[8%] left-[5%] w-[55%] h-[60%] rounded-full bg-[#04BC66]/15 blur-[120px]" />
        <div className="absolute bottom-[5%] right-[10%] w-[40%] h-[40%] rounded-full bg-[#04BC66]/10 blur-[100px]" />
      </div>

      {/* Main Hero Stack */}
      <motion.div
        className="max-w-4xl w-full z-10 text-center flex flex-col items-center my-auto pt-2 pb-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Green speech bubble outline icon badge */}
        <motion.div variants={itemVariants} className="mb-4 sm:mb-6 flex justify-center">
          <div className="p-3.5 sm:p-4 bg-[#04BC66]/15 rounded-3xl text-[#04BC66] shadow-lg shadow-[#04BC66]/20 border border-[#04BC66]/20">
            <MessageSquare size={40} strokeWidth={2} />
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight mb-4 sm:mb-5 text-base-content leading-[1.12]"
        >
          Connect with{" "}
          <span className="text-[#04BC66] bg-clip-text text-transparent bg-gradient-to-r from-[#04BC66] to-[#009b55]">
            Anyone,
          </span>
          <br />
          Anywhere.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="text-base sm:text-lg md:text-xl text-base-content/75 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-4 font-normal"
        >
          Experience lightning-fast, secure, and beautiful real-time conversations. Join our community and start chatting today.
        </motion.p>

        {/* Primary CTA Button */}
        <motion.div variants={itemVariants} className="flex justify-center mb-8 sm:mb-10">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="bg-[#04BC66] hover:bg-[#03A85B] text-white font-bold text-base sm:text-lg px-9 py-4 rounded-full shadow-xl shadow-[#04BC66]/30 transition-all cursor-pointer"
            onClick={handleStartChatting}
          >
            Start Chatting Now
          </motion.button>
        </motion.div>

        {/* PWA Mobile & Desktop Install Card */}
        <motion.div variants={itemVariants} className="w-full flex justify-center mb-6">
          <InstallAppCard />
        </motion.div>

        {/* Core Pillars Feature Badges */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl w-full pt-4 border-t border-base-content/10"
        >
          <div className="flex items-center justify-center gap-2 p-2 rounded-xl bg-base-200/50 text-xs font-semibold text-base-content/80">
            <Zap size={14} className="text-[#04BC66]" />
            <span>Instant Socket</span>
          </div>
          <div className="flex items-center justify-center gap-2 p-2 rounded-xl bg-base-200/50 text-xs font-semibold text-base-content/80">
            <Video size={14} className="text-[#04BC66]" />
            <span>Audio & Video</span>
          </div>
          <div className="flex items-center justify-center gap-2 p-2 rounded-xl bg-base-200/50 text-xs font-semibold text-base-content/80">
            <Shield size={14} className="text-[#04BC66]" />
            <span>DPDP Secure</span>
          </div>
          <div className="flex items-center justify-center gap-2 p-2 rounded-xl bg-base-200/50 text-xs font-semibold text-base-content/80">
            <Palette size={14} className="text-[#04BC66]" />
            <span>16+ Themes</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Home;
