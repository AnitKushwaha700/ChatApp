# ChatApp — WhatsApp-Style Product & Engineering Plan

> **Goal:** Evolve the current ChatApp into a full-featured, WhatsApp-like real-time
> messaging platform — reliable 1:1 and group chats, media, voice/video calls,
> stories, push notifications, and a mobile-first installable PWA.
>
> **Status of this doc:** Living document. Revise at the end of every milestone.
> **Stack (existing):** React 19 + Vite + Tailwind v4/FlyonUI (client) · Express 5 +
> MongoDB/Mongoose + Socket.IO (server) · Cloudinary (media) · WebRTC (calls) · PWA

---

## 0. Implementation Status (updated 2026-10-24)

Phases 0–5 from this plan have been built end-to-end. All code passes ESLint and the
production Vite build; server modules pass syntax/import smoke checks.

### ✅ Shipped in this iteration

**Messaging**
- Three-state receipts: sent (single tick) → delivered (double gray) → read (double blue),
  via `deliveredTo` / `readBy` arrays and the `message:status` socket flow
- Typing indicators (DM + group, auto-timeout) and live last-seen/online presence
- Reply/quote, edit (15-minute window, "edited" tag), forward to multiple chats,
  emoji reactions, star/bookmark with starred-messages view
- Voice-message recording (MediaRecorder → Cloudinary), image/video/document/audio attachments
- Multi-select mode (bulk star / forward / delete), delete-for-me & delete-for-everyone, clear chat
- Cursor pagination ("Load older messages") and optimistic sends with idempotent `tempClientId`
- Disappearing messages (24h / 7d / 30d) via Mongo TTL indexes

**Contacts & privacy**
- Full friend-request flow (send / accept / decline / cancel / remove) with real-time badges
- Block/unblock (enforced both directions for messages and calls)
- Privacy settings: last-seen, profile photo, about (everyone/friends/nobody) + read-receipt toggle
- Per-user About text, per-chat pin / archive / mute (8h / 1 week / 1 year)

**Groups**
- Create groups (name, icon, description, multi-member picker), group chat with sender names/avatars
- Admin roles, admin-only messaging, add/remove members, promote/demote, leave/delete, system messages
- Invite links (`/chat?join=<code>`), socket rooms auto-managed server-side, group info screen

**Stories / Status**
- Text (with background colors) and photo/video statuses, 24-hour TTL expiry
- Viewed/unviewed rings, full-screen viewer with progress bars, viewer list for owners, delete

**Calls & notifications**
- Persisted call history (answered / missed / declined / unavailable, direction + duration), Calls tab
- Missed calls logged automatically when the callee is offline
- Browser Notification API alerts and document-title unread badge; in-app sounds and toasts

**Architecture**
- New collections: `Group`, `Status`, `CallLog`; extended `User` and `Message` schemas (indexed)
- New routers: `/social`, `/groups`, `/status`, `/calls`; unified `GET /user/chat-list`
- Socket user/group rooms, presence events, reaction/edit/delete/typing/receipt event catalog
- WhatsApp-style 4-tab shell (Chats / Status / Calls / People), decomposed 900-line chat component
  into `MessageBubble`, `MessageInput`, `ForwardModal`, `ChatList` + feature folders

### 🚧 Still on the roadmap (not yet built)
- Web Push for fully-closed apps (VAPID; current notifications work while the app is open)
- Group calls (SFU), TUN server hardening, E2EE (M15 research spike)
- In-chat keyword search, synced drafts, multi-device/linked devices, channels/communities
- Redis socket adapter for horizontal scaling, automated tests/CI, OpenAPI docs



---

## 1. Where We Are Today (Audit of Current Code)

### 1.1 Already built ✅

