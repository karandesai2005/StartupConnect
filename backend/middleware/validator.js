const { body, validationResult } = require("express-validator");

// Middleware to validate username input
const validateUsernameInput = [
  body("username")
    .isString()
    .isLength({ min: 3, max: 50 })
    .withMessage("Username must be between 3 and 50 characters."),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

// Middleware to validate saveUserDetails input
const validateSaveUserDetailsInput = [
  body("step").isInt({ min: 1, max: 6 }).withMessage("Step must be between 1 and 4."),
  body("data").notEmpty().withMessage("Data field is required."),
  body("data.email").if(body("step").equals(1)).isEmail().withMessage("Invalid email."),
  body("data.password")
    .if(body("step").equals(1))
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters."),
  body("data.userId")
    .if(body("step").isIn([2, 3, 4]))
    .isInt()
    .withMessage("Valid userId is required."),
  body("data.bio").if(body("step").equals(2)).isString().optional({ nullable: true }),
  body("data.username").if(body("step").equals(3)).isString().isLength({ min: 3, max: 50 }),
  body("data.isFounder")
    .if(body("step").equals(4))
    .isBoolean()
    .withMessage("isFounder must be a boolean."),
  body("data.isInvestor")
    .if(body("step").equals(4))
    .isBoolean()
    .withMessage("isInvestor must be a boolean."),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = { validateUsernameInput, validateSaveUserDetailsInput };
