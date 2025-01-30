const app = require("./app");

// app.listen(3000, "0.0.0.0", () => {
//   console.log("Server running on http://0.0.0.0:3000");
// });

const express = require("express");
// const app = express();

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to the backend server!");
});

// Login route
app.post("/api/auth/login", (req, res) => {
  // Handle login logic here
  res.json({ message: "h successful!" });
});

app.post("/api/auth/save-user-details", (req, res) => {
  // Handle login logic here
  res.json({ message: "heyy !" });
});

// Start the server
app.listen(3000, "0.0.0.0", () => {
  console.log("Server running on http://0.0.0.0:3000");
});