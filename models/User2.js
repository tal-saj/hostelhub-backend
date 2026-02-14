const mongoose = require('mongoose');

const user2Schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    comments: [
      {
        text: { type: String, required: true },
        date: { type: Date, default: Date.now },
      },
    ],
    ratings: [
      {
        value: { type: Number, min: 1, max: 5, required: true },
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const User2 = mongoose.model('User2', user2Schema);
module.exports = User2;
