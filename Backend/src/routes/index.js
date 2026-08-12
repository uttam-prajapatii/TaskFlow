import AuthRoutes from "../modules/auth/auth.routes.js";
import WorkspaceRoutes from "../modules/workspace/workspace.routes.js";
import BoardRoutes from "../modules/board/board.routes.js";
import ListRoutes from "../modules/list/list.routes.js";
import TaskRoutes from "../modules/task/task.routes.js";
import NotificationRoutes from "../modules/notification/notification.routes.js";
import CommentRoutes from "../modules/comment/comment.routes.js";
import LabelRoutes from "../modules/label/label.routes.js";
import express from "express";

const router = express.Router()

router.use("/auth", AuthRoutes);
router.use("/workspaces", WorkspaceRoutes);
router.use("/notifications", NotificationRoutes);
router.use("/", BoardRoutes);
router.use("/", ListRoutes);
router.use("/", TaskRoutes);
router.use("/", CommentRoutes);
router.use("/", LabelRoutes);

export default router;