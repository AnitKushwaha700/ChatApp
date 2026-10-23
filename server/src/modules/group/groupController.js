import crypto from "crypto";
import Group from "./groupModel.js";
import User from "../user/userModel.js";
import Message from "../chat/messageModel.js";
import { getIo } from "../../core/socket/webSocket.js";
import {
  GROUP_ROOM,
  emitToGroup,
  emitToUser,
  joinUserToGroupRoom,
} from "../../core/socket/emitters.js";

const findMembership = (group, userId) =>
  group.members.find((m) => String(m.user) === String(userId));

const addSystemMessage = async (group, text) => {
  try {
    const sys = await Message.create({
      groupId: group._id,
      messageType: "system",
      message: text,
    });
    emitToGroup(group._id, "newMessage", sys);
    group.lastMessage = sys._id;
    await group.save();
  } catch (err) {
    console.error("system message failed:", err.message);
  }
};

export const CreateGroup = async (req, res, next) => {
  try {
    const { name, description, memberIds } = req.body;
    const me = req.user;

    if (!name || !name.trim()) {
      const error = new Error("Group name is required");
      error.statusCode = 400;
      return next(error);
    }

    let ids = [];
    try {
      ids = JSON.parse(memberIds || "[]");
    } catch {
      ids = [];
    }
    // De-duplicate + drop self/blocked
    const uniqueIds = [...new Set(ids.map(String))].filter(
      (id) => id !== String(me._id),
    );
    const validUsers = await User.find({
      _id: { $in: uniqueIds },
      blockedUsers: { $ne: me._id },
    }).select("_id");
    const validIds = validUsers.map((u) => String(u._id));

    const group = await Group.create({
      name: name.trim(),
      description: description || "",
      avatar: req.file?.path || "",
      createdBy: me._id,
      inviteCode: crypto.randomBytes(8).toString("hex"),
      members: [
        { user: me._id, role: "admin" },
        ...validIds.map((id) => ({ user: id, role: "member" })),
      ],
    });

    await addSystemMessage(
      group,
      `${me.fullName || me.email} created group "${group.name}"`,
    );

    // Live socket rooms for every member, including the creator
    joinUserToGroupRoom(me._id, group._id);
    validIds.forEach((id) => joinUserToGroupRoom(id, group._id));

    const io = getIo();
    if (io) io.to(GROUP_ROOM(group._id)).emit("group:new", group);
    validIds.forEach((id) =>
      emitToUser(id, "group:new", { _id: group._id, name: group.name }),
    );

    const populated = await Group.findById(group._id).populate(
      "members.user",
      "fullName profilePic email about",
    );
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

export const ListGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({ "members.user": req.user._id })
      .populate("members.user", "fullName profilePic email about")
      .sort({ updatedAt: -1 });
    res.status(200).json({ data: groups });
  } catch (error) {
    next(error);
  }
};

export const GetGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId).populate(
      "members.user",
      "fullName profilePic email about",
    );
    if (!group || !findMembership(group, req.user._id)) {
      const error = new Error("Group not found or access denied");
      error.statusCode = 403;
      return next(error);
    }
    res.status(200).json({ data: group });
  } catch (error) {
    next(error);
  }
};

export const UpdateGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { name, description, onlyAdminsCanSend } = req.body;
    const me = req.user;

    const group = await Group.findById(groupId);
    if (!group) {
      const error = new Error("Group not found");
      error.statusCode = 404;
      return next(error);
    }
    const membership = findMembership(group, me._id);
    if (!membership || membership.role !== "admin") {
      const error = new Error("Only admins can edit this group");
      error.statusCode = 403;
      return next(error);
    }

    if (name?.trim()) {
      group.name = name.trim();
      await addSystemMessage(group, `${me.fullName} changed the group name`);
    }
    if (description !== undefined) group.description = description.slice(0, 500);
    if (req.file?.path) {
      group.avatar = req.file.path;
      await addSystemMessage(group, `${me.fullName} changed the group icon`);
    }
    if (onlyAdminsCanSend !== undefined) {
      group.onlyAdminsCanSend = onlyAdminsCanSend === "true" || onlyAdminsCanSend === true;
    }

    await group.save();
    const populated = await Group.findById(group._id).populate(
      "members.user",
      "fullName profilePic email about",
    );
    emitToGroup(groupId, "group:updated", populated);
    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

export const AddMembers = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { userIds } = req.body;
    const me = req.user;

    const group = await Group.findById(groupId);
    if (!group) {
      const error = new Error("Group not found");
      error.statusCode = 404;
      return next(error);
    }
    const membership = findMembership(group, me._id);
    if (!membership || membership.role !== "admin") {
      const error = new Error("Only admins can add members");
      error.statusCode = 403;
      return next(error);
    }

    const ids = [...new Set((userIds || []).map(String))];
    const users = await User.find({
      _id: { $in: ids },
      blockedUsers: { $ne: me._id },
    }).select("_id fullName");

    const addedNames = [];
    users.forEach((u) => {
      if (!findMembership(group, u._id)) {
        group.members.push({ user: u._id, role: "member" });
        addedNames.push(u.fullName);
        joinUserToGroupRoom(u._id, group._id);
        emitToUser(u._id, "group:new", { _id: group._id, name: group.name });
      }
    });
    await group.save();
    if (addedNames.length) {
      await addSystemMessage(
        group,
        `${me.fullName} added ${addedNames.join(", ")}`,
      );
    }

    const populated = await Group.findById(groupId).populate(
      "members.user",
      "fullName profilePic email about",
    );
    emitToGroup(groupId, "group:updated", populated);
    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

