import express from "express";
import { body, param } from "express-validator";
import {
  deleteCustomerContactMessage,
  getCustomerContactMessages,
  submitContactMessage,
} from "../controllers/contactController.js";
import { validateRequest } from "../middleware/validateMiddleware.js";
import { optionalProtect, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/my-inquiries", protect, getCustomerContactMessages);
router.delete(
  "/my-inquiries/:id",
  protect,
  [param("id").isUUID().withMessage("Invalid inquiry id")],
  validateRequest,
  deleteCustomerContactMessage
);

router.post(
  "/",
  optionalProtect,
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
