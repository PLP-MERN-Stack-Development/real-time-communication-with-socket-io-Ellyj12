const mongoose = require('mongoose');


const MessageSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', 
      required: true,
    },
   
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, 
    },
   
    isPrivate: {
      type: Boolean,
      default: false,
    },
    
    channel: {
      type: String,
      default: 'general',
      trim: true,
    },
  },
  { timestamps: true }
);


const Message = mongoose.model('Message', MessageSchema);
module.exports = Message;