export const RemoveMember = async (req, res, next) => {
  try {
    const { groupId, userId } = req.params;
    const me = req.user;

    const group = await Group.findById(groupId);
    if (!group) {
      const error = new Error("Group not found");
      error.statusCode = 404;
      return next(error);
    }
    const actor = findMembership(group, me._id);
    if (!actor || actor.role !== "admin") {
      const error = new Error("Only admins can remove members");
      error.statusCode = 403;
      return next(error);
    }
    const target = findMembership(group, userId);
    if (!target) {
      const error = new Error("User is not a group member");
      error.statusCode = 404;
      return next(error);
    }
    if (String(group.createdBy) === String(userId)) {
      const error = new Error("The group creator cannot be removed");
      error.statusCode = 400;
      return next(error);
    }

    const removed = await User.findById(userId).select("fullName");
    group.members = group.members.filter(
      (m) => String(m.user) !== String(userId),
    );
    await group.save();
    await addSystemMessage(
      group,
      `${me.fullName} removed ${removed?.fullName || "a member"}`,
    );

    const populated = await Group.findById(groupId).populate(
      "members.user",
      "fullName profilePic email about",
    );
    emitToGroup(groupId, "group:updated", populated);
    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

export const ChangeMemberRole = async (req, res, next) => {
  try {
    const { groupId, userId } = req.params;
    const { role } = req.body; // admin | member
    const me = req.user;

    if (!["admin", "member"].includes(role)) {
      const error = new Error("Invalid role");
      error.statusCode = 400;
      return next(error);
    }

    const group = await Group.findById(groupId);
    if (!group) {
      const error = new Error("Group not found");
      error.statusCode = 404;
      return next(error);
    }
    const actor = findMembership(group, me._id);
    if (!actor || actor.role !== "admin") {
      const error = new Error("Only admins can change roles");
      error.statusCode = 403;
      return next(error);
    }
    const target = findMembership(group, userId);
    if (!target) {
      const error = new Error("User is not a group member");
      error.statusCode = 404;
      return next(error);
    }
    target.role = role;
    await group.save();

    const targetUser = await User.findById(userId).select("fullName");
    await addSystemMessage(
      group,
      `${targetUser?.fullName || "A member"} is now ${role === "admin" ? "an admin" : "a member"}`,
    );

    const populated = await Group.findById(groupId).populate(
      "members.user",
      "fullName profilePic email about",
    );
    emitToGroup(groupId, "group:updated", populated);
    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

export const LeaveGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const me = req.user;

    const group = await Group.findById(groupId);
    if (!group) {
      const error = new Error("Group not found");
      error.statusCode = 404;
      return next(error);
    }
    if (!findMembership(group, me._id)) {
      const error = new Error("You are not a member of this group");
      error.statusCode = 403;
      return next(error);
    }

    group.members = group.members.filter(
      (m) => String(m.user) !== String(me._id),
    );

    // Creator leaving promotes the oldest remaining admin, or deletes an empty group
    if (String(group.createdBy) === String(me._id) || group.members.length === 0) {
      if (group.members.length === 0) {
        await Message.deleteMany({ groupId });
        await Group.findByIdAndDelete(groupId);
        return res.status(200).json({ success: true, message: "Group deleted" });
      }
      const nextAdmin =
        group.members.find((m) => m.role === "admin") || group.members[0];
      nextAdmin.role = "admin";
      group.createdBy = nextAdmin.user;
    }

    await group.save();
    await addSystemMessage(group, `${me.fullName} left the group`);
    emitToGroup(groupId, "group:updated", { _id: groupId });
    res.status(200).json({ success: true, message: "You left the group" });
  } catch (error) {
    next(error);
  }
};

export const DeleteGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const me = req.user;
    const group = await Group.findById(groupId);
    if (!group) {
      const error = new Error("Group not found");
      error.statusCode = 404;
      return next(error);
    }
    if (String(group.createdBy) !== String(me._id)) {
      const error = new Error("Only the group creator can delete it");
      error.statusCode = 403;
      return next(error);
    }
    emitToGroup(groupId, "group:deleted", { _id: groupId });
    await Message.deleteMany({ groupId });
    await Group.findByIdAndDelete(groupId);
    res.status(200).json({ success: true, message: "Group deleted" });
  } catch (error) {
    next(error);
  }
};

export const GenerateInviteLink = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group || !findMembership(group, req.user._id)) {
      const error = new Error("Group not found or access denied");
      error.statusCode = 403;
      return next(error);
    }
    if (!group.inviteCode) {
      group.inviteCode = crypto.randomBytes(8).toString("hex");
      await group.save();
    }
    res.status(200).json({ success: true, inviteCode: group.inviteCode });
  } catch (error) {
    next(error);
  }
};

export const JoinByInvite = async (req, res, next) => {
  try {
    const { code } = req.params;
    const me = req.user;
    const group = await Group.findOne({ inviteCode: code });
    if (!group) {
      const error = new Error("Invalid invite link");
      error.statusCode = 404;
      return next(error);
    }
    if (findMembership(group, me._id)) {
      return res.status(200).json({ success: true, message: "Already a member", data: group });
    }
    group.members.push({ user: me._id, role: "member" });
    await group.save();
    joinUserToGroupRoom(me._id, group._id);
    await addSystemMessage(group, `${me.fullName} joined via invite link`);
    const io = getIo();
    if (io) io.to(GROUP_ROOM(group._id)).emit("group:updated", group);
    res.status(200).json({ success: true, data: group });
  } catch (error) {
    next(error);
  }
};