| Area | Implementation |
|---|---|
| Auth | Register, login, logout, Google OAuth, forgot/reset password (email OTP), JWT in HTTP-only cookie |
| Users | `GET /user/me`, `GET /user/allUsers?search=` (regex-escaped, unread counts), profile update + photo upload (Cloudinary) |
| Messaging | Send text + media (`text/image/document/audio/video`), get full conversation, delete for-me / for-everyone, clear chat, mark-as-read |
| Real-time | Socket.IO auth middleware, online-user map, `newMessage`, `messageDeleted`, presence broadcast |
| Calls | 1:1 voice & video via WebRTC signaling (`requestCall`, `acceptCall`, offer/answer/ICE, reject/end) |
| Client | Home / Chat / Dashboard pages, auth modals, `Chatting.jsx`, `CallModal.jsx`, emoji picker, toasts, theme switch, offline banner |
| PWA | `vite-plugin-pwa` manifest + Workbox runtime caching, install prompt |
| Security | Helmet, CORS allowlist, rate limiting (global + OTP), mongo sanitize, cookie auth |

### 1.2 Known gaps & tech debt ⚠️

1. **No conversation/group abstraction** — messages use raw `senderId`/`receiverId`; groups are impossible without schema work.
2. **No delivery state** — only a boolean `isRead`; WhatsApp needs *sent → delivered → read* ticks (and per-user read state for groups).
3. **`friends`, `pendingRequests`, `sentRequests` fields exist on `User` but have zero endpoints** — the social graph is unfinished.
4. **No typing indicators, no last-seen** (only a transient in-memory online map).
5. **No reactions, replies/quotes, forwarding, starring, editing, voice-message recording UI.**
6. **No groups, no stories/status, no push notifications.**
7. `GET /get-messages/:friendId` loads the **entire history at once** — needs cursor pagination.
8. `Chatting.jsx` is **911 lines** — needs decomposition into feature components/hooks.
9. **No automated tests, no CI, no API docs**, no environment variable validation.
10. Single Socket.IO node — in-memory `OnlineUsers` won't survive horizontal scaling (needs Redis adapter).
11. No blocking, muting, pinning, archiving, or privacy controls.
12. No call history persistence; no group calls.

---

## 2. Target Product Scope (WhatsApp Feature Parity Map)

Priority legend: **P0** = must-have · **P1** = high · **P2** = later · MoSCoW in brackets.

### 2.1 Messaging

| # | Feature | Priority | Notes |
|---|---|---|---|
| M1 | Delivery & read receipts (single ✓ → double ✓ → blue ✓) | P0 | New `status` / `deliveredTo` / `readBy` model |
| M2 | Typing indicators | P0 | Socket-only, not persisted |
| M3 | Last seen & online (with privacy toggle) | P0 | Persist `lastSeen` on disconnect |
| M4 | Reply / quote a message | P0 | `replyTo` reference on message |
| M5 | Edit message (with "edited" tag, time window) | P1 | Edit history + socket broadcast |
| M6 | Forward message (to one or many chats) | P1 | Reuse media, no re-upload |
| M7 | Reactions (emoji) | P1 | Per-user reaction subdocs |
| M8 | Star / bookmark messages | P1 | View all starred, filter by chat |
| M9 | Voice message recording & waveform playback | P1 | MediaRecorder → Cloudinary, `audio` type exists |
| M10 | In-chat search (text + date jump) | P1 | Indexed text search |
| M11 | Message pagination / infinite scroll | P0 | Cursor-based (`createdAt + _id`) |
| M12 | Multi-select messages (bulk delete/forward/star) | P1 | Client selection mode |
| M13 | Draft messages per chat | P2 | Persist client-side + server sync |
| M14 | Disappearing messages (24h/7d/90d) | P2 | TTL-style cleanup job |
| M15 | End-to-end encryption | P2 | Research spike — see §9.4 |

### 2.2 Contacts & Social Graph

| # | Feature | Priority |
|---|---|---|
| C1 | Send / accept / decline friend requests (uses existing schema fields) | P0 |
| C2 | Friends list + remove friend | P0 |
| C3 | Block / unblock user (blocks messages, calls, last-seen) | P1 |
| C4 | Privacy settings (last seen, profile photo, about, read receipts) | P1 |
| C5 | User "about" text + QR-style share profile | P2 |

