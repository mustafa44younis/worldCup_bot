import mongoose from "mongoose";

const subscriberSchema = new mongoose.Schema({
  chatId: {
    type: Number,
    required: true,
    unique: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  notifications: {
  type: Boolean,
  default: true
}
});

export default mongoose.model("Subscriber", subscriberSchema);