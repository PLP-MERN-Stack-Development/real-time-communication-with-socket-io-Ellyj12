
# Real-Time Chat Application (Socket.io + React + MongoDB)

A full-stack real-time chat application built with Socket.io for realtime messaging, React on the client, an Express server, and MongoDB for persistence. The project demonstrates channels (rooms), private messages (whispers), user presence, typing indicators, message persistence, and JWT-based authentication.

---

## Project overview

- Real-time messaging with Socket.io (rooms for channels + private messages)
- Persistent message storage in MongoDB (public and private messages)
- JWT-based authentication for sockets and REST API
- React client that connects to Socket.io and renders channels, users, and conversations
- REST API endpoints for fetching message history and user lists

This repository is structured as a two-app workspace:

```
/
├─ client/      # React app (UI, socket client)
├─ server/      # Express + Socket.io server, MongoDB models
├─ Week5-Assignment.md
└─ README.md
```

---

## Implemented features

- User authentication (JWT) and socket authentication middleware
- Global channel `general` and multi-channel support (join/leave channels)
- Public messages scoped to channels
- Private one-to-one messages (persisted to DB and emitted to both parties)
- Message persistence (MongoDB) with REST endpoint to fetch history
- Typing indicators and online user list (presence)
- Reconnection and basic socket auth error handling
- REST API endpoints:
  - `GET /api/messages` — fetch messages (supports `channel=` query or `private=true`)
  - `GET /api/users` — fetch all users with online status

S
## Architecture & data flow (high level)

- Client connects to server via Socket.io and authenticates using a JWT passed in socket auth.
- Server validates JWT in socket middleware and attaches the user to `socket.user`.
- Public messages are saved to MongoDB with a `channel` field and broadcast into the Socket.io room for that channel.
- Private messages have `isPrivate: true` and a `recipient` reference; they're saved and emitted only to the recipient's socket and the sender.
- The REST API provides message history for channels or private conversations and returns messages with sender/recipient DB ids so the client can group conversations.

---

## Getting started (development)

Prerequisites

- Node.js 18+ (or modern LTS)
- npm or yarn
- A running MongoDB instance (local or cloud)

Environment variables (create `server/config/.env`)

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/chatdb
JWT_SECRET=your_jwt_secret_here
CLIENT_URL=http://localhost:5173  # optional, used for CORS
```

Install dependencies and run

Server

```powershell
cd server
npm install
# development: starts the server (watch or normal depending on package.json)
npm run dev
```

Client

```powershell
cd client
npm install
npm run dev
```

Open the client app in your browser (Vite typically serves at http://localhost:5173). The server runs by default on port 5000.

---

## API & Socket reference

REST

- GET /api/messages
  - Query parameters:
    - `channel` (string) — return public messages for the channel
    - `private=true` — return private messages involving the authenticated user (requires Bearer token)
  - Behavior:
    - If `channel` is provided: returns only public messages for that channel
    - If `private=true` and user is authenticated: returns private messages where user is sender or recipient
    - Authenticated without channel: returns public + private involving user
    - Unauthenticated: returns public messages only

- GET /api/users
  - Returns all registered users with fields: `{ id: socketId|null, dbId, username, online }`

Socket events (client ↔ server)

- Client -> Server
  - `send_message` — { message: string, channel?: string } or a raw string
  - `private_message` — { to: <socketId>, message: string }
  - `join_channel` — channel name string
  - `leave_channel` — channel name string
  - `typing` — boolean

- Server -> Client
  - `receive_message` — public message payload emitted to a channel
  - `private_message` — private message payload sent to sender and recipient
  - `user_list` — array of online users
  - `user_joined` / `user_left` — notify about joins/leaves
  - `typing_users` — list of usernames currently typing
  - `me` — { dbId } sent to the client on connect so it knows its DB id

Message payload shape (example)

```
{
  id: "<messageId>",
  message: "Hello",
  sender: "alice",
  senderDbId: "<user-db-id>",
  senderId: "<socket-id>|null",
  recipientDbId: "<db-id>|null",
  channel: "general",
  timestamp: "2025-11-05T...",
  isPrivate: false
}
```

---


## Troubleshooting

- MongoDB connection errors:
  - Ensure `MONGO_URI` is correct and MongoDB is reachable. Check server logs (`✅ MongoDB connected` on success).
- Socket authentication errors:
  - Ensure the client sends a valid JWT in socket auth (and as `Authorization: Bearer <token>` for REST calls).
- Private messages not delivered:
  - Private messages are delivered by socket id — confirm the recipient is online and the server maps their DB id to a socket id in `user_list`.
- Messages not showing after refresh:
  - Verify the client calls `GET /api/messages` with proper query params and that the server returns messages with `senderDbId`/`recipientDbId`. Check server logs for errors.


