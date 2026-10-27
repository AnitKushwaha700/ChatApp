import Status from "./statusModel.js";
import { getIo, OnlineUsers } from "../../core/socket/webSocket.js";

// 1. Create a 24-hour Status / Story
export const createStatus = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const { caption, backgroundColor, mediaType } = req.body;

    let mediaUrl = "";
    if (req.file) {
      mediaUrl = req.file.path;
    }

    const type = mediaType || (mediaUrl ? "image" : "text");

    if (type !== "text" && !mediaUrl) {
      const error = new Error("Media is required for photo/video status");
      error.statusCode = 400;
      return next(error);
    }

    if (type === "text" && (!caption || !caption.trim())) {
      const error = new Error("Caption/text content is required for text status");
      error.statusCode = 400;
      return next(error);
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const newStatus = await Status.create({
      user: currentUserId,
      mediaUrl,
      mediaType: type,
      caption: caption || "",
      backgroundColor: backgroundColor || "#075E54",
      expiresAt,
    });

    const populatedStatus = await Status.findById(newStatus._id).populate(
      "user",
      "fullName profilePic email"
    );

    // Broadcast to all online users
    const io = getIo();
    if (io) {
      io.emit("newStatus", populatedStatus);
    }

    res.status(201).json({
      success: true,
      message: "Status posted successfully",
      data: populatedStatus,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Fetch all statuses (grouped into My Status, Recent Updates, Viewed Updates)
export const getStatuses = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    const statuses = await Status.find({
      expiresAt: { $gt: new Date() },
    })
      .populate("user", "fullName profilePic email")
      .populate("viewers.user", "fullName profilePic")
      .sort({ createdAt: -1 });

    const myStatuses = [];
    const othersGrouped = {};

    statuses.forEach((item) => {
      const isMine = item.user._id.toString() === currentUserId.toString();
      if (isMine) {
        myStatuses.push(item);
      } else {
        const userIdStr = item.user._id.toString();
        if (!othersGrouped[userIdStr]) {
          othersGrouped[userIdStr] = {
            user: item.user,
            statuses: [],
            hasUnviewed: false,
          };
        }
        othersGrouped[userIdStr].statuses.push(item);

        const hasViewedThis = item.viewers?.some(
          (v) => v.user?._id?.toString() === currentUserId.toString()
        );
        if (!hasViewedThis) {
          othersGrouped[userIdStr].hasUnviewed = true;
        }
      }
    });

    const recentUpdates = [];
    const viewedUpdates = [];

    Object.values(othersGrouped).forEach((group) => {
      if (group.hasUnviewed) {
        recentUpdates.push(group);
      } else {
        viewedUpdates.push(group);
      }
    });

    res.status(200).json({
      success: true,
      data: {
        myStatus: myStatuses,
        recentUpdates,
        viewedUpdates,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 3. View a status
export const viewStatus = async (req, res, next) => {
  try {
    const { statusId } = req.params;
    const currentUserId = req.user._id;

    const status = await Status.findById(statusId);
    if (!status) {
      const error = new Error("Status not found");
      error.statusCode = 404;
      return next(error);
    }

    const alreadyViewed = status.viewers?.some(
      (v) => v.user.toString() === currentUserId.toString()
    );

    if (!alreadyViewed) {
      status.viewers.push({
        user: currentUserId,
        viewedAt: new Date(),
      });
      await status.save();
    }

    res.status(200).json({ success: true, message: "Status marked as viewed" });
  } catch (error) {
    next(error);
  }
};

// 4. Delete status early
export const deleteStatus = async (req, res, next) => {
  try {
    const { statusId } = req.params;
    const currentUserId = req.user._id;

    const status = await Status.findById(statusId);
    if (!status) {
      const error = new Error("Status not found");
      error.statusCode = 404;
      return next(error);
    }

    if (status.user.toString() !== currentUserId.toString()) {
      const error = new Error("Unauthorized to delete this status");
      error.statusCode = 403;
      return next(error);
    }

    await Status.findByIdAndDelete(statusId);
    res.status(200).json({ success: true, message: "Status deleted successfully" });
  } catch (error) {
    next(error);
  }
};
