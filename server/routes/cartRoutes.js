import { body } from "express-validator";
import express from "express";
import { addToCart, getCart, removeCartItem, updateCartItem } from "../controllers/cartController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getCart);

router.post(
  "/add",
  [
    body("productId").isUUID().withMessage("Valid productId is required"),
    body("variationId").optional({ nullable: true }).isUUID().withMessage("Valid variationId is required"),
    body("quantity").optional().isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  ],
  validateRequest,
  addToCart
);

router.put(
  "/update",
  [
    body("productId").isUUID().withMessage("Valid productId is required"),
    body("variationId").optional({ nullable: true }).isUUID().withMessage("Valid variationId is required"),
    body("quantity").isInt({ min: 0 }).withMessage("Quantity must be zero or greater"),
  ],
  validateRequest,
  updateCartItem
);

router.delete(
  "/remove",
  [
    body("productId").isUUID().withMessage("Valid productId is required"),
    body("variationId").optional({ nullable: true }).isUUID().withMessage("Valid variationId is required"),
  ],
  validateRequest,
  removeCartItem
);

export default router;
