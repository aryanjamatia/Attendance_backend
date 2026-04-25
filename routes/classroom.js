import express from "express";
import Classroom from "../model/Classroom.js";

const router = express.Router();

// ✅ CREATE CLASS
router.post("/", async (req, res) => {
  try {
    const classroom = await Classroom.create(req.body);
    res.json(classroom);
  } catch (err) {
    console.log("CREATE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET ALL CLASSES
router.get("/", async (req, res) => {
  try {
    const data = await Classroom.find();
    res.json(data);
  } catch (err) {
    console.log("GET ALL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET SINGLE CLASS
router.get("/:id", async (req, res) => {
  try {
    console.log("GET ID:", req.params.id);

    const data = await Classroom.findById(req.params.id);

    if (!data) {
      return res.status(404).json({ msg: "Class not found" });
    }

    res.json(data);
  } catch (err) {
    console.log("GET ONE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ UPDATE STUDENTS (FIXED SAFE METHOD)
router.put("/:id", async (req, res) => {
  try {
    console.log("UPDATE ID:", req.params.id);
    console.log("BODY:", req.body);

    const classroom = await Classroom.findById(req.params.id);

    if (!classroom) {
      return res.status(404).json({ msg: "Class not found" });
    }

    // 🔥 SAFE UPDATE
    classroom.students = req.body.students || [];

    await classroom.save();

    res.json(classroom);
  } catch (err) {
    console.log("UPDATE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

//Student Dashboard Class List
router.get("/student/:rollNo", async (req, res) => {
  try {
    const { rollNo } = req.params;

    const classes = await Classroom.find({
      "students.rollNo": rollNo,
    });

    res.json(classes);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching classes" });
  }
});

export default router;