### 2.3 Group Chats

| # | Feature | Priority |
|---|---|---|
| G1 | Create group (name, avatar, initial members) | P0 |
| G2 | Group messaging reusing the entire message pipeline | P0 |
| G3 | Group info screen, member list, add/remove members | P0 |
| G4 | Admins: promote/demote, admin-only messaging, remove members | P1 |
| G5 | System messages ("X added Y", "group icon changed") | P1 |
| G6 | Group invite links, join requests | P2 |
| G7 | Mute / archive / pin group, group description | P1 |
| G8 | Group voice/video calls (SFU) | P2 |

### 2.4 Stories / Status

| # | Feature | Priority |
|---|---|---|
| S1 | Post text / image / video status, 24h expiry (Mongo TTL index) | P1 |
| S2 | Viewers list + reply to status (creates a quoted DM) | P1 |
| S3 | Mute statuses, seen/unseen ring on avatar | P2 |

### 2.5 Calls

| # | Feature | Priority |
|---|---|---|
| V1 | Persist call history (missed / incoming / outgoing, duration) | P1 |
| V2 | Ringing while app is closed → push notification + accept | P1 |
| V3 | Better ICE config (TURN server), reconnection handling | P1 |
| V4 | Group calls via SFU (mediasoup/LiveKit) | P2 |

### 2.6 Notifications & Platform

| # | Feature | Priority |
|---|---|---|
| N1 | Web Push notifications (VAPID + service worker) | P0 |
| N2 | In-app notification sound + unread badge (document title, favicon) | P1 |
| N3 | Notification preferences per chat (mute) | P1 |
| N4 | Chat wallpaper, font size, chat list pin/archive | P2 |
| N5 | Multi-device sessions / linked devices | P2 |

---

## 3. Target Architecture

```
┌─────────────────────────── Browser / PWA ───────────────────────────┐
│  React 19 (Vite)                                                     │
│  ├─ feature-folder modules (auth · chat · groups · status · calls)  │
│  ├─ React Query (server state) + socket hooks (realtime state)      │
│  ├─ IndexedDB cache (drafts, offline queue, recent messages)        │
│  └─ Service Worker: Workbox caching + Web Push                       │
└───────────────┬───────────────────────────────────┬─────────────────┘
        HTTPS   │ REST (axios, cookie auth)   WSS    │ Socket.IO
┌───────────────▼───────────────────────────────────▼─────────────────┐
│  Express 5 API                     Socket.IO (Redis adapter, sticky  │
│  ├─ auth / user / chat / group / status / call / push controllers   │
│  ├─ JWT cookie middleware, rate limit, helmet, sanitize             │
│  └─ event bus: controller → io.to(room)                             │
└───────┬──────────────────┬───────────────────┬──────────────────────┘
        │                  │                   │
   MongoDB           Cloudinary          Redis (presence, adapter,
   (documents,       (media + voice       rate-limit, push queue)
    TTL indexes)      messages)
                                        TURN/STUN (WebRTC)
```

### Key architectural decisions

1. **Introduce a `Conversation` collection** that models both DMs and groups. Messages get a `conversationId`. A one-time migration backfills conversations and message links from existing data (§4.4).
2. **Socket rooms per conversation** (`conversation:<id>`) and per user (`user:<id>`) replace direct socket-id lookups; `OnlineUsers` moves to Redis.
3. **React Query** for REST caching/synchronization (replaces ad-hoc `useState` fetching); Socket events invalidate/optimistically update its cache.
4. **Optimistic UI + offline queue**: messages render immediately with a clock icon, get queued in IndexedDB when offline, and flush on reconnect.
5. **Cursor pagination** for all history endpoints.
6. Keep the current modular monolith (`core / modules / shared`) — split modules per domain as features grow.

---

## 4. Data Model Plan

