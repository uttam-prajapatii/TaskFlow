export const commentPaths = {
  "/api/v1/tasks/{taskId}/comments": {
    get: {
      summary: "Get task discussion board comments",
      tags: ["Comments"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "taskId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Comments list retrieved successfully" }
      }
    },
    post: {
      summary: "Add a discussion comment",
      tags: ["Comments"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "taskId", in: "path", required: true, schema: { type: "string" } }
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["body"],
              properties: {
                body: { type: "string", example: "Check this out @Member" },
                mentions: {
                  type: "array",
                  items: { type: "string" },
                  example: ["assignee-user-id"]
                }
              }
            }
          }
        }
      },
      responses: {
        201: { description: "Comment added successfully" }
      }
    }
  },
  "/api/v1/tasks/{taskId}/comments/{commentId}": {
    patch: {
      summary: "Update discussion comment text",
      tags: ["Comments"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "taskId", in: "path", required: true, schema: { type: "string" } },
        { name: "commentId", in: "path", required: true, schema: { type: "string" } }
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["body"],
              properties: {
                body: { type: "string", example: "Updated comment text here" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Comment updated successfully" }
      }
    },
    delete: {
      summary: "Delete discussion comment",
      tags: ["Comments"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "taskId", in: "path", required: true, schema: { type: "string" } },
        { name: "commentId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Comment deleted successfully" }
      }
    }
  }
};
