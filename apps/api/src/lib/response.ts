import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
  });
}

export function sendError(res: Response, error: string, statusCode = 400): void {
  res.status(statusCode).json({
    success: false,
    error,
  });
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  pageSize: number
): void {
  res.status(200).json({
    success: true,
    data,
    total,
    page,
    pageSize,
  });
}
