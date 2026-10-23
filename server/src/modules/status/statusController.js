import Status from "./statusModel.js";
import User from "../user/userModel.js";
import { emitToUser } from "../../core/socket/emitters.js";

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export const CreateStatus = async (req, res, next) => {
  try {
    const { type, text, bg } = req.body;
    const me = req.user;

    const statusType = req.file ? (req.file.mimetype?.startsWith("video") ? "video" : "image") : type;
    if (!["text", "image", "video"].includes(statusType)) {
      const error = new Error("Invalid status type");
      error.statusCode = 400;
      return next(error);
    }
    if (statusType === "text" && !text?.trim()) {
      const error = new Error("Text status cannot be empty");
      error.statusCode = 400;
      return next(error);
    }

    const status = await Status.create({
      owner: me._id,
      type: statusType,
      text: text?.slice(0, 500) || "",
      bg: bg || "",
      mediaUrl: req.file?.path || "",
      expiresAt: new Date(Date.now() + TWENTY_FOUR_HOURS),
    });

    // Notify friends in real time
    const fullUser = await User.findById(me._id).select("friends");
    fullUser.friends.forEach((friendId) =>
      emitToUser(friendId, "status:new", {
        _id: status._id,
        owner: { _id: me._id, fullName: me.fullName, profilePic: me.profilePic },
      }),
    );

    res.status(201).json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
};

export const ListStatus = async (req, res, next) => {
  try {
    const me = req.user;
    const cutoff = new Date();

    // My statuses first, then friends' (unviewed first)
    const mine = await Status.find({
      owner: me._id,
      expiresAt: { $gt: cutoff },
    }).sort({ createdAt: -1 });

    const friendIds = me.friends || [];
    const friendStatuses = await Status.find({
      owner: { $in: friendIds },
      expiresAt: { $gt: cutoff },
    })
      .populate("owner", "fullName profilePic about")
      .sort({ createdAt: -1 });

    // Group by owner
    const grouped = {};
    friendStatuses.forEach((s) => {
      const key = String(s.owner?._id);
      if (!key) return;
      if (!grouped[key]) {
        grouped[key] = {
          owner: s.owner,
          items: [],
          viewedByMe: true,
        };
      }
      const viewed = s.viewers.some((v) => String(v.user) === String(me._id));
      if (!viewed) grouped[key].viewedByMe = false;
      grouped[key].items.push(s);
    });

    res.status(200).json({
      data: {
        mine,
        friends: Object.values(grouped).sort((a, b) =>
          a.viewedByMe === b.viewedByMe ? 0 : a.viewedByMe ? 1 : -1,
        ),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const ViewStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const me = req.user;

    const status = await Status.findById(id);
    if (!status) {
      const error = new Error("Status not found");
      error.statusCode = 404;
      return next(error);
    }
    if (String(status.owner) === String(me._id)) {
      return res.status(200).json({ success: true });
    }

    const alreadyViewed = status.viewers.some(
      (v) => String(v.user) === String(me._id),
    );
    if (!alreadyViewed) {
      status.viewers.push({ user: me._id });
      await status.save();
      emitToUser(status.owner, "status:view", {
        statusId: status._id,
        user: { _id: me._id, fullName: me.fullName, profilePic: me.profilePic },
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const StatusViewers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const status = await Status.findById(id)
      .populate("viewers.user", "fullName profilePic about");
    if (!status || String(status.owner) !== String(req.user._id)) {
      const error = new Error("Not found or access denied");
      error.statusCode = 403;
      return next(error);
    }
    res.status(200).json({ data: status.viewers });
  } catch (error) {
    next(error);
  }
};

export const DeleteStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const status = await Status.findById(id);
    if (!status || String(status.owner) !== String(req.user._id)) {
      const error = new Error("Not found or access denied");
      error.statusCode = 403;
      return next(error);
    }
    await Status.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Status deleted" });
  } catch (error) {
    next(error);
  }
};
