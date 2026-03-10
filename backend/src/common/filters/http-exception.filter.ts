import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// 统一错误码映射
const ERROR_CODES: Record<number, number> = {
  400: 10001, // 请求参数错误
  401: 10002, // 未授权
  403: 10003, // 权限不足
  404: 10004, // 资源不存在
  409: 10005, // 资源冲突
  422: 10006, // 数据验证失败
  429: 10007, // 请求过于频繁
  500: 50000, // 服务器内部错误
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';
    let code = 50000;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || message;
      if (Array.isArray(message)) {
        message = message[0];
      }
      code = ERROR_CODES[status] || status;
    } else {
      this.logger.error(
        `未捕获异常: ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      code,
      message,
      data: null,
      timestamp: Date.now(),
    });
  }
}
