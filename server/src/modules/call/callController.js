import Call from "./callModel.js";
import { OnlineUsers, getIo } from "../../core/socket/webSocket.js";

const USER_SELECT_FIELDS = "_id fullName profilePic email about isOnline lastSeen";

/**
 * Record a new call log (completed, missed, or rejected)
 */
export const createCallLog = async (req, res, next) => {
  try {
    const { receiverId, callType = "audio", status = "completed", duration = 0, startedAt, endedAt, chatId } = req.body;
    const callerId = req.user._id;

    if (!receiverId) {
      const error = new Error("Receiver ID is required to log a call");
      error.statusCode = 400;
      return next(error);
    }

    let newCall = await Call.create({
      caller: callerId,
      receiver: receiverId,
      callType: callType === "video" ? "video" : "audio",
      status: ["completed", "missed", "rejected", "ongoing"].includes(status) ? status : "completed",
      duration: Math.max(0, parseInt(duration, 10) || 0),
      startedAt: startedAt ? new Date(startedAt) : new Date(),
      endedAt: endedAt ? new Date(endedAt) : new Date(),
      chat: chatId || null,
    });

    newCall = await newCall.populate([
      { path: "caller", select: USER_SELECT_FIELDS },
      { path: "receiver", select: USER_SELECT_FIELDS },
    ]);

    // Real-time notification via Socket.IO
    const io = getIo();
    if (io) {
      const receiverSocketId = OnlineUsers[receiverId.toString()];
      const callerSocketId = OnlineUsers[callerId.toString()];

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newCallLog", newCall);
      }
      if (callerSocketId) {
        io.to(callerSocketId).emit("newCallLog", newCall);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Call log saved successfully",
      data: newCall,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get call history for the authenticated user
 */
export const getCallLogs = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const calls = await Call.find({
      $or: [{ caller: userId }, { receiver: userId }],
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate([
        { path: "caller", select: USER_SELECT_FIELDS },
        { path: "receiver", select: USER_SELECT_FIELDS },
      ]);

    return res.status(200).json({
      success: true,
      data: calls,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a specific call log
 */
export const deleteCallLog = async (req, res, next) => {
  try {
    const { callId } = req.params;
    const userId = req.user._id;

    const call = await Call.findById(callId);
    if (!call) {
      const error = new Error("Call log not found");
      error.statusCode = 404;
      return next(error);
    }

    if (call.caller.toString() !== userId.toString() && call.receiver.toString() !== userId.toString()) {
      const error = new Error("You do not have permission to delete this call log");
      error.statusCode = 403;
      return next(error);
    }

    await Call.findByIdAndDelete(callId);

    return res.status(200).json({
      success: true,
      message: "Call log deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Clear all call history for the authenticated user
 */
export const clearAllCallLogs = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await Call.deleteMany({
      $or: [{ caller: userId }, { receiver: userId }],
    });

    return res.status(200).json({
      success: true,
      message: "Call history cleared successfully",
    });
  } catch (err) {
    next(err);
  }
};
