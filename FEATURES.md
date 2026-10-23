# ChatApp — WhatsApp Feature Reference

Implementation map for the WhatsApp-style feature set. All routes are cookie-authenticated
(`Protect` middleware). File uploads use the existing Cloudinary multer storages.

## REST API

### Social — `/social`
| Method | Route | Purpose |
|---|---|---|
| POST | `/social/friend-request/:toId` | Send request (auto-accepts if the other side already requested) |
| POST | `/social/friend-request/:id/accept` | Accept a received request |
| POST | `/social/friend-request/:id/decline` | Decline / cancel a request |
| GET | `/social/friend-requests` | `{ received, sent }` |
| GET | `/social/friends` | Friends list |
| DELETE | `/social/friend/:id` | Remove friend |
| POST | `/social/block/:id` · DELETE `/social/block/:id` | Block / unblock |
| GET | `/social/blocked` | Blocked users |
| PATCH | `/social/privacy` | `{ lastSeen, profilePhoto, about, readReceipts }` |
| PATCH | `/social/about` | Update About text (≤139 chars) |
| GET | `/social/user/:id` | Privacy-aware profile of another user |
| PATCH | `/social/chat-settings/:chatType/:chatId` | `{ pinned, archived, mutedUntil, disappearingHours }` |

### Groups — `/groups`
| Method | Route | Purpose |
|---|---|---|
| POST | `/groups` | Create (multipart: name, description, memberIds JSON, avatar?) |
| GET | `/groups` | My groups |
| GET | `/groups/:groupId` | Group with populated members |
| PATCH | `/groups/:groupId` | Edit name/description/avatar/onlyAdminsCanSend (admin) |
| DELETE | `/groups/:groupId` | Delete (creator) |
| POST | `/groups/:groupId/members` | Add members `{ userIds: [] }` (admin) |
| DELETE | `/groups/:groupId/members/:userId` | Remove member (admin) |
| POST | `/groups/:groupId/role/:userId` | Promote/demote `{ role }` (admin) |
| POST | `/groups/:groupId/leave` | Leave (creator transfers ownership) |
| POST | `/groups/:groupId/invite-link` | Get/refresh invite code |
| POST | `/groups/join/:code` | Join via invite link |

### Messages — `/user` (new + legacy)
| Method | Route | Purpose |
|---|---|---|
| GET | `/user/chat-list` | Unified WhatsApp home list (DMs + groups, last message, unread, settings, presence) |
| POST | `/user/send-message` | Send; accepts `receiverID` **or** `groupId`, `replyTo`, `tempClientId`, media |
| GET | `/user/get-messages/:friendId?cursor=&limit=` | DM history, cursor paginated |
| GET | `/user/group-messages/:groupId?cursor=&limit=` | Group history, cursor paginated |
| PUT | `/user/mark-read/:friendId` · `/user/mark-read-group/:groupId` | Read receipts |
| PATCH | `/user/message/:messageId` | Edit (sender, 15-min window) |
| POST | `/user/message/:messageId/react` | React / swap / toggle-off `{ emoji }` |
| POST/DELETE | `/user/message/:messageId/star` | Star toggle |
| GET | `/user/starred-messages` | Starred messages |
| POST | `/user/message/forward` | `{ messageId, targets: [{ chatType, id }] }` |
| DELETE | `/user/message/:messageId?type=for_me|for_everyone` | Delete |
| DELETE | `/user/messages/:friendId` · `/user/group-messages/:groupId` | Clear chat (per-device) |

### Status (stories) — `/status`
| Method | Route | Purpose |
|---|---|---|
| POST | `/status` | Text or media status (expires after 24h, TTL index) |
| GET | `/status` | Mine + friends grouped by owner, viewed flags |
| POST | `/status/:id/view` | Record a view |
| GET | `/status/:id/viewers` | Owner-only viewer list |
| DELETE | `/status/:id` | Owner delete |

### Calls — `/calls`
| Method | Route | Purpose |
|---|---|---|
| POST | `/calls` | Log `{ callee, type, status, durationSec }` |
| GET | `/calls/history` | Latest 100 with direction flag |

## Socket.IO events

**Client → Server**
`createPath` · `destroyPath` · `group:join` · `typing:start` · `typing:stop` ·
`message:delivered {messageId}` · `message:read {friendId|groupId}` ·
`requestCall` · `acceptCall` · `rejectCall` · `endCall` · `webrtcOffer` · `webrtcAnswer` · `iceCandidate`

**Server → Client**
`onlineUsers` (legacy) · `presence:update` · `newMessage` · `chat:updated` ·
`message:status` · `message:updated` · `message:reaction` · `messageDeleted` ·
`typing` · `group:new` · `group:updated` · `group:deleted` ·
`friend:request` · `friend:accept` · `status:new` · `status:view` ·
`incomingCall` · `callAccepted` · `callRejected` · `callEnded` · `call:missed` ·
`webrtcOffer` · `webrtcAnswer` · `iceCandidate`

Rooms: `user:<userId>` (personal) and `group:<groupId>`; membership is managed
automatically on connect and whenever group membership changes.

## Data model highlights
- **Message**: `groupId`, `replyTo`, `reactions[]`, `starredBy[]`, `deliveredTo[]`,
  `readBy[]`, `isEdited/editedAt`, `forwardedFrom`, `tempClientId`, `expiresAt` (TTL)
- **User**: `about`, `lastSeen`, `blockedUsers[]`, `privacy`, `chatSettings[]`
  (pin/archive/mute/disappearing per chat)
- **Group**: `members[{user, role, joinedAt}]`, `inviteCode`, `onlyAdminsCanSend`, `lastMessage`
- **Status**: TTL index on `expiresAt` (24h); **CallLog**: missed/answered/declined/unavailable
