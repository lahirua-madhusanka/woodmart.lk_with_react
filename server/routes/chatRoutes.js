import express from "express";
import { body } from "express-validator";
import {
  getAdminConversationMessages,
  getAdminConversations,
  getAdminUnreadCount,
  getMyConversation,
  markAdminConversationRead,
  sendAdminMessage,
  sendMyMessage,
} from "../controllers/chatController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateMiddleware.js";

const router = express.Router();

router.use(protect);

const messageValidators = [
  body("text")
    .trim()
    .notEmpty()
    .withMessage("Message text is required")
    .isLength({ max: 2000 })
    .withMessage("Message can be at most 2000 characters"),
];

router.get("/me", getMyConversation);
router.post("/me/messages", messageValidators, validateRequest, sendMyMessage);

router.get("/admin/unread-count", adminOnly, getAdminUnreadCount);
router.get("/admin/conversations", adminOnly, getAdminConversations);
router.get("/admin/conversations/:id/messages", adminOnly, getAdminConversationMessages);
router.post(
  "/admin/conversations/:id/messages",
  adminOnly,
  messageValidators,
  validateRequest,
  sendAdminMessage
);
router.put("/admin/conversations/:id/read", adminOnly, markAdminConversationRead);

export default router;
