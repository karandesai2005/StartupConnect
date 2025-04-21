const { body, validationResult } = require("express-validator");

// Middleware to validate username input
const validateUsernameInput = [
  body("username")
    .isString()
    .isLength({ min: 3, max: 50 })
    .withMessage("Username must be between 3 and 50 characters."),
  
  // Handle validation errors
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
  // Validate the step field (must be between 1 and 6)
  body("step")
    .isInt({ min: 1, max: 6 })
    .withMessage("Step must be between 1 and 6."),
  
  // Ensure data field is not empty
  body("data")
    .notEmpty()
    .withMessage("Data field is required."),
  
  // Step 1: Validate email and password
  body("data.email")
    .if(body("step").equals(1))
    .isEmail()
    .withMessage("Invalid email."),
  
  body("data.password")
    .if(body("step").equals(1))
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters."),
  
  // Step 2-5: Validate supabase_uid as a string (UUID)
  body("data.supabase_uid")
    .if(body("step").isIn([2, 3, 4, 5]))
    .isString()
    .matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
    .withMessage("Valid supabase_uid (UUID) is required."),
  
  // Step 2: Validate optional bio
  body("data.bio")
    .if(body("step").equals(2))
    .isString()
    .optional({ nullable: true }),
  
  // Step 3: Validate username for step 3
  body("data.username")
    .if(body("step").equals(3))
    .isString()
    .isLength({ min: 3, max: 50 })
    .withMessage("Username must be between 3 and 50 characters."),
  
  // Step 4: Validate preference (Personal or Business)
  body("data.preference")
    .if(body("step").equals(4))
    .isIn(["personal", "business"])
    .withMessage("Preference must be 'personal' or 'business'."),

  // Step 4: Validate boolean values for isFounder and isInvestor
  body("data.isFounder")
    .if(body("step").equals(4))
    .isBoolean()
    .withMessage("isFounder must be a boolean."),
  
  body("data.isInvestor")
    .if(body("step").equals(4))
    .isBoolean()
    .withMessage("isInvestor must be a boolean."),
  
  // Step 5: Validate real name for Personal users
  body("data.realName")
    .if(body("step").equals(5))
    .isString()
    .withMessage("Real name is required."),
  
  // Handle validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = { validateUsernameInput, validateSaveUserDetailsInput };