import React, { useEffect, useState } from "react";
import { chatData, userData } from "../../assets/dummy";

const Chatting = ({ selectedFriend, currentUser }) => {
  const [filteredChatData, setFilteredChatData] = useState([]);
  const [receiver, setReceiver] = useState("");
  const [sender, setSender] = useState("");
  //console.log(selectedFriend);
  //console.log(currentUser);

  useEffect(() => {
    //filterChat
    setFilteredChatData(
      chatData.filter(
        (chat) =>
          (chat.senderId === 1 && chat.receiverId === selectedFriend.id) ||
          (chat.receiverId === 1 && chat.senderId === selectedFriend.id),
      ),
    );

    setSender(() => userData.find((user) => user.id == currentUser));
    setReceiver(() => userData.find((user) => user.id == selectedFriend.id));
  }, [selectedFriend]);

  //   console.log(filteredChatData);

  console.log(receiver, sender);

  return (
    <>
      <div className="bg-base-200 p-4">
        <div>{selectedFriend?.name || "no friend Selected"}</div>
      </div>

      <div className="p-3 flex flex-col gap-3">
        <div className="h-[70vh] w-full card p-3 overflow-y-auto">
          {filteredChatData.map((chat, idx) => (
            <div
              class={`chat ${chat.senderId !== 1 ? "chat-receiver" : "chat-sender"}`}
            >
              <div class="chat-avatar avatar">
                <div class="size-10 rounded-full">
                  <img
                    src={chat.senderId !== 1 ? receiver.photo : sender.photo}
                    alt="avatar"
                  />
                </div>
              </div>
              <div class="chat-header text-base-content">
                {chat.senderId !== 1 ? receiver.name : sender.name}
                <time class="text-base-content/50">{chat.timestamp}</time>
              </div>
              <div class="chat-bubble">{chat.message}</div>
            </div>
          ))}
        </div>
        <div className="h-full p-3 input flex gap-3">
          <button>😊</button>
          <textarea type="text" className="w-full outline-0" />
          <button>Send</button>
        </div>
      </div>
    </>
  );
};

export default Chatting;