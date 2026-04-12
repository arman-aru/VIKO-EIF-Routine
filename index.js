require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const MAIN_DB_URL =
  "https://vikoeif.edupage.org/rpr/server/maindbi.js?__func=mainDBIAccessor";
const CURRENT_URL =
  "https://vikoeif.edupage.org/timetable/server/currenttt.js?__func=curentttGetData";

// Fetch teachers, subjects, classrooms, groups metadata
app.post("/all", async (req, res) => {
  try {
    const response = await axios.post(MAIN_DB_URL, req.body, {
      headers: { "Content-Type": "application/json" },
    });
    res.json(response.data);
  } catch (err) {
    console.error("Error /all:", err.message);
    res.status(500).json({ error: "Failed to fetch metadata" });
  }
});

// Fetch timetable for a specific group and date range
app.post("/current", async (req, res) => {
  try {
    const response = await axios.post(CURRENT_URL, req.body, {
      headers: { "Content-Type": "application/json" },
    });
    res.json(response.data);
  } catch (err) {
    console.error("Error /current:", err.message);
    res.status(500).json({ error: "Failed to fetch timetable" });
  }
});

// ─── Telegram Bot ──────────────────────────────────────────────────────
const { startBot } = require("./bot");
startBot();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
