import express from "express";
import { v4 as uuidv4 } from "uuid";
import Classroom from "../model/Classroom.js";
import AttendanceSession from "../model/AttendanceSession.js";

const router = express.Router();

const getClientIP = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress
  )?.replace("::ffff:", "");
};

function isSameNetwork(ip1, ip2) {
  if (!ip1 || !ip2) return false;

  // ignore IPv6
  if (ip1.includes(":") || ip2.includes(":")) {
    console.log("IPv6 detected, skipping strict check");
    return true; // or return false based on your rule
  }

  const net1 = ip1.split(".").slice(0, 3).join(".");
  const net2 = ip2.split(".").slice(0, 3).join(".");

  return net1 === net2;
}



/* =========================================
  🔥 START SESSION
========================================= */
router.post("/start", async (req, res) => {
  try {
    const { classId } = req.body;
    const teacherIP = getClientIP(req);

    if (!classId) {
      return res.status(400).json({ msg: "classId required" });
    }

    const session = new AttendanceSession({
      classId,
      sessionId: uuidv4(),
      startTime: new Date(),
      teacherIP, // ✅ IMPORTANT
      expiresAt: Date.now() + 60 * 60 * 1000,
      students: [],
    });

    await session.save();

    res.json({
      msg: "Session started",
      session,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Error starting session" });
  }
});

/* =========================================
  🔥 JOIN SESSION
========================================= */

router.post("/join", async (req, res) => {
  try {
    const { sessionId, studentId, name, rollNo } = req.body;

    if (!sessionId || !studentId || !name || !rollNo) {
      return res.status(400).json({ msg: "Missing fields" });
    }

    const session = await AttendanceSession.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({ msg: "Session not found" });
    }

    // Expiry check
    if (Date.now() > session.expiresAt) {
      return res.status(400).json({ msg: "Session expired" });
    }

    // ✅ IP CHECK (MAIN LOGIC)
const studentIP = getClientIP(req);

console.log("Teacher IP:", session.teacherIP);
console.log("Student IP:", studentIP);

const sameNetwork = isSameNetwork(
  session.teacherIP,
  studentIP
);

    if (!sameNetwork) {
      return res.status(403).json({
        msg: "Not connected to same network",
      });
    }

    // CLASS VALIDATION
    const classroom = await Classroom.findById(session.classId);

    const exists = classroom.students.find(
      (s) => s.name === name && s.rollNo === rollNo
    );

    if (!exists) {
      return res.status(400).json({ msg: "Student not in class list" });
    }


    let student = session.students.find(
      (s) => String(s.studentId) === String(studentId)
    );

    if (!student) {
      session.students.push({
        studentId,
        name,
        rollNo,
        joinedAt: new Date(),
        lastSeen: new Date(),
        active: true,
      });
    } else {
      // 🔥 update existing
      student.joinedAt = new Date();
      student.lastSeen = new Date();
      student.active = true;
    }

    await session.save();

    res.json({ msg: "Joined successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Join error" });
  }
});

/* =========================================
  🔥 HEARTBEAT
========================================= */
router.post("/heartbeat", async (req, res) => {
  try {
    const { sessionId, studentId } = req.body;

    const studentIP = getClientIP(req);

    console.log("HEARTBEAT:", { sessionId, studentId, studentIP });

    if (!sessionId || !studentId) {
      return res.status(400).json({ msg: "Missing sessionId or studentId" });
    }

    const session = await AttendanceSession.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({ msg: "Session not found" });
    }

    const student = session.students.find(
      (s) => String(s.studentId) === String(studentId)
    );

    if (!student) {
      return res.status(404).json({ msg: "Student not in session" });
    }

    const sameNetwork = isSameNetwork(
      session.teacherIP,
      studentIP
    );

    if (!sameNetwork) {
      student.active = false;
    } else {
      student.lastSeen = new Date();
      student.active = true;
    }

    await session.save();

    res.json({ msg: "Heartbeat received" });

  } catch (err) {
    console.log("HEARTBEAT ERROR:", err);
    res.status(500).json({
      msg: err.message || "Heartbeat error",
    });
  }
});

/* =========================================
  🔥 END SESSION
========================================= */
router.post("/end", async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await AttendanceSession.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({ msg: "Session not found" });
    }

    const endTime = new Date();
    session.endTime = endTime;

    const classroom = await Classroom.findById(session.classId);

    const result = classroom.students.map((student) => {
      const found = session.students.find(
        (s) => String(s.rollNo) === String(student.rollNo)
      );

      let status = "Absent";

      if (found) {
        // 🔥 CORE FIX HERE
        const lastSeen = new Date(found.lastSeen);
        const diff = (endTime - lastSeen) / 1000; // seconds

        // ✅ if active recently → present
        if (diff <= 20) {
          status = "Present";
        } else {
          status = "Absent";
        }

        found.status = status;
        found.active = status === "Present";
      } else {
        // not joined
        session.students.push({
          studentId: student._id || null,
          name: student.name,
          rollNo: student.rollNo,
          joinedAt: null,
          lastSeen: null,
          active: false,
          status: "Absent",
        });
      }

      return {
        name: student.name,
        rollNo: student.rollNo,
        status,
      };
    });

    session.markModified("students");

    await session.save();

    res.json(result);

  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "End session error" });
  }
});

/* =========================================
  🔥 AUTO-INACTIVE (BACKGROUND JOB)
========================================= */
setInterval(async () => {
  try {
    const sessions = await AttendanceSession.find();

    const now = new Date();

    for (const session of sessions) {

      // 🔥 IMPORTANT FIX
      if (session.endTime) continue;

      let updated = false;

      for (const student of session.students) {
        const diff = (now - new Date(student.lastSeen)) / 1000;

        if (diff > 300 && student.active) { // 5 min
          student.active = false;
          updated = true;
        }
      }

      if (updated) {
        await session.save();
      }
    }

  } catch (err) {
    console.log("Auto inactive error:", err);
  }
}, 60 * 1000);

// 🔥 GET LIVE SESSION DATA
router.get("/session/:sessionId", async (req, res) => {
  try {
    const session = await AttendanceSession.findOne({
      sessionId: req.params.sessionId,
    });

    if (!session) {
      return res.status(404).json({ msg: "Session not found" });
    }

    res.json(session);
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Error fetching session" });
  }
});

/* =========================================
    Download
========================================= */
router.get("/class/:classId/history", async (req, res) => {
  try {
    const { classId } = req.params;

    const sessions = await AttendanceSession.find({ classId });

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching history" });
  }
});



router.post("/mark", async (req, res) => {
  try {
    const { sessionId, studentId } = req.body;

    const session = await AttendanceSession.findOne({ sessionId });

    if (!session) {
      return res.status(400).json({ message: "Invalid session" });
    }

    // ✅ expiry check (important)
    if (Date.now() > session.expiresAt) {
      return res.status(400).json({ message: "Session expired" });
    }

const studentIP = getClientIP(req);

const sameNetwork = isSameNetwork(
  session.teacherIP,
  studentIP
);

    if (!sameNetwork) {
      return res.status(403).json({
        message: "Not on same network",
      });
    }

    res.json({ message: "Attendance marked successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Cancel session (delete without saving attendance)

router.post("/cancel", async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await AttendanceSession.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({ msg: "Session not found" });
    }

    // ❌ DELETE SESSION (no attendance saved)
    await AttendanceSession.deleteOne({ sessionId });

    res.json({ msg: "Session cancelled successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Cancel session error" });
  }
});


export default router;