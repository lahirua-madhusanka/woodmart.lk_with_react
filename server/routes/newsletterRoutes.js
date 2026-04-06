import express from "express";
import { body } from "express-validator";
import {
  subscribeNewsletter,
  unsubscribeNewsletter,
} from "../controllers/newsletterController.js";
import { optionalProtect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateMiddleware.js";

const router = express.Router();

router.post(
  "/subscribe",
  optionalProtect,
  [
    body("email")
      .trim()
      .isEmail()
      .withMessage("Valid email is required")
      .normalizeEmail({ gmail_remove_dots: false }),
    body("source").optional().trim().isLength({ max: 100 }).withMessage("Source must be 100 characters or fewer"),
  ],
  validateRequest,
  subscribeNewsletter
);

router.post(
  "/unsubscribe",
  optionalProtect,
  [
    body("email")
      .trim()
      .isEmail()
      .withMessage("Valid email is required")
      .normalizeEmail({ gmail_remove_dots: false }),
  ],
  validateRequest,
  unsubscribeNewsletter
);

export default router;
