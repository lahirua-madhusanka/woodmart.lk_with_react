import { body } from "express-validator";
import express from "express";
import multer from "multer";
import {
  createAdminCategory,
  deleteAdminCategory,
  deleteUserAdmin,
  getAdminCategories,
  getAdminDashboardStats,
  getAdminOrderById,
  getAdminProfitReport,
  getAdminReviews,
  getAdminSettings,
  getAllOrdersAdmin,
  getAllUsersAdmin,
  uploadAdminHeroImage,
  updateAdminSettings,
  updateOrderStatusAdmin,
  updateUserRoleAdmin,
} from "../controllers/adminController.js";
import {
  createAdminBanner,
  deleteAdminBanner,
  getAdminBanners,
  updateAdminBanner,
  uploadAdminBannerImage,
} from "../controllers/bannerController.js";
import {
  createAdminCoupon,
  deleteAdminCoupon,
  getAdminCoupons,
  updateAdminCoupon,
} from "../controllers/couponController.js";
import {
  getAdminContactMessages,
  updateAdminContactMessageStatus,
} from "../controllers/contactController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateMiddleware.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      return cb(null, true);
    }
    return cb(new Error("Only image files are allowed"));
  },
});

router.use(protect, adminOnly);

router.get("/stats", getAdminDashboardStats);
router.get("/profit-report", getAdminProfitReport);
router.get("/settings", getAdminSettings);
router.post("/settings/hero-image", upload.single("heroImage"), uploadAdminHeroImage);
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
    body("businessHours")
      .custom((value) => !value || String(value).length <= 120)
      .withMessage("Business hours must be at most 120 characters"),
    body("supportNote")
      .custom((value) => !value || String(value).length <= 300)
      .withMessage("Support note must be at most 300 characters"),
    body("contactImageUrl")
      .custom((value) => !value || /^https?:\/\/.+/i.test(String(value)))
      .withMessage("Contact image URL must be a valid URL"),
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
    body("heroTitle")
      .trim()
      .notEmpty()
      .withMessage("Hero title is required")
      .isLength({ max: 180 })
      .withMessage("Hero title must be at most 180 characters"),
    body("heroSubtitle")
      .trim()
      .notEmpty()
      .withMessage("Hero subtitle is required")
      .isLength({ max: 400 })
      .withMessage("Hero subtitle must be at most 400 characters"),
    body("heroPrimaryButtonText")
      .trim()
      .notEmpty()
      .withMessage("Primary button text is required")
      .isLength({ max: 60 })
      .withMessage("Primary button text must be at most 60 characters"),
    body("heroPrimaryButtonLink")
      .trim()
      .notEmpty()
      .withMessage("Primary button link is required")
      .isLength({ max: 300 })
      .withMessage("Primary button link must be at most 300 characters"),
    body("heroSecondaryButtonText")
      .trim()
      .notEmpty()
      .withMessage("Secondary button text is required")
      .isLength({ max: 60 })
      .withMessage("Secondary button text must be at most 60 characters"),
    body("heroSecondaryButtonLink")
      .trim()
      .notEmpty()
      .withMessage("Secondary button link is required")
      .isLength({ max: 300 })
      .withMessage("Secondary button link must be at most 300 characters"),
    body("heroImage")
      .trim()
      .isURL()
      .withMessage("Hero image must be a valid URL"),
  ],
  validateRequest,
  updateAdminSettings
);

