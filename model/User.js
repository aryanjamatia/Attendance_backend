import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  password: String,

  role: {
    type: String,
    enum: ["student", "teacher"],
    required: true,
  },

  // student fields
  rollNo: String,
  course: String,
  semester: String,
});

const User = mongoose.model("User", userSchema);

export default User;    