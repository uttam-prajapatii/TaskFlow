export const labelPaths = {
  "/api/v1/boards/{boardId}/labels": {
    get: {
      summary: "Get all labels on a board",
      tags: ["Labels"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "boardId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Labels retrieved successfully" },
        401: { description: "Unauthorized" }
      }
    },
    post: {
      summary: "Create a new label on a board",
      tags: ["Labels"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "boardId", in: "path", required: true, schema: { type: "string" } }
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name"],
              properties: {
                name: { type: "string", example: "Bug" },
                color: { type: "string", example: "#FF5733" }
              }
            }
          }
        }
      },
      responses: {
        201: { description: "Label created successfully" },
        400: { description: "Label name already exists or invalid color hex code" },
        401: { description: "Unauthorized" }
      }
    }
  },
  "/api/v1/labels/{labelId}": {
    patch: {
      summary: "Update an existing label details",
      tags: ["Labels"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "labelId", in: "path", required: true, schema: { type: "string" } }
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string", example: "Critical Bug" },
                color: { type: "string", example: "#D93F3F" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Label updated successfully" },
        400: { description: "Label name already exists on this board or invalid color hex code" },
        401: { description: "Unauthorized" },
        444: { description: "Label not found" }
      }
    },
    delete: {
      summary: "Delete a label and remove association from tasks",
      tags: ["Labels"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "labelId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Label deleted successfully" },
        401: { description: "Unauthorized" },
        444: { description: "Label not found" }
      }
    }
  },
  "/api/v1/tasks/{taskId}/labels": {
    post: {
      summary: "Attach a label to a task card",
      tags: ["Tasks"],
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
              required: ["labelId"],
              properties: {
                labelId: { type: "string", example: "60d0fe4f5311236168a109ca" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Label attached to task successfully" },
        400: { description: "Label already attached or not found on this board" },
        401: { description: "Unauthorized" }
      }
    }
  },
  "/api/v1/tasks/{taskId}/labels/{labelId}": {
    delete: {
      summary: "Remove a label association from a task card",
      tags: ["Tasks"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "taskId", in: "path", required: true, schema: { type: "string" } },
        { name: "labelId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Label removed from task successfully" },
        400: { description: "Label not attached to task" },
        401: { description: "Unauthorized" }
      }
    }
  }
};
