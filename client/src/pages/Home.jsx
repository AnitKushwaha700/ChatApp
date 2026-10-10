
import { motion } from "motion/react";
import { useModal } from "../context/ModalContext";
import { MessageSquare, Zap, Shield, Users } from "lucide-react";

const Home = () => {
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
    <div className="min-h-[calc(100dvh-65px)] py-12 lg:py-0 bg-base-200 flex flex-col justify-center items-center px-4 overflow-x-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <motion.img
          src="/chatApp-image.png"
          alt="Background"
          animate={{
            scale: [1.05, 1.15, 1.05],
            x: ["-2%", "2%", "-2%"],
            y: ["-2%", "2%", "-2%"],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-0 w-full h-full object-cover opacity-15 md:opacity-25 pointer-events-none mix-blend-luminosity grayscale"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            rotate: [0, -90, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] rounded-full bg-secondary/20 blur-[100px]"
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
          className="text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-4 sm:mb-6 text-base-content leading-tight px-2 sm:px-0"
        >
          Connect with{" "}
          <span className="bg-clip-text text-transparent bg-linear-to-r from-primary to-secondary">
            Anyone
          </span>
          ,<br />
          Anywhere.
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-base sm:text-xl text-base-content/70 mb-8 sm:mb-10 max-w-2xl mx-auto px-4 sm:px-0"
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
            className="btn btn-primary btn-lg shadow-xl shadow-primary/30 w-full sm:w-auto rounded-full"
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