### 4.1 User — additions

```js
// additions to existing userSchema
about:          { type: String, default: "Hey there! I am using ChatApp", maxlength: 139 },
lastSeen:       { type: Date },
isOnline:       { type: Boolean, default: false },     // authoritative copy in Redis; field for fallback
blockedUsers:   [{ type: ObjectId, ref: "User" }],
privacy: {
  lastSeen:      { type: String, enum: ["everyone","friends","nobody"], default: "everyone" },
  profilePhoto:  { type: String, enum: ["everyone","friends","nobody"], default: "everyone" },
  about:         { type: String, enum: ["everyone","friends","nobody"], default: "everyone" },
  readReceipts:  { type: Boolean, default: true },
},
pushSubscriptions: [{ endpoint: String, keys: Object }],
// friends / pendingRequests / sentRequests already exist — wire them up in Phase 2
```

### 4.2 Conversation (new)

```js
{
  type:         { enum: ["dm", "group"], required: true },
  participants: [{ user: ObjectId, role: { enum: ["admin","member"] },
                   joinedAt: Date, mutedUntil: Date, archived: Boolean, pinned: Boolean }],
  // dm-only
  users:        [{ type: ObjectId, ref: "User" }],          // size 2 for dm, unique compound index
  // group-only
  name: String, avatar: String, description: String,
  inviteCode: String,
  onlyAdminsCanSend: { type: Boolean, default: false },
  lastMessage: { type: ObjectId, ref: "Message" },          // denormalized for chat list
  clearedBy:   [{ user: ObjectId, at: Date }],              // per-user "clear chat"
  createdBy: ObjectId,
}, { timestamps: true }
```

Indexes: unique partial index on sorted `users` for DMs; index on `participants.user`.

### 4.3 Message — evolution

```js
{
  conversationId: { type: ObjectId, ref: "Conversation", required: true }, // backfilled
  senderId: ObjectId,
  messageType: { enum: ["text","image","document","audio","video","system","location","contact"] },
  message: String, mediaUrl: String, mediaMeta: { name, size, mimeType, duration, waveform },
  replyTo: { type: ObjectId, ref: "Message" },           // M4
  forwardedFrom: ObjectId,                                // M6
  isEdited: Boolean, editedAt: Date, editHistory: [{ body, at }],
  isStarredBy: [ObjectId],                                // M8
  reactions: [{ user: ObjectId, emoji: String, at: Date }], // M7
  deliveredTo: [ObjectId],                                // M1 (DM = 1 entry, groups = many)
  readBy:      [{ user: ObjectId, at: Date }],            // M1
  deletedForEveryone: Boolean, deletedBy: [ObjectId],     // existing semantics retained
  expiresAt: Date,                                        // M14, TTL index
  tempClientId: String,                                   // idempotency for optimistic sends
}, { timestamps: true }
```

Indexes: `{ conversationId: 1, createdAt: -1 }`, TTL on `expiresAt`, text index on `message`.

### 4.4 Migration strategy (no downtime)

1. Script creates one DM `Conversation` per distinct participant pair from `Message`.
2. Backfill `conversationId` on every message in batches (`bulkWrite`, idempotent, resumable).
3. Dual-write behind a feature flag until clients are updated; old endpoints remain during one release.
4. Add validator/coverage report; remove legacy code paths in the following release.

### 4.5 New collections

- **Status** `{ owner, type, text?, mediaUrl?, bg?, viewers: [{user,at}], replies, expiresAt }` — TTL index 24h.
- **CallLog** `{ caller, callee|conversation, type: audio|video, status: missed|answered|declined, startedAt, durationSec }`.
- **Notification** (optional) `{ user, kind, payload, readAt }` for in-app notification center.

---

## 5. API & Socket Event Plan

### 5.1 REST endpoints (additions; existing ones stay)

