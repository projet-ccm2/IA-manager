import { Router } from "express";
import { adviceForAchievement } from "../controllers/requestController";

const router = Router();
router.post("/adviceForAchievement", adviceForAchievement);

export default router;
