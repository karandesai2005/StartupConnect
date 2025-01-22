const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getUserByEmail, createUser } = require("../models/userModel");

const register = async (req, res) => {
  try {
    const { username, email, password, isFounder, isInvestor } = req.body;

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) return res.status(400).json({ message: "Email already in use" });

    // Hash password
    const saltRounds = parseInt(process.env.SALT_ROUNDS, 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = await createUser(username, email, passwordHash, isFounder, isInvestor);
    res.status(201).json({ message: "User registered successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await getUserByEmail(email);
    if (!user) return res.status(400).json({ message: "Invalid email or password" });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    // Generate JWT
    const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

module.exports = { register, login };