```
# Contacts
POST   /user/friend-request/:toId        POST   /user/friend-request/:id/accept
POST   /user/friend-request/:id/decline  DELETE /user/friend/:id
POST   /user/block/:id                   DELETE /user/block/:id
PATCH  /user/privacy

# Conversations & messages
GET    /conversations                     # chat list w/ last message, unread counts, pin/archive state
POST   /conversations/dm/:userId          # get-or-create DM
POST   /conversations/group               # create group
GET    /conversations/:id/messages?cursor=&limit=30
POST   /conversations/:id/messages        # send (supports tempClientId idempotency)
PATCH  /messages/:id                      # edit
DELETE /messages/:id?type=for_me|for_everyone
POST   /messages/:id/react                # { emoji } / remove
POST   /messages/:id/star   ·  DELETE .../star
POST   /messages/forward                  # { messageId, conversationIds[] }
POST   /conversations/:id/read            # mark read (also over socket)
PATCH  /conversations/:id/settings        # mute / archive / pin / wallpaper

# Groups
PATCH  /groups/:id                        # name/avatar/description/admin-only
POST   /groups/:id/members   ·  DELETE /groups/:id/members/:userId
POST   /groups/:id/promote  ·  /demote
POST   /groups/:id/invite-link

# Status
POST   /status   GET /status   POST /status/:id/view   GET /status/:id/viewers

# Calls & push
GET    /calls/history
POST   /push/subscribe   ·  DELETE /push/subscribe
```

Cross-cutting: every list endpoint is cursor-paginated; every write validates ownership,
block status, and group permissions; all real-time side effects go through one
`emitToConversation()` helper.

### 5.2 Socket.IO event catalog

| Direction | Event | Payload | Purpose |
|---|---|---|---|
| C→S | `user:subscribe` | — | join `user:<id>` room after auth |
| C→S | `conversation:open` / `:close` | conversationId | presence in chat, read receipts |
| C→S | `typing:start` / `typing:stop` | conversationId | M2 |
| S→C | `message:new` | message + conversationId | replaces `newMessage` |
| S→C | `message:status` | messageId, status, userId, at | delivered/read ticks |
| S→C | `message:updated` / `message:deleted` | message | edit/delete sync |
| S→C | `message:reaction` | messageId, userId, emoji | M7 |
| S→C | `typing` | conversationId, userId, isTyping | M2 |
| S→C | `presence:update` | userId, isOnline, lastSeen | M3 |
| S→C | `conversation:updated` | conversation | last message, unread count, group changes |
| S→C | `call:*` | existing WebRTC events + `callLog` | keep current names, add history |
| S→C | `status:new` / `status:view` | — | stories |

---

## 6. Frontend Plan

### 6.1 Screen map (WhatsApp parity)

1. **Landing/Home** — hero, auth entry (exists, polish).
2. **Chat list** — search, tabs (All / Unread / Groups), pinned section, archived row, last-message preview, unread badges, muted icon, timestamps.
3. **Chat window** — header (avatar, name, online/last seen, call buttons), message bubbles with ticks, reply preview, reactions, date separators, swipe-to-reply (mobile), recording button, attachment menu, emoji picker, selection mode.
4. **Contact/Group info** — media shared links/docs, mute, wallpaper, star messages, members/admin controls.
5. **Status tab** — my status + friends' status rings, full-screen viewer, reply.
6. **Calls tab** — history list with call-type icons, call buttons.
7. **Settings** — profile, privacy, notifications, theme, wallpaper, blocked contacts, linked devices.
8. **Modals** — auth (exists), new group, contact info, call (exists), media viewer/lightbox.

### 6.2 Refactor & state management

- Split `Chatting.jsx` (911 lines) into: `ChatHeader`, `MessageList`, `MessageBubble`,
  `MessageInput`, `AttachmentMenu`, `VoiceRecorder`, `ReactionPicker`, `ReplyPreview`,
  plus hooks `useMessages`, `useTyping`, `usePresence`, `useSocket`.
