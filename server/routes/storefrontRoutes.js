import express from "express";
import { getStorefrontSettings } from "../controllers/storefrontController.js";

const router = express.Router();

router.get("/settings", getStorefrontSettings);

export default router;