router.get("/orders", getAllOrdersAdmin);
router.get("/orders/:id", getAdminOrderById);
router.put(
  "/orders/:id/status",
  [
    body("orderStatus")
      .optional()
      .isIn([
        "pending",
        "confirmed",
        "processing",
        "packed",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "returned",
      ])
      .withMessage("Invalid order status"),
    body("paymentStatus")
      .optional()
      .isIn(["pending", "paid", "failed"])
      .withMessage("Invalid payment status"),
    body("trackingNumber")
      .optional({ nullable: true })
      .isLength({ max: 120 })
      .withMessage("Tracking number must be at most 120 characters"),
    body("courierName")
      .optional({ nullable: true })
      .isLength({ max: 120 })
      .withMessage("Courier name must be at most 120 characters"),
    body("adminNote")
      .optional({ nullable: true })
      .isLength({ max: 2000 })
      .withMessage("Admin note must be at most 2000 characters"),
    body("statusNote")
      .optional({ nullable: true })
      .isLength({ max: 500 })
      .withMessage("Status note must be at most 500 characters"),
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

router.get("/banners", getAdminBanners);
router.post(
  "/banners",
  [
    body("title").trim().notEmpty().isLength({ max: 180 }),
    body("subtitle").optional({ nullable: true }).isLength({ max: 400 }),
    body("imageUrl").trim().isURL(),
    body("buttonText").optional({ nullable: true }).isLength({ max: 60 }),
    body("buttonLink").optional({ nullable: true }).isLength({ max: 300 }),
    body("section")
      .trim()
      .isIn(["promo_strip", "category_promo", "featured_section", "secondary_banner"]),
    body("displayOrder").isInt({ min: 0 }),
    body("status").trim().isIn(["active", "inactive"]),
    body("startDate").optional({ nullable: true, checkFalsy: true }).isISO8601(),
    body("endDate").optional({ nullable: true, checkFalsy: true }).isISO8601(),
  ],
  validateRequest,
  createAdminBanner
);
router.put(
  "/banners/:id",
  [
    body("title").trim().notEmpty().isLength({ max: 180 }),
    body("subtitle").optional({ nullable: true }).isLength({ max: 400 }),
    body("imageUrl").trim().isURL(),
    body("buttonText").optional({ nullable: true }).isLength({ max: 60 }),
    body("buttonLink").optional({ nullable: true }).isLength({ max: 300 }),
    body("section")
      .trim()
      .isIn(["promo_strip", "category_promo", "featured_section", "secondary_banner"]),
    body("displayOrder").isInt({ min: 0 }),
    body("status").trim().isIn(["active", "inactive"]),
    body("startDate").optional({ nullable: true, checkFalsy: true }).isISO8601(),
    body("endDate").optional({ nullable: true, checkFalsy: true }).isISO8601(),
  ],
  validateRequest,
  updateAdminBanner
);
router.delete("/banners/:id", deleteAdminBanner);
router.post("/banners/upload-image", upload.single("image"), uploadAdminBannerImage);

router.get("/coupons", getAdminCoupons);
router.post(
  "/coupons",
  [
    body("code").trim().notEmpty().isLength({ min: 2, max: 40 }),
    body("title").trim().notEmpty().isLength({ max: 120 }),
    body("discountType").trim().isIn(["percentage", "fixed"]),
    body("discountValue").isFloat({ min: 0.01 }),
    body("minimumOrderAmount").isFloat({ min: 0 }),
    body("maximumDiscountAmount").optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }),
    body("scopeType").trim().isIn(["all", "products", "categories"]),
    body("applicableProductIds").optional({ nullable: true }).isArray(),
    body("applicableCategories").optional({ nullable: true }).isArray(),
    body("startDate").optional({ nullable: true, checkFalsy: true }).isISO8601(),
    body("endDate").optional({ nullable: true, checkFalsy: true }).isISO8601(),
    body("status").trim().isIn(["active", "inactive"]),
    body("totalUsageLimit").optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }),
    body("perUserUsageLimit").optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }),
  ],
  validateRequest,
  createAdminCoupon
);
router.put(
  "/coupons/:id",
  [
    body("code").trim().notEmpty().isLength({ min: 2, max: 40 }),
    body("title").trim().notEmpty().isLength({ max: 120 }),
    body("discountType").trim().isIn(["percentage", "fixed"]),
    body("discountValue").isFloat({ min: 0.01 }),
    body("minimumOrderAmount").isFloat({ min: 0 }),
    body("maximumDiscountAmount").optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }),
    body("scopeType").trim().isIn(["all", "products", "categories"]),
    body("applicableProductIds").optional({ nullable: true }).isArray(),
    body("applicableCategories").optional({ nullable: true }).isArray(),
    body("startDate").optional({ nullable: true, checkFalsy: true }).isISO8601(),
    body("endDate").optional({ nullable: true, checkFalsy: true }).isISO8601(),
    body("status").trim().isIn(["active", "inactive"]),
    body("totalUsageLimit").optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }),
    body("perUserUsageLimit").optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }),
  ],
  validateRequest,
  updateAdminCoupon
);
router.delete("/coupons/:id", deleteAdminCoupon);

router.get("/contact-messages", getAdminContactMessages);
router.patch(
  "/contact-messages/:id/status",
  [body("status").trim().isIn(["new", "read", "replied"]).withMessage("Invalid contact message status")],
  validateRequest,
  updateAdminContactMessageStatus
);

export default router;