- Introduce **React Query** (`@tanstack/react-query`) for server state; keep Socket for pushes.
- **IndexedDB layer** (`idb`): offline outbox, drafts, cached conversations.
- Reusable design tokens via Tailwind theme; keep FlyonUI for forms/modals.
- Standardize `lib/api.js` response/error handling into typed helper hooks + global toast.

### 6.3 PWA / notifications

- Extend the existing service worker: `push` handler (notification with chat title/body),
  `notificationclick` deep-links to the conversation.
- VAPID key pair; subscribe after login, store subscription on server (`pushSubscriptions`).
- Title/favicon unread badge; in-app sound (user-toggleable).

---

## 7. Milestones & Sprint Plan

> Suggested cadence: 1-week sprints, solo/small team. Each milestone ships to production behind a flag where risky.

### Phase 0 — Hardening & foundations (Sprints 1–2)
- Env var validation (`zod`/`envalid`), centralized logger, error taxonomy.
- MongoDB indexes (§4), DB connection resilience, graceful shutdown.
- Cursor pagination for messages + infinite scroll in client.
- Decompose `Chatting.jsx`; add ESLint rules; folder restructure per domain.
- Set up Vitest + Supertest (server) and React Testing Library (client); CI workflow (lint + test + build).
- **DoD:** tests run in CI, history loads in pages, no component over ~300 lines.

### Phase 1 — Messaging reliability & polish (Sprints 3–5) — *P0*
- M1 receipts (`deliveredTo`/`readBy`, ticks UI), M2 typing, M3 last seen.
- M4 reply, M11 pagination polish, optimistic sends + offline outbox.
- Web Push basics (N1), unread title badge (N2).
- **DoD:** ticks progress correctly across online/offline/background; typing seen live; messages sent offline flush on reconnect.

### Phase 2 — Contacts & privacy (Sprint 6) — *P0/P1*
- C1 friend requests end-to-end (wire up existing schema fields), C2 friends list.
- C3 block, C4 privacy settings, system toasts.
- **DoD:** request/accept/decline flows work; blocked users cannot message/call; privacy flags respected.

### Phase 3 — Group chats (Sprints 7–8) — *P0/P1*
- `Conversation` model + migration script (§4.4), DM get-or-create.
- G1–G3 create/info/members; socket rooms; group message fan-out.
- G4 admin controls, G5 system messages, G7 mute/archive/pin.
- **DoD:** existing DMs behave identically post-migration; group of 50+ members receives messages in <1s.

### Phase 4 — Rich messages (Sprint 9) — *P1*
- M5 edit, M6 forward, M7 reactions, M8 star, M9 voice recorder + waveform.
- M12 multi-select mode; lightbox for media.
- **DoD:** each action syncs live to all participants and survives reload.

### Phase 5 — Stories & notifications (Sprint 10) — *P1*
- S1–S3 status with TTL expiry and viewer lists; status tab UI.
- V1 call history; push for incoming calls/messages while closed (V2).
- **DoD:** statuses expire after 24h; push arrives with app closed and deep-links correctly.

### Phase 6 — Scale & advanced (ongoing) — *P2*
- Socket.IO Redis adapter; Redis presence; rate-limit store in Redis.
- V3 TURN server + call reconnection; V4 SFU group call research spike.
- M13 drafts sync, M14 disappearing messages, N4 wallpapers/settings, G6 invite links.
- M15 E2EE spike (Signal Protocol / MLS feasibility, key management UX).
- Load testing (Artillery/k6), runbooks, staging environment, backup/restore drills.

---

## 8. Definition of Done (every feature)

- [ ] Acceptance criteria met and verified on mobile + desktop widths
- [ ] Server: validation, ownership/permission checks, error responses, indexes considered
- [ ] Real-time updates work when both parties are online; REST state correct after reconnect
- [ ] Optimistic UI + rollback on failure; offline behavior defined
- [ ] Unit tests for logic + integration test for the endpoint/socket flow
- [ ] Lint + CI green; no new console errors; accessible (keyboard, labels, contrast)
- [ ] API documented (OpenAPI/JSDoc) and plan checkbox updated

