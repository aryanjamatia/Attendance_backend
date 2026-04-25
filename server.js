import express from "express";
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import classroomRoutes from "./routes/classroom.js";
import attendanceRoutes from "./routes/session.js"; 

const app = express();

app.use(cors());
app.use(express.json());

// ✅ CONNECT ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/classroom", classroomRoutes);
app.use("/api/attendance", attendanceRoutes); 

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

app.get("/", (req, res) => {
  res.send("API Running");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});