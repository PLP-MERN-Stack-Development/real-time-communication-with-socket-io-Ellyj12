// socket.js - Socket.io client setup

import { io } from "socket.io-client";
import { useEffect, useState } from "react";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [lastMessage, setLastMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [myDbId, setMyDbId] = useState(null);
  // privateMessages: { [peerDbId]: { messages: [], unread: number } }
  const [privateMessages, setPrivateMessages] = useState({});
  const [typingUsers, setTypingUsers] = useState([]);
  const [currentChannel, setCurrentChannel] = useState('general');

  // ✅ Connect & Load History
  const connect = async () => {
    const token = localStorage.getItem("chat-token");

    if (!token) {
      console.error("No token found. Cannot connect.");
      return;
    }

    socket.auth = { token };
    socket.connect();

    try {
      const headers = { Authorization: `Bearer ${token}` };
      // Load private message history (all private messages involving this user)
      const privateRes = await fetch('http://localhost:5000/api/messages?private=true', { headers });
      const privateHistory = await privateRes.json();

      // Group private messages by peer
      const privateByPeer = {};
      for (const msg of privateHistory) {
        const peerDbId = msg.senderDbId === myDbId ? msg.recipientDbId : msg.senderDbId;
        if (!privateByPeer[peerDbId]) {
          privateByPeer[peerDbId] = { messages: [], unread: 0 };
        }
        privateByPeer[peerDbId].messages.push(msg);
      }
      setPrivateMessages(privateByPeer);

   
      const res = await fetch(`http://localhost:5000/api/messages?channel=${encodeURIComponent(currentChannel)}`, { headers });
      const history = await res.json();

     
      setMessages(history);

      try {
        const usersRes = await fetch("http://localhost:5000/api/users", { headers });
        const usersList = await usersRes.json();
        setUsers(usersList);
      
        const me = usersList.find((u) => u.id === socket.id);
        setMyDbId(me ? me.dbId : null);
      } catch (uErr) {
        console.error('Failed to load users list:', uErr);
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    }
  };

  const disconnect = () => {
    localStorage.removeItem("chat-token");
    localStorage.removeItem("chat-username");
    socket.disconnect();
    setIsConnected(false);
    setMessages([]);
    setUsers([]);
    setTypingUsers([]);
  };

  const sendMessage = (message) => {
 
    socket.emit('send_message', { message, channel: currentChannel });
  };

  const joinChannel = async (channel) => {
    if (!channel || channel === currentChannel) return;
  
    if (currentChannel) {
      socket.emit('leave_channel', currentChannel);
    }

    return new Promise((resolve) => {
      const onJoined = (joinedChannel) => {
        if (joinedChannel !== channel) return;
        socket.off('channel_joined', onJoined);
        setCurrentChannel(channel);

       
        (async () => {
          try {
            const token = localStorage.getItem('chat-token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await fetch(`http://localhost:5000/api/messages?channel=${encodeURIComponent(channel)}`, { headers });
            const history = await res.json();
            setMessages(history);
          } catch (err) {
            console.error('Failed to load channel history:', err);
          }
          resolve();
        })();
      };

      socket.on('channel_joined', onJoined);
      socket.emit('join_channel', channel);
    });
  };

  const sendPrivateMessage = (to, message) => {
    socket.emit("private_message", { to, message });
  };

  const clearUnread = (peerDbId) => {
    setPrivateMessages((prev) => {
      if (!prev[peerDbId]) return prev;
      return { ...prev, [peerDbId]: { ...prev[peerDbId], unread: 0 } };
    });
  };

  const setTyping = (isTyping) => {
    socket.emit("typing", isTyping);
  };

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
    };

    const onMe = (payload) => {
      if (payload && payload.dbId) setMyDbId(payload.dbId);
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setMessages([]);
      setUsers([]);
      setTypingUsers([]);
      localStorage.removeItem("chat-token");
      localStorage.removeItem("chat-username");
    };

    const onConnectError = (err) => {
      console.error("Connection Error:", err.message);
      if (err.message.includes("Authentication error")) {
        localStorage.removeItem("chat-token");
        localStorage.removeItem("chat-username");
        setIsConnected(false);
      }
    };

    const onReceiveMessage = (message) => {
      setLastMessage(message);

      if (message.isPrivate) return;

   
      if (message.channel && message.channel !== currentChannel) return;

      setMessages((prev) => [...prev, message]);
    };

    const onPrivateMessage = (message) => {
      setLastMessage(message);

      let peerDbId = null;

      if (myDbId) {
        peerDbId = message.senderDbId === myDbId ? message.recipientDbId : message.senderDbId;
      } else {
      
        peerDbId = message.senderId === socket.id ? message.recipientDbId : message.senderDbId;
      }

      setPrivateMessages((prev) => {
        const copy = { ...prev };
        if (!copy[peerDbId]) copy[peerDbId] = { messages: [], unread: 0 };
        const wasUnread = copy[peerDbId].unread || 0;
        const isIncoming = message.senderDbId !== myDbId && message.senderId !== socket.id;

        copy[peerDbId] = {
          messages: [...copy[peerDbId].messages, message],
         
          unread: wasUnread + (isIncoming ? 1 : 0),
        };
        return copy;
      });
    };

    const onUserList = (userList) => {
     
      (async () => {
        try {
          const res = await fetch('http://localhost:5000/api/users');
          const all = await res.json();
          setUsers(all);
          const me = all.find((u) => u.id === socket.id);
          setMyDbId(me ? me.dbId : null);
        } catch (err) {
          console.error('Failed to refresh users:', err);
          
          setUsers(userList);
        }
      })();
    };

    const onUserJoined = (user) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          system: true,
          message: `${user.username} joined the chat`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    const onUserLeft = (user) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          system: true,
          message: `${user.username} left the chat`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    const onTypingUsers = (users) => {
      setTypingUsers(users);
    };

  socket.on("connect", onConnect);
  socket.on('me', onMe);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
  socket.on("receive_message", onReceiveMessage);
    socket.on("private_message", onPrivateMessage);
    socket.on("user_list", onUserList);
    socket.on("user_joined", onUserJoined);
    socket.on("user_left", onUserLeft);
    socket.on("typing_users", onTypingUsers);

  return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("receive_message", onReceiveMessage);
  socket.off('me', onMe);
      socket.off("private_message", onPrivateMessage);
      socket.off("user_list", onUserList);
      socket.off("user_joined", onUserJoined);
      socket.off("user_left", onUserLeft);
      socket.off("typing_users", onTypingUsers);
    };
  }, [currentChannel, myDbId]);

  return {
    socket,
    isConnected,
    lastMessage,
    messages,
    users,
    myDbId,
    privateMessages,
    typingUsers,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    clearUnread,
    joinChannel,
    currentChannel,
  };
};

export default socket;
