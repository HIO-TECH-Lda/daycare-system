export interface PaginationParams {
  page: number;
  limit: number;
  total: number;
}

export class ApiResponse {
  public statusCode: number;
  public data: any;
  public message: string;
  public success: boolean;

  constructor(statusCode: number, data: any, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }

  // Static helper for success responses
  static success<T>(data: T, message = 'Operação realizada com sucesso', _statusCode = 200) {
    return {
      success: true,
      message,
      data
    };
  }

  // Static helper for paginated responses
  static paginated<T>(
    data: T[],
    pagination: PaginationParams,
    message = 'Dados recuperados com sucesso',
    _statusCode = 200
  ) {
    return {
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: Math.ceil(pagination.total / pagination.limit)
      }
    };
  }

  // Static helper for error responses
  static error(message: string, _statusCode = 400, error?: string) {
    return {
      success: false,
      message,
      error
    };
  }
}

export default ApiResponse;
