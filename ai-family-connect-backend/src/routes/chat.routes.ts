import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import { getHistory } from "../controllers/chat.controller";

const router = Router();
router.use(protect);

router.get("/:familyId/history", getHistory);

export default router;
