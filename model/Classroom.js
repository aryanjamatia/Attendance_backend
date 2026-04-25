import mongoose from "mongoose";

const classroomSchema = new mongoose.Schema({
  course: String,
  semester: String,
  section: String,
  subject: String,
  students: [
    {
      name: String,
      rollNo: String,
    },
  ],
});

const Classroom = mongoose.model("Classroom", classroomSchema);

export default Classroom;