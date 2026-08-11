export const listPaths = {
  "/api/v1/boards/{boardId}/lists": {
    get: {
      summary: "List all active lists on a board",
      tags: ["Lists"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "boardId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Active lists retrieved" }
      }
    },
    post: {
      summary: "Create a new list on a board",
      tags: ["Lists"],
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
                name: { type: "string", example: "In Progress" },
                position: { type: "integer", example: 0 }
              }
            }
          }
        }
      },
      responses: {
        201: { description: "List created successfully" }
      }
    }
  },
  "/api/v1/lists/{listId}": {
    patch: {
      summary: "Rename a list",
      tags: ["Lists"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "listId", in: "path", required: true, schema: { type: "string" } }
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name"],
              properties: {
                name: { type: "string", example: "Completed Tasks" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "List renamed successfully" }
      }
    },
    delete: {
      summary: "Soft delete a list",
      tags: ["Lists"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "listId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "List deleted successfully" }
      }
    }
  },
  "/api/v1/lists/{listId}/reorder": {
    post: {
      summary: "Reorder list position on board",
      tags: ["Lists"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "listId", in: "path", required: true, schema: { type: "string" } }
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["position"],
              properties: {
                position: { type: "integer", example: 2 }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "List reordered successfully" }
      }
    }
  }
};
