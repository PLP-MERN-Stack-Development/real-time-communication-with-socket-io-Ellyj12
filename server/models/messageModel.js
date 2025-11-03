const mongoose = require('mongoose');

// --- MESSAGE SCHEMA ---
const MessageSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    // This links the message to a User document in the 'User' collection
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // This 'ref' must match the model name: 'User'
      required: true,
    },
    // --- NEW: Add recipient for private messages ---
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null = public message
    },
    // --- NEW: Flag for private messages ---
    isPrivate: {
      type: Boolean,
      default: false,
    },
    // --- Channel for public messages ---
    channel: {
      type: String,
      default: 'general',
      trim: true,
    },
  },
  { timestamps: true } // Mongoose adds createdAt and updatedAt
);

// Create and export the model
const Message = mongoose.model('Message', MessageSchema);
module.exports = Message;

