import express from "express";
import { body } from "express-validator";
import { submitContactMessage } from "../controllers/contactController.js";
import { validateRequest } from "../middleware/validateMiddleware.js";

const router = express.Router();

router.post(
  "/",
  [
    body("firstName").trim().notEmpty().withMessage("First name is required").isLength({ max: 80 }),
    body("lastName").trim().notEmpty().withMessage("Last name is required").isLength({ max: 80 }),
    body("email").trim().isEmail().withMessage("Valid email is required"),
    body("subject").trim().notEmpty().withMessage("Subject is required").isLength({ max: 180 }),
    body("message").trim().notEmpty().withMessage("Message is required").isLength({ max: 4000 }),
  ],
  validateRequest,
  submitContactMessage
);

export default router;
