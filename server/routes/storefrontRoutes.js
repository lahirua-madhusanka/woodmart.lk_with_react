import express from "express";
import { getStorefrontSettings } from "../controllers/storefrontController.js";
import { getStorefrontBanners } from "../controllers/bannerController.js";

const router = express.Router();

router.get("/settings", getStorefrontSettings);
router.get("/banners", getStorefrontBanners);

export default router;
