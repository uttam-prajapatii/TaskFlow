export const workspacePaths = {
  "/api/v1/workspaces": {
    get: {
      summary: "List user workspaces",
      tags: ["Workspaces"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        { name: "view", in: "query", schema: { type: "string", enum: ["compact", "full"], default: "full" } }
      ],
      responses: {
        200: { description: "Workspaces list retrieved" }
      }
    },
    post: {
      summary: "Create a new workspace",
      tags: ["Workspaces"],
      security: [{ cookieAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name"],
              properties: {
                name: { type: "string", example: "Product Team" },
                description: { type: "string", example: "Workspace for planning product roadmap" }
              }
            }
          }
        }
      },
      responses: {
        201: { description: "Workspace created successfully" }
      }
    }
  },
  "/api/v1/workspaces/{workspaceId}": {
    get: {
      summary: "Get workspace details",
      tags: ["Workspaces"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "workspaceId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Workspace details retrieved" }
      }
    },
    patch: {
      summary: "Update workspace details",
      tags: ["Workspaces"],
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
              properties: {
                name: { type: "string", example: "Updated Team Name" },
                description: { type: "string", example: "Updated description text" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Workspace updated successfully" }
      }
    },
    delete: {
      summary: "Soft delete a workspace",
      tags: ["Workspaces"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "workspaceId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Workspace deleted successfully" }
      }
    }
  },
  "/api/v1/workspaces/{workspaceId}/activity-logs": {
    get: {
      summary: "Get workspace activity audit logs",
      tags: ["Workspaces"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "workspaceId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Audit trail retrieved" }
      }
    }
  },
  "/api/v1/workspaces/{workspaceId}/analytics": {
    get: {
      summary: "Get workspace analytics dashboard metrics",
      tags: ["Workspaces"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "workspaceId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Workspace analytics data" }
      }
    }
  },
  "/api/v1/workspaces/{workspaceId}/members": {
    get: {
      summary: "List all members of a workspace",
      tags: ["Workspace Members"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "workspaceId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Members list" }
      }
    }
  },
  "/api/v1/workspaces/{workspaceId}/invites": {
    get: {
      summary: "List pending member invites",
      tags: ["Workspace Members"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "workspaceId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Pending invites list" }
      }
    },
    post: {
      summary: "Invite a new member to the workspace",
      tags: ["Workspace Members"],
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
              required: ["email"],
              properties: {
                email: { type: "string", format: "email", example: "newmember@example.com" },
                role: { type: "string", enum: ["admin", "member", "viewer"], default: "member" }
              }
            }
          }
        }
      },
      responses: {
        201: { description: "Invite sent successfully" }
      }
    }
  },
  "/api/v1/workspaces/{workspaceId}/invites/{inviteId}": {
    delete: {
      summary: "Revoke/cancel a pending invite",
      tags: ["Workspace Members"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "workspaceId", in: "path", required: true, schema: { type: "string" } },
        { name: "inviteId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Invite revoked successfully" }
      }
    }
  },
  "/api/v1/workspaces/invite/accept": {
    post: {
      summary: "Accept workspace invitation link",
      tags: ["Workspace Members"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["token"],
              properties: {
                token: { type: "string", example: "invite-token-value" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Joined workspace successfully" }
      }
    }
  },
  "/api/v1/workspaces/{workspaceId}/members/{userId}/role": {
    patch: {
      summary: "Change workspace member role",
      tags: ["Workspace Members"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "workspaceId", in: "path", required: true, schema: { type: "string" } },
        { name: "userId", in: "path", required: true, schema: { type: "string" } }
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["role"],
              properties: {
                role: { type: "string", enum: ["admin", "member", "viewer"] }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Member role updated successfully" }
      }
    }
  },
  "/api/v1/workspaces/{workspaceId}/members/{userId}": {
    delete: {
      summary: "Remove member from workspace",
      tags: ["Workspace Members"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "workspaceId", in: "path", required: true, schema: { type: "string" } },
        { name: "userId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Member removed" }
      }
    }
  },
  "/api/v1/workspaces/{workspaceId}/leave": {
    post: {
      summary: "Leave workspace",
      tags: ["Workspace Members"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "workspaceId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Left workspace successfully" }
      }
    }
  }
};
