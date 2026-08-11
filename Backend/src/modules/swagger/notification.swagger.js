export const notificationPaths = {
  "/api/v1/notifications": {
    get: {
      summary: "List user in-app alerts",
      tags: ["Notifications"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "isRead", in: "query", schema: { type: "string", enum: ["true", "false"] } },
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
      ],
      responses: {
        200: { description: "List of notifications" }
      }
    }
  },
  "/api/v1/notifications/{notificationId}/read": {
    patch: {
      summary: "Mark notification as read",
      tags: ["Notifications"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "notificationId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Notification marked read" }
      }
    }
  },
  "/api/v1/notifications/read-all": {
    post: {
      summary: "Mark all notifications as read",
      tags: ["Notifications"],
      security: [{ cookieAuth: [] }],
      responses: {
        200: { description: "All notifications marked read" }
      }
    }
  },
  "/api/v1/notifications/{notificationId}": {
    delete: {
      summary: "Delete notification alert",
      tags: ["Notifications"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "notificationId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Notification deleted" }
      }
    }
  }
};
