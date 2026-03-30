import { body } from "express-validator";
import express from "express";
import multer from "multer";
import {
  addReview,
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  uploadProductImages,
  updateProduct,
} from "../controllers/productController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateMiddleware.js";

const router = express.Router();
const MAX_PRODUCT_IMAGES = 6;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: MAX_PRODUCT_IMAGES,
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      return cb(null, true);
    }
    return cb(new Error("Only image files are allowed"));
  },
});

router.get("/", getProducts);
router.post("/upload-images", protect, adminOnly, upload.array("images", MAX_PRODUCT_IMAGES), uploadProductImages);
router.get("/:id", getProductById);

router.post(
  "/",
  protect,
  adminOnly,
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("description").notEmpty().withMessage("Description is required"),
    body("price").isFloat({ min: 0 }).withMessage("Price must be positive"),
    body("category").notEmpty().withMessage("Category is required"),
    body("images")
      .isArray({ min: 1, max: MAX_PRODUCT_IMAGES })
      .withMessage("At least one image is required and maximum is 6"),
    body("images.*").isString().notEmpty().withMessage("Each image must be a valid URL"),
    body("stock").isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),
    body("discountPrice")
      .optional({ nullable: true })
      .isFloat({ min: 0 })
      .withMessage("Discount price must be positive"),
    body("productCost")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Product cost must be a non-negative value"),
    body("shippingPrice")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Shipping price must be a non-negative value"),
    body("sku").optional({ nullable: true }).isString(),
    body("brand").optional().isString(),
    body("featured").optional().isBoolean(),
    body("status")
      .optional()
      .isIn(["draft", "active", "archived"])
      .withMessage("Invalid status"),
  ],
  validateRequest,
  createProduct
);

router.put("/:id", protect, adminOnly, updateProduct);
router.delete("/:id", protect, adminOnly, deleteProduct);

router.post(
  "/:id/reviews",
  protect,
  [
    body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
    body("comment").trim().notEmpty().withMessage("Comment is required"),
  ],
  validateRequest,
  addReview
);

export default router;
