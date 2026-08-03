import AuthRoutes from "../modules/auth/auth.routes";
import WorkspaceRoutes from "../modules/workspace/workspace.routes.js";
import express from "express";

const router = express.Router()

router.use("/auth", AuthRoutes);
router.use("/workspaces", WorkspaceRoutes);

export default router;