const mongoose = require("mongoose")

const UserSchema = new mongoose.Schema({
  googleId: String,
  name: {
    type : String,
    required : true,
    _id : false,
  },
  displayName: {
    type : String,
    required : true,
    _id : false,
  },
  email: String,
  role: { type: String, default: "student" } // or 'admin'
});

module.exports = mongoose.model('User', UserSchema);