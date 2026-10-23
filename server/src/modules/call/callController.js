import CallLog from "./callLogModel.js";

export const CreateCallLog = async (req, res, next) => {
  try {
    const { callee, type, status, durationSec } = req.body;
    const me = req.user;

    if (!callee || !["audio", "video"].includes(type)) {
      const error = new Error("callee and valid type are required");
      error.statusCode = 400;
      return next(error);
    }
    const validStatus = ["missed", "answered", "declined", "unavailable"];
    const finalStatus = validStatus.includes(status) ? status : "answered";

    const log = await CallLog.create({
      caller: me._id,
      callee,
      type,
      status: finalStatus,
      durationSec: Number(durationSec) || 0,
    });

    res.status(201).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

export const GetCallHistory = async (req, res, next) => {
  try {
    const me = req.user._id;
    const logs = await CallLog.find({
      $or: [{ caller: me }, { callee: me }],
    })
      .populate("caller", "fullName profilePic email")
      .populate("callee", "fullName profilePic email")
      .sort({ createdAt: -1 })
      .limit(100);

    // Attach a direction flag for the requesting user
    const data = logs.map((log) => ({
      ...log.toObject(),
      direction: String(log.caller._id) === String(me) ? "outgoing" : "incoming",
    }));

    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};
