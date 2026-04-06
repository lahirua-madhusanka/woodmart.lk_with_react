import { body } from "express-validator";
import express from "express";
import { applyCouponForCheckout } from "../controllers/couponController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateMiddleware.js";

const router = express.Router();

router.use(protect);

router.post(
  "/apply",
  [
    body("code")
      .trim()
      .notEmpty()
      .withMessage("Coupon code is required")
      .isLength({ min: 2, max: 40 })
      .withMessage("Coupon code must be between 2 and 40 characters"),
  ],
  validateRequest,
  applyCouponForCheckout
);

export default router;
