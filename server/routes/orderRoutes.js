import { body } from "express-validator";
import express from "express";
import {
  createOrder,
  createPaymentIntent,
  deleteCheckoutAddress,
  getCheckoutProfile,
  getOrderById,
  getUserOrders,
  saveCheckoutAddress,
} from "../controllers/orderController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateMiddleware.js";

const router = express.Router();

router.use(protect);

router.post(
  "/create-payment-intent",
  [body("amount").isFloat({ min: 1 }).withMessage("Amount must be greater than zero")],
  validateRequest,
  createPaymentIntent
);

router.post(
  "/create",
  [
    body("shippingAddress.fullName").notEmpty().withMessage("Full name is required"),
    body("shippingAddress.email").isEmail().withMessage("Valid email is required"),
    body("shippingAddress.phone").notEmpty().withMessage("Phone number is required"),
    body("shippingAddress.line1").notEmpty().withMessage("Address line is required"),
    body("shippingAddress.city").notEmpty().withMessage("City is required"),
    body("shippingAddress.state").notEmpty().withMessage("District/State is required"),
    body("shippingAddress.postalCode").notEmpty().withMessage("Postal code is required"),
    body("shippingAddress.country").notEmpty().withMessage("Country is required"),
    body("paymentMethod")
      .isIn(["cod", "card", "other"])
      .withMessage("Payment method is required"),
    body("couponCode")
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ min: 2, max: 40 })
      .withMessage("Coupon code must be between 2 and 40 characters"),
  ],
  validateRequest,
  createOrder
);

router.get("/checkout-profile", getCheckoutProfile);
router.post(
  "/address-book",
  [
    body("fullName").notEmpty().withMessage("Full name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("phone").notEmpty().withMessage("Phone number is required"),
    body("line1").notEmpty().withMessage("Address line is required"),
    body("city").notEmpty().withMessage("City is required"),
    body("state").notEmpty().withMessage("District/State is required"),
    body("postalCode").notEmpty().withMessage("Postal code is required"),
    body("country").notEmpty().withMessage("Country is required"),
  ],
  validateRequest,
  saveCheckoutAddress
);
router.delete("/address-book/:id", deleteCheckoutAddress);

router.get("/user", getUserOrders);
router.get("/:id", getOrderById);

export default router;
