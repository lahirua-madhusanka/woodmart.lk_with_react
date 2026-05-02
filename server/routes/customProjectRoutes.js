import express from "express";
import multer from "multer";
import { body } from "express-validator";
import {
  acceptCustomProjectQuote,
  adminDeleteCustomProjectRequest,
  createCustomProjectRequest,
  declineCustomProjectQuote,
  deleteCustomProjectRequest,
  getAdminCustomProjectRequestById,
  getAdminCustomProjectRequests,
  getMyCustomProjectRequests,
  sendCustomProjectPurchaseLink,
  updateAdminCustomProjectRequest,
} from "../controllers/customProjectController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateMiddleware.js";

const router = express.Router();
const MAX_CUSTOM_PROJECT_IMAGES = 5;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: MAX_CUSTOM_PROJECT_IMAGES,
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      return cb(null, true);
    }
    return cb(new Error("Only image files are allowed"));
  },
});

router.post(
  "/",
  protect,
  upload.array("images", MAX_CUSTOM_PROJECT_IMAGES),
  [
    body("description")
      .trim()
      .notEmpty()
      .withMessage("Product description is required")
      .isLength({ max: 4000 })
      .withMessage("Description can be at most 4000 characters"),
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Full name is required")
      .isLength({ max: 120 })
      .withMessage("Name can be at most 120 characters"),
    body("email")
      .trim()
      .isEmail()
      .withMessage("A valid email is required"),
    body("mobile")
      .trim()
      .notEmpty()
      .withMessage("Mobile number is required")
      .isLength({ max: 40 })
      .withMessage("Mobile number can be at most 40 characters"),
    body("specifications")
      .optional({ nullable: true })
      .isLength({ max: 2000 })
      .withMessage("Specifications can be at most 2000 characters"),
    body("budget")
      .optional({ nullable: true, checkFalsy: true })
      .isFloat({ min: 0 })
      .withMessage("Budget must be a non-negative number"),
    body("deadline")
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601()
      .withMessage("Deadline must be a valid date"),
  ],
  validateRequest,
  createCustomProjectRequest
);

router.get("/my", protect, getMyCustomProjectRequests);
router.post("/:id/accept", protect, acceptCustomProjectQuote);
router.post("/:id/decline", protect, declineCustomProjectQuote);
router.delete("/:id", protect, deleteCustomProjectRequest);

router.get("/admin", protect, adminOnly, getAdminCustomProjectRequests);
router.get("/admin/:id", protect, adminOnly, getAdminCustomProjectRequestById);
router.put(
  "/admin/:id",
  protect,
  adminOnly,
  [
    body("status")
      .trim()
      .isIn(["pending", "reviewed", "quoted", "accepted", "declined", "link_sent", "approved", "rejected"])
      .withMessage("Invalid status value"),
    body("quotationPrice")
      .optional({ nullable: true, checkFalsy: true })
      .isFloat({ min: 0 })
      .withMessage("Quotation price must be a non-negative number"),
    body("adminMessage")
      .optional({ nullable: true })
      .isLength({ max: 4000 })
      .withMessage("Admin message can be at most 4000 characters"),
    body("quoteValidUntil")
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601()
      .withMessage("Quote valid until must be a valid date"),
  ],
  validateRequest,
  updateAdminCustomProjectRequest
);

router.put(
  "/admin/:id/purchase-link",
  protect,
  adminOnly,
  [
    body("purchaseLink")
      .trim()
      .isURL()
      .withMessage("Purchase link must be a valid URL"),
    body("purchaseLinkMessage")
      .optional({ nullable: true })
      .isLength({ max: 1000 })
      .withMessage("Purchase link message can be at most 1000 characters"),
  ],
  validateRequest,
  sendCustomProjectPurchaseLink
);

router.delete("/admin/:id", protect, adminOnly, adminDeleteCustomProjectRequest);

export default router;
