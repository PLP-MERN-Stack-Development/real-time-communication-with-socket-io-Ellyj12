import React from 'react';

// This component renders the list of online users.
// It receives:
// - users: The array of user objects from the hook.
// - myId: The current user's socket ID, to avoid showing themself.
// - setPmRecipient: Function from ChatInterface to set a private message target.
// - pmRecipient: The current PM target, to highlight them.

function UserList({ users, myId, setPmRecipient, pmRecipient, privateMessages = {} }) {
  // We sort the users alphabetically by username
  const sortedUsers = [...users].sort((a, b) =>
    a.username.localeCompare(b.username)
  );

  const total = users.length;
  const onlineCount = users.filter((u) => u.online).length;

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-lg font-semibold text-white mb-3 px-2">
        Users ({onlineCount} online / {total})
      </h3>
      <div className="flex-1 overflow-y-auto">
        {/* Public Chat "Button" */}
        <button
          onClick={() => setPmRecipient(null)}
          className={`w-full text-left px-2 py-2 rounded-md truncate transition-colors duration-200 ${
            !pmRecipient
              ? 'bg-blue-600 text-white' // Highlight if public chat is active
              : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          # Public Chat
        </button>

        {/* User List */}
        {sortedUsers.map((user) => {
          // Don't show the current user in the list (compare socket id)
          if (user.id && user.id === myId) {
            return null;
          }

          const isSelected = pmRecipient?.id === user.id;
          const isOnline = !!user.online;

          const unread = user.dbId ? (privateMessages[user.dbId]?.unread || 0) : 0;

          return (
            <button
              key={user.dbId || user.username}
              onClick={() => isOnline && setPmRecipient(user)}
              disabled={!isOnline}
              className={`w-full text-left px-2 py-2 rounded-md truncate transition-colors duration-200 flex items-center justify-between ${
                isSelected
                  ? 'bg-purple-600 text-white'
                  : isOnline
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-500 cursor-not-allowed bg-transparent'
              }`}
            >
              <div className="flex items-center gap-2 w-full">
                <span className="truncate">{user.username}</span>
                {unread > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    {unread}
                  </span>
                )}
              </div>
              <span className="ml-2 text-sm shrink-0">
                {/* Status dot */}
                <span
                  className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    isOnline ? 'bg-green-400' : 'bg-gray-600'
                  }`}
                />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default UserList;

