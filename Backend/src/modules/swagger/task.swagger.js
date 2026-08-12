export const taskPaths = {
  "/api/v1/lists/{listId}/tasks": {
    post: {
      summary: "Create a new task",
      tags: ["Tasks"],
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
              required: ["title"],
              properties: {
                title: { type: "string", example: "Integrate APIs" },
                description: { type: "string", example: "Connect UI to Swagger API" },
                priority: { type: "string", enum: ["low", "medium", "high", "urgent"], default: "medium" },
                dueDate: { type: "string", format: "date-time" }
              }
            }
          }
        }
      },
      responses: {
        201: { description: "Task created successfully" }
      }
    }
  },
  "/api/v1/boards/{boardId}/tasks": {
    get: {
      summary: "Filter or search board tasks",
      tags: ["Tasks"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "boardId", in: "path", required: true, schema: { type: "string" } },
        { name: "listId", in: "query", schema: { type: "string" } },
        { name: "priority", in: "query", schema: { type: "string" } },
        { name: "assigneeId", in: "query", schema: { type: "string" } },
        { name: "dueBefore", in: "query", schema: { type: "string", format: "date-time" } }
      ],
      responses: {
        200: { description: "Tasks list" }
      }
    }
  },
  "/api/v1/tasks/{taskId}": {
    get: {
      summary: "Get task details",
      tags: ["Tasks"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "taskId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Task details retrieved" }
      }
    },
    patch: {
      summary: "Update task fields",
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
              properties: {
                title: { type: "string", example: "Updated Task Title" },
                description: { type: "string" },
                priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                dueDate: { type: "string", format: "date-time" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Task updated successfully" }
      }
    },
    delete: {
      summary: "Soft delete a task",
      tags: ["Tasks"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "taskId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Task deleted successfully (stored for 30 days)" }
      }
    }
  },
  "/api/v1/tasks/{taskId}/archive": {
    post: {
      summary: "Archive task",
      tags: ["Tasks"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "taskId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Task archived" }
      }
    }
  },
  "/api/v1/tasks/{taskId}/restore": {
    post: {
      summary: "Restore archived task",
      tags: ["Tasks"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "taskId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Task restored successfully" }
      }
    }
  },
  "/api/v1/tasks/{taskId}/checklist": {
    patch: {
      summary: "Add, update or remove checklist item",
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
              required: ["action"],
              properties: {
                action: { type: "string", enum: ["add", "update", "remove"] },
                text: { type: "string", example: "Write tests" },
                itemId: { type: "string", example: "checklist-item-id" },
                isDone: { type: "boolean" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Checklist updated" }
      }
    }
  },
  "/api/v1/tasks/{taskId}/assignees": {
    post: {
      summary: "Assign member to task",
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
              required: ["userId"],
              properties: {
                userId: { type: "string", example: "assignee-user-id" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Assignee added" }
      }
    }
  },
  "/api/v1/tasks/{taskId}/assignees/{assigneeUserId}": {
    delete: {
      summary: "Unassign member from task",
      tags: ["Tasks"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "taskId", in: "path", required: true, schema: { type: "string" } },
        { name: "assigneeUserId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Assignee removed" }
      }
    }
  },
  "/api/v1/tasks/{taskId}/attachments": {
    post: {
      summary: "Upload task file attachment",
      tags: ["Tasks"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "taskId", in: "path", required: true, schema: { type: "string" } }
      ],
      requestBody: {
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                file: { type: "string", format: "binary" }
              }
            }
          }
        }
      },
      responses: {
        201: { description: "Attachment uploaded successfully" }
      }
    }
  },
  "/api/v1/tasks/{taskId}/attachments/{attachmentId}": {
    delete: {
      summary: "Delete file attachment",
      tags: ["Tasks"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "taskId", in: "path", required: true, schema: { type: "string" } },
        { name: "attachmentId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Attachment deleted" }
      }
    }
  },
  "/api/v1/boards/{boardId}/tasks/search": {
    get: {
      summary: "Filter or search board tasks (extended options)",
      tags: ["Tasks"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "boardId", in: "path", required: true, schema: { type: "string" } },
        { name: "q", in: "query", schema: { type: "string" } },
        { name: "listId", in: "query", schema: { type: "string" } },
        { name: "priority", in: "query", schema: { type: "string" } },
        { name: "assigneeId", in: "query", schema: { type: "string" } },
        { name: "label", in: "query", schema: { type: "string" } },
        { name: "dueBefore", in: "query", schema: { type: "string", format: "date-time" } },
        { name: "isArchived", in: "query", schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Search results list" }
      }
    }
  },
  "/api/v1/tasks/{taskId}/move": {
    patch: {
      summary: "Move task position or column",
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
              properties: {
                listId: { type: "string", example: "60d0fe4f5311236168a109ca" },
                position: { type: "integer", example: 1 }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Task moved successfully" }
      }
    }
  }
};
