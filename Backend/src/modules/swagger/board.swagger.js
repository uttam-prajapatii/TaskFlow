export const boardPaths = {
  "/api/v1/workspaces/{workspaceId}/boards": {
    get: {
      summary: "List all boards in a workspace",
      tags: ["Boards"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "workspaceId", in: "path", required: true, schema: { type: "string" } },
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
      ],
      responses: {
        200: { description: "Boards list retrieved" }
      }
    },
    post: {
      summary: "Create a new board",
      tags: ["Boards"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "workspaceId", in: "path", required: true, schema: { type: "string" } }
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name"],
              properties: {
                name: { type: "string", example: "Sprint Board" },
                visibility: { type: "string", enum: ["workspace", "private"], default: "workspace" }
              }
            }
          }
        }
      },
      responses: {
        201: { description: "Board created successfully" }
      }
    }
  },
  "/api/v1/boards/{boardId}": {
    get: {
      summary: "Get board details",
      tags: ["Boards"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "boardId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Board details retrieved" }
      }
    },
    patch: {
      summary: "Update board details",
      tags: ["Boards"],
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
              properties: {
                name: { type: "string", example: "Updated Board Title" },
                visibility: { type: "string", enum: ["workspace", "private"] }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Board updated successfully" }
      }
    },
    delete: {
      summary: "Soft delete a board",
      tags: ["Boards"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "boardId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Board deleted successfully" }
      }
    }
  },
  "/api/v1/boards/{boardId}/archive": {
    post: {
      summary: "Archive a board",
      tags: ["Boards"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "boardId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Board archived successfully" }
      }
    }
  },
  "/api/v1/boards/{boardId}/restore": {
    post: {
      summary: "Restore an archived board",
      tags: ["Boards"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "boardId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Board restored successfully" }
      }
    }
  }
};
