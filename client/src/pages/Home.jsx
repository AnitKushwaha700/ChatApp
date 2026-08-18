import React from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();
  return (
    <>
      <div className="flex items-center justify-center  h-[90vh]">
        <div className="bg-base-200 p-2 h-[80vh] w-6xl flex  flex-col items-center justify-evenly">
          <div className=" text-3xl font-bold">welcome to My Website</div>

          <motion.button
            className="btn btn-primary btn-gradient"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            onClick={() => navigate("/login")}
          >
            Login to Chat
          </motion.button>
          <motion.button
            className="btn btn-primary btn-gradient"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
            onClick={() => navigate("/chat")}
          >
            Chat Page
          </motion.button>
          <motion.button
            className="btn btn-primary btn-gradient"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
            onClick={() => navigate("/contact")}
          >
            contact us
          </motion.button>
        </div>
      </div>
    </>
  );
};

export default Home;