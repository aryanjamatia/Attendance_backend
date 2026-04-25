import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    classId: {
      type: String,
      required: true,
    },

    sessionId: {
      type: String,
      required: true,
      unique: true,
    },

    startTime: {
      type: Date,
      default: Date.now,
    },

    endTime: {
      type: Date,
    },

    // ✅ Teacher IP (for network validation)
    teacherIP: {
      type: String,
      required: true,
      trim: true,
      index: true, // optional (keep this)
    },

    // ✅ Auto expiry (QR/session timeout)
    expiresAt: {
      type: Date,
      required: true,
      // ❌ removed index: true
    },

    students: [
      {
        studentId: {
          type: String,
          required: true,
        },

        name: String,
        rollNo: String,

        joinedAt: {
          type: Date,
          default: Date.now,
        },

        lastSeen: {
          type: Date,
          default: Date.now,
        },

        active: {
          type: Boolean,
          default: true,
        },

        status: {
          type: String,
          enum: ["Present", "Absent"],
          default: null,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// ✅ TTL index (ONLY this should exist)
attendanceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("AttendanceSession", attendanceSchema);