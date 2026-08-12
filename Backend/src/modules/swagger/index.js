import { authPaths } from './auth.swagger.js';
import { workspacePaths } from './workspace.swagger.js';
import { boardPaths } from './board.swagger.js';
import { listPaths } from './list.swagger.js';
import { taskPaths } from './task.swagger.js';
import { commentPaths } from './comment.swagger.js';
import { notificationPaths } from './notification.swagger.js';
import { labelPaths } from './label.swagger.js';

export const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "TaskFlow API Documentation",
    version: "1.0.0",
    description: "Modular API endpoints documentation for TaskFlow task management application. Supports cookies-based authorization."
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Development Server"
    }
  ],
  paths: {
    ...authPaths,
    ...workspacePaths,
    ...boardPaths,
    ...listPaths,
    ...taskPaths,
    ...commentPaths,
    ...notificationPaths,
    ...labelPaths
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "accessToken"
      }
    }
  }
};
