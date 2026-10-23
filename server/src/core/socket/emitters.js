// Centralized Socket.IO emission helpers so controllers never touch rooms directly.
import { getIo, OnlineUsers } from "./webSocket.js";

export const USER_ROOM = (userId) => `user:${userId}`;
export const GROUP_ROOM = (groupId) => `group:${groupId}`;

export const emitToUser = (userId, event, payload) => {
  const io = getIo();
  if (!io || !userId) return;
  io.to(USER_ROOM(userId)).emit(event, payload);
};

export const emitToGroup = (groupId, event, payload) => {
  const io = getIo();
  if (!io || !groupId) return;
  io.to(GROUP_ROOM(groupId)).emit(event, payload);
};

export const isUserOnline = (userId) => Boolean(OnlineUsers[userId]);

// Force every live socket of a user into a group room (no reconnect needed)
export const joinUserToGroupRoom = (userId, groupId) => {
  const io = getIo();
  if (!io || !userId || !groupId) return;
  try {
    io.in(USER_ROOM(userId)).socketsJoin(GROUP_ROOM(groupId));
  } catch (err) {
    console.error("socketsJoin failed:", err.message);
  }
};