---

## 9. Non-Functional Requirements

### 9.1 Security
- HTTP-only Secure SameSite cookies (already HTTP-only; verify flags per env), CSRF review.
- Input validation layer (e.g., `zod`) on every endpoint; keep mongo-sanitize + helmet.
- Signed Cloudinary uploads or server-side multer (current) with type/size allow-lists and malware scan option later.
- Rate limits per route family (auth stricter — OTP limiter exists); Redis-backed at scale.
- Audit log for sensitive actions (password reset, group admin changes).
- Principle: E2EE is the only true message privacy — tracked as M15; until then TLS in transit + DB access controls.

### 9.2 Performance budgets
- Chat list TTI < 2 s on 4G; message send-to-other-screen p95 < 500 ms.
- History endpoint p95 < 300 ms with 30-doc pages; proper compound indexes.
- Bundle: route-split groups/status/settings; keep initial JS < 300 KB gzipped.
- Pagination everywhere; cap search result sets; aggregation limits (partly done).

### 9.3 Reliability & scaling
- Stateless API horizontally scaled behind LB with sticky sessions or Redis adapter.
- Socket.IO Redis adapter; presence in Redis with TTL heartbeats.
- Idempotent sends (`tempClientId`), message retries with backoff.
- Mongo replica set; scheduled backups + tested restore; Cloudinary backups.
- Uptime/error monitoring (Sentry) + basic dashboards; alerting on socket disconnect rate.

### 9.4 E2EE research spike (M15) outputs
- Evaluate Signal Protocol (libsignal) vs MLS; cover group key distribution, key rotation on
  member change, multi-device keys, undeliverable offline messages, and media encryption
  (encrypt before Cloudinary upload). Produce go/no-go doc before any production code.

### 9.5 Testing & DevOps
- **Server:** Vitest + Supertest + mongodb-memory-server; socket flow tests.
- **Client:** Vitest + RTL + MSW (mock API); Playwright E2E for critical flows (login → send → receipt → call).
- GitHub Actions CI; preview deploys (Vercel client, Render/Railway server — already used).
- OpenAPI spec served at `/docs`; seed script for demo data.

---

## 10. Risks & Decisions Needed

| Risk / Open Question | Mitigation / Options |
|---|---|
| Migration of existing messages to `conversationId` | Batched idempotent script + dual-write flag (§4.4); test on a DB snapshot first |
| WebRTC fails on restrictive networks | Add TURN server (coturn) in Phase 5; budget hosting cost |
| Push notifications require VAPID + browser permission UX | Request permission contextually after first message, not on login |
| E2EE vs server-side search/moderation trade-off | Defer; document limitation; revisit after scale phase |
| Group fan-out load | Socket rooms + Redis; avoid N emits from controllers; benchmark 100-member groups |
| `OnlineUsers` in memory lost on restart/restart | Move to Redis with heartbeat TTL in Phase 6 |
| Hosting cost of Redis/TURN | Free tiers (Upstash/Render) for dev; measure before paid plans |

**Decisions to confirm before Phase 1:**
1. Keep MongoDB (recommended) vs move chat data to Postgres — *recommend keep*.
2. React Query adoption now vs later — *recommend Phase 0*.
3. Phone-number/OTP identity (true WhatsApp style) vs current email identity — *recommend keep email, add optional mobile verification later*.

---

## 11. Immediate Next Tasks (ready to pick up)

1. Add env validation + index migration script skeleton (Phase 0).
2. Convert `GET /get-messages/:friendId` to cursor pagination.
3. Add `deliveredTo` / `readBy` fields and the `message:status` socket flow (M1).
4. Build `typing:start/stop` end-to-end (M2) — smallest full-stack vertical slice.
5. Create friend-request endpoints using the existing `User` schema arrays (C1).

---

*Maintained alongside the codebase — update status checkboxes as milestones land.*
