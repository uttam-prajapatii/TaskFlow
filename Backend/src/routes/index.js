import AuthRoutes from "../modules/auth/auth.routes";
import WorkspaceRoutes from "../modules/workspace/workspace.routes.js";
import BoardRoutes from "../modules/board/board.routes.js";
import ListRoutes from "../modules/list/list.routes.js";
import express from "express";

const router = express.Router()

router.use("/auth", AuthRoutes);
router.use("/workspaces", WorkspaceRoutes);
router.use("/", BoardRoutes);
router.use("/", ListRoutes);

export default router;