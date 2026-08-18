import React, { useState } from "react";
import { userData } from "../assets/dummy";
import Chatting from "../components/chat/Chatting";

const Chat = () => {
  const [recentUser, setRecentUser] = useState(userData);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [isOpenChat, setIsOpenChat] = useState(false);

  // console.log(recentUser);
  const currentUser = 1;

  return (
    <>
      <div className="flex gap-2">
        <div className="w-3/17 bg-base-200">
          <h1>Recent Chats</h1>

          {userData.map(
            (user, idx) =>
              user.id !== currentUser && (
                <div
                  key={idx}
                  onClick={() => (setSelectedFriend(user), setIsOpenChat(true))}
                  className="cursor-pointer"
                >
                  {user.name}
                </div>
              ),
          )}
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
    </>
  );
};

export default Chat;