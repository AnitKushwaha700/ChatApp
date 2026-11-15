import React from "react";
import { motion } from "motion/react";
import { useModal } from "../context/ModalContext";
import { MessageSquare } from "lucide-react";
import heroBgImage from "../assets/chatApp-image.png";

const Home = () => {
  const { openLogin } = useModal();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
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
    <div className="min-h-[calc(100dvh-64px)] w-full bg-[#0E121A] flex flex-col justify-center items-center px-4 overflow-hidden relative select-none">
      {/* Background 3D Illustration & Radial Green Glow */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        {/* Background 3D characters image in grayscale so it catches the green lighting */}
        <motion.img
          src={heroBgImage}
          alt="ChatApp Background"
          animate={{
            scale: [1.02, 1.05, 1.02],
            x: ["-1%", "1%", "-1%"],
            y: ["-0.5%", "0.5%", "-0.5%"],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="w-full h-full object-cover object-center opacity-30 md:opacity-35 grayscale contrast-110 brightness-95"
        />

        {/* Ambient Dark Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0E121A]/50 via-transparent to-[#0E121A]/70" />

        {/* Emerald green glow on left-center behind Chatter & Boy (sampled #04BC66) */}
        <div className="absolute top-[12%] left-[5%] w-[55%] h-[60%] rounded-full bg-[#04BC66]/25 blur-[120px]" />

        {/* Soft secondary ambient glow on bottom right */}
        <div className="absolute bottom-[10%] right-[10%] w-[35%] h-[35%] rounded-full bg-[#04BC66]/10 blur-[100px]" />
      </div>

      {/* Main Content Stack */}
      <motion.div
        className="max-w-3xl w-full z-10 text-center flex flex-col items-center py-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Green speech bubble outline icon badge (sampled #042314 bg, #1EA268 stroke) */}
        <motion.div variants={itemVariants} className="mb-6 flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-[#042314]/90 border-2 border-[#1EA268] text-[#1EA268] shadow-lg shadow-[#04BC66]/20 flex items-center justify-center">
            <MessageSquare size={30} strokeWidth={2.4} />
          </div>
        </motion.div>

        {/* Headline matching screenshot colors */}
        <motion.h1
          variants={itemVariants}
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-5 text-white leading-[1.12]"
        >
          Connect with <span className="text-[#4DC375]">Anyone,</span>
          <br />
          Anywhere.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="text-sm sm:text-base md:text-lg text-[#8C9CA7] mb-8 max-w-xl mx-auto leading-relaxed px-4 font-normal"
        >
          Experience lightning-fast, secure, and beautiful conversations. Join our
          community and start chatting today.
        </motion.p>

        {/* CTA Button in exact sampled #04BC66 */}
        <motion.div variants={itemVariants} className="flex justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-[#04BC66] hover:bg-[#03A85B] text-white font-semibold text-sm sm:text-base px-8 py-3 rounded-full shadow-lg shadow-[#04BC66]/30 transition-all cursor-pointer"
            onClick={openLogin}
          >
            Start Chatting Now
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Home;
