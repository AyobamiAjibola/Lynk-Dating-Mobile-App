import mongoose, { Document, Schema } from 'mongoose';

interface IChatMessage {
    chatId: string,
    senderId: string;
    receiverId: string;
    senderStatus: string;
    receiverStatus: string;
    message: string;
};

const chatMessageSchema = new Schema<IChatMessage>({
    senderId: { type: String },
    receiverId: { type: String },
    chatId: { type: String },
    senderStatus: { type: String, default: 'unread' },
    receiverStatus: { type: String, default: 'unread' },
    message: { type: String }
},{timestamps: true});

// chatMessageSchema.pre('findOne', function (next) {
//     this.populate({
//       path: 'senderId',
//       select: '_id firstName profileImageUrl'
//     });
//     next();
// });

// chatMessageSchema.pre('findOne', function (next) {
//     this.populate({
//       path: 'receiverId',
//       select: '_id firstName profileImageUrl'
//     });
//     next();
// });

export interface IChatMessageModel extends Document, IChatMessage {}

const ChatMessage = mongoose.model<IChatMessageModel>('ChatMessage', chatMessageSchema as any);

export default ChatMessage;