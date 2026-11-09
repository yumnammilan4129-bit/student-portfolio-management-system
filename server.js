
const express = require("express");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB configuration
const MONGO_URL = "mongodb://127.0.0.1:27017";
const DB_NAME = "studentPortfolio";

let db;
let students;
let feedback;

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Helper functions
function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validateStudent(data) {
  const errors = [];

  if (!clean(data.full_name)) {
    errors.push("Full name is required.");
  }

  if (!clean(data.register_no)) {
    errors.push("Register number is required.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(data.email))) {
    errors.push("Enter a valid email address.");
  }

  if (
    clean(data.phone) &&
    !/^[0-9+\-\s()]{7,20}$/.test(clean(data.phone))
  ) {
    errors.push("Enter a valid phone number.");
  }

  return errors;
}

function studentData(data) {
  return {
    full_name: clean(data.full_name),
    register_no: clean(data.register_no),
    email: clean(data.email),
    phone: clean(data.phone),
    course: clean(data.course),
    department: clean(data.department),
    semester: clean(data.semester),
    academic_year: clean(data.academic_year),
    cgpa: clean(data.cgpa),
    skills: clean(data.skills),
    achievements: clean(data.achievements),
    projects: clean(data.projects)
  };
}

function formatStudent(student) {
  return {
    ...student,
    id: student._id.toString(),
    _id: student._id.toString()
  };
}

function validId(id) {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

// GET all students and search students
app.get("/api/students", async (req, res) => {
  try {
    const q = clean(req.query.q);

    let filter = {};

    if (q) {
      const safeQuery = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(safeQuery, "i");

      filter = {
        $or: [
          { full_name: searchRegex },
          { register_no: searchRegex }
        ]
      };
    }

    const records = await students
      .find(filter)
      .sort({ created_at: -1 })
      .toArray();

    res.json(records.map(formatStudent));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch student records." });
  }
});

// GET individual student
app.get("/api/students/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ error: "Invalid student ID." });
    }

    const student = await students.findOne({
      _id: new ObjectId(req.params.id)
    });

    if (!student) {
      return res.status(404).json({ error: "Student record not found." });
    }

    res.json(formatStudent(student));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to fetch student record." });
  }
});

// REGISTER student
app.post("/api/students", async (req, res) => {
  try {
    const data = req.body || {};
    const errors = validateStudent(data);

    if (errors.length) {
      return res.status(400).json({ error: errors.join(" ") });
    }

    const record = {
      ...studentData(data),
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await students.insertOne(record);

    res.status(201).json({
      message: "Student portfolio saved successfully.",
      id: result.insertedId.toString()
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: "That register number already exists."
      });
    }

    console.error(error);
    res.status(500).json({
      error: "Unable to save the student record."
    });
  }
});

// UPDATE student
app.put("/api/students/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ error: "Invalid student ID." });
    }

    const data = req.body || {};
    const errors = validateStudent(data);

    if (errors.length) {
      return res.status(400).json({ error: errors.join(" ") });
    }

    const result = await students.updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          ...studentData(data),
          updated_at: new Date()
        }
      }
    );

    if (!result.matchedCount) {
      return res.status(404).json({
        error: "Student record not found."
      });
    }

    res.json({
      message: "Student portfolio updated successfully."
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: "That register number already exists."
      });
    }

    console.error(error);
    res.status(500).json({
      error: "Unable to update the student record."
    });
  }
});

// DELETE student
app.delete("/api/students/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ error: "Invalid student ID." });
    }

    const result = await students.deleteOne({
      _id: new ObjectId(req.params.id)
    });

    if (!result.deletedCount) {
      return res.status(404).json({
        error: "Student record not found."
      });
    }

    res.json({ message: "Student portfolio deleted." });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Unable to delete the student record."
    });
  }
});

// SUBMIT feedback
app.post("/api/feedback", async (req, res) => {
  try {
    const data = req.body || {};

    const name = clean(data.student_name);
    const email = clean(data.email);
    const category = clean(data.category);
    const comments = clean(data.comments);
    const rating = Number(data.rating);

    if (
      !name ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !category ||
      !comments
    ) {
      return res.status(400).json({
        error: "Please complete all fields with a valid email address."
      });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        error: "Please select a rating from 1 to 5."
      });
    }

    await feedback.insertOne({
      student_name: name,
      email,
      rating,
      category,
      comments,
      created_at: new Date()
    });

    res.status(201).json({
      message: "Thank you! Your feedback has been submitted."
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Unable to submit feedback."
    });
  }
});

// Serve website
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Connect to MongoDB and start server
async function startServer() {
  try {
    const client = new MongoClient(MONGO_URL);

    await client.connect();

    console.log("Connected to MongoDB successfully!");

    db = client.db(DB_NAME);

    students = db.collection("students");
    feedback = db.collection("feedback");

    // Prevent duplicate registration numbers
    await students.createIndex(
      { register_no: 1 },
      { unique: true }
    );

    console.log(`Database: ${DB_NAME}`);
    console.log("Collections: students, feedback");

    app.listen(PORT, () => {
      console.log(
        `Student Portfolio Management System running at http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

startServer();
