/**
 * Unified API Response Formatter Class
 */
class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('2') ? 'success' : 'fail';
    this.message = message;
    this.data = data;
  }

  /**
   * Send the JSON response to the Express client
   */
  send(res) {
    return res.status(this.statusCode).json({
      status: this.status,
      message: this.message,
      data: this.data,
    });
  }

  /**
   * Standard 200 OK Success Factory
   */
  static success(res, data = null, message = 'Success') {
    return new ApiResponse(200, data, message).send(res);
  }

  /**
   * Standard 201 Created Success Factory
   */
  static created(res, data = null, message = 'Resource created successfully') {
    return new ApiResponse(201, data, message).send(res);
  }
}

export default ApiResponse;
