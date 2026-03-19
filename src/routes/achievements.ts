import { Router } from "express";
import { createSuggestion } from "../controllers/achievementsController";

const router = Router();

router.post("/suggestions", createSuggestion);

export default router;
