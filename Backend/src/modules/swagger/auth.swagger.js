export const authPaths = {
  "/api/v1/auth/register": {
    post: {
      summary: "Register a new user",
      tags: ["Authentication"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["fullName", "email", "password"],
              properties: {
                fullName: { type: "string", example: "John Doe" },
                email: { type: "string", format: "email", example: "john@example.com" },
                password: { type: "string", example: "Password123!" }
              }
            }
          }
        }
      },
      responses: {
        201: { description: "User registered successfully, OTP sent" },
        400: { description: "Bad Request" }
      }
    }
  },
  "/api/v1/auth/verify-otp": {
    post: {
      summary: "Verify email with OTP",
      tags: ["Authentication"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "otp"],
              properties: {
                email: { type: "string", format: "email", example: "john@example.com" },
                otp: { type: "string", example: "123456" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Email verified, account activated" },
        400: { description: "Invalid or expired OTP" }
      }
    }
  },
  "/api/v1/auth/resend-otp": {
    post: {
      summary: "Resend verification OTP",
      tags: ["Authentication"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email"],
              properties: {
                email: { type: "string", format: "email", example: "john@example.com" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "OTP sent successfully" }
      }
    }
  },
  "/api/v1/auth/login": {
    post: {
      summary: "Login user",
      tags: ["Authentication"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "password"],
              properties: {
                email: { type: "string", format: "email", example: "john@example.com" },
                password: { type: "string", example: "Password123!" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Logged in successfully, cookies set" },
        401: { description: "Unauthorized" }
      }
    }
  },
  "/api/v1/auth/refresh": {
    post: {
      summary: "Refresh session token",
      tags: ["Authentication"],
      responses: {
        200: { description: "Tokens rotated" },
        401: { description: "Invalid session" }
      }
    }
  },
  "/api/v1/auth/logout": {
    post: {
      summary: "Logout user",
      tags: ["Authentication"],
      responses: {
        200: { description: "Logged out successfully" }
      }
    }
  },
  "/api/v1/auth/me": {
    get: {
      summary: "Get current user details",
      tags: ["Authentication"],
      security: [{ cookieAuth: [] }],
      responses: {
        200: { description: "Retrieved successfully" },
        401: { description: "Unauthorized" }
      }
    },
    patch: {
      summary: "Update user profile details",
      tags: ["Authentication"],
      security: [{ cookieAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                fullName: { type: "string", example: "John Doe Updated" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Profile updated successfully" },
        400: { description: "Invalid input" },
        401: { description: "Unauthorized" }
      }
    }
  },
  "/api/v1/auth/update-password": {
    patch: {
      summary: "Change current password",
      tags: ["Authentication"],
      security: [{ cookieAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["currentPassword", "newPassword"],
              properties: {
                currentPassword: { type: "string", example: "OldPassword123!" },
                newPassword: { type: "string", example: "NewPassword123!" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Password changed successfully" },
        400: { description: "Incorrect current password or weak new password" },
        401: { description: "Unauthorized" }
      }
    }
  },
  "/api/v1/auth/forgot-password": {
    post: {
      summary: "Request password reset email link",
      tags: ["Authentication"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email"],
              properties: {
                email: { type: "string", format: "email", example: "john@example.com" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Email reset instruction queued" },
        400: { description: "Invalid email" }
      }
    }
  },
  "/api/v1/auth/reset-password/{token}": {
    post: {
      summary: "Reset password using reset token link",
      tags: ["Authentication"],
      parameters: [
        {
          name: "token",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Password reset token sent via email"
        }
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["newPassword"],
              properties: {
                newPassword: { type: "string", example: "NewlySetPassword123!" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Password reset successfully completed" },
        400: { description: "Invalid or expired token" }
      }
    }
  }
};
