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
};
