import { body } from "express-validator";
import express from "express";
import {
  createAdminCategory,
  deleteAdminCategory,
  deleteUserAdmin,
  getAdminCategories,
  getAdminDashboardStats,
  getAdminProfitReport,
  getAdminReviews,
  getAdminSettings,
  getAllOrdersAdmin,
  getAllUsersAdmin,
  updateAdminSettings,
  updateOrderStatusAdmin,
  updateUserRoleAdmin,
} from "../controllers/adminController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateMiddleware.js";

const router = express.Router();

router.use(protect, adminOnly);

router.get("/stats", getAdminDashboardStats);
router.get("/profit-report", getAdminProfitReport);
router.get("/settings", getAdminSettings);
router.put(
  "/settings",
  [
    body("storeName")
      .trim()
      .notEmpty()
      .withMessage("Store name is required")
      .isLength({ max: 120 })
      .withMessage("Store name must be at most 120 characters"),
    body("supportEmail")
      .custom((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)))
      .withMessage("Support email must be a valid email address"),
    body("contactNumber")
      .custom((value) => !value || String(value).length <= 50)
      .withMessage("Contact number must be at most 50 characters"),
    body("storeAddress")
      .custom((value) => !value || String(value).length <= 255)
      .withMessage("Store address must be at most 255 characters"),
    body("currency")
      .trim()
      .notEmpty()
      .withMessage("Currency is required")
      .isLength({ max: 10 })
      .withMessage("Currency must be at most 10 characters"),
    body("freeShippingThreshold")
      .isFloat({ min: 0 })
      .withMessage("Free shipping threshold must be a non-negative number"),
    body("themeAccent")
      .trim()
      .isLength({ min: 4, max: 20 })
      .withMessage("Theme accent is required"),
  ],
  validateRequest,
  updateAdminSettings
);

router.get("/orders", getAllOrdersAdmin);
router.put(
  "/orders/:id/status",
  [
    body("orderStatus")
      .optional()
      .isIn(["created", "processing", "shipped", "delivered", "cancelled"])
      .withMessage("Invalid order status"),
    body("paymentStatus")
      .optional()
      .isIn(["pending", "paid", "failed"])
      .withMessage("Invalid payment status"),
  ],
  validateRequest,
  updateOrderStatusAdmin
);

router.get("/users", getAllUsersAdmin);
router.put(
  "/users/:id/role",
  [
    body("role")
      .isIn(["user", "admin"])
      .withMessage("Role must be user or admin"),
  ],
  validateRequest,
  updateUserRoleAdmin
);
router.delete("/users/:id", deleteUserAdmin);

router.get("/categories", getAdminCategories);
router.post(
  "/categories",
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Category name is required")
      .isLength({ max: 80 })
      .withMessage("Category name must be at most 80 characters"),
  ],
  validateRequest,
  createAdminCategory
);
router.delete("/categories/:id", deleteAdminCategory);
router.get("/reviews", getAdminReviews);

export default router;
