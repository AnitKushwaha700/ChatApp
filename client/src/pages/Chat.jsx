import React, { useEffect, useState } from "react";
import { userData } from "../assets/dummy";
import Chatting from "../components/chat/Chatting";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../config/api";

const Chat = () => {
  const navigate = useNavigate();
  const { user, isLogin } = useAuth();
  const [recentUser, setRecentUser] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [isOpenChat, setIsOpenChat] = useState(false);

  const fetchRecentUsers = async () => {
    // Simulate fetching recent users from an API
    try {
      const res = await api.get("/user/allusers");
      setRecentUser(res.data.data);
    } catch (error) {
      console.error("Failed to fetch recent users", error);
    }
  };

  // console.log(user);
  const currentUser = 1;
  console.log(recentUser);

  useEffect(() => {
    if (!isLogin) {
      navigate("/login");
    } else {
      fetchRecentUsers();
    }
  }, []);

  return (
    <>
      {isLogin && (
        <div className="flex gap-2">
          <div className="w-3/17 bg-base-200">
            <h1>Recent Chats</h1>

            {recentUser.length > 0 &&
              recentUser.map((user, idx) => (
                <div
                  key={idx}
                  onClick={() => (setSelectedFriend(user), setIsOpenChat(true))}
                  className="cursor-pointer"
                >
                  {user.fullName}
                </div>
              ))}
          </div>
          <div className="w-14/17">
            {selectedFriend ? (
              <Chatting
                selectedFriend={selectedFriend}
                currentUser={currentUser}
              />
            ) : (
              <div>Select a Friend to start chat</div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Chat;