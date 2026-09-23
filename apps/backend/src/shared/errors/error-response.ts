export interface ErrorResponseBody {
  statusCode: number;
  message: string;
  errors?: string[];
  timestamp: string;
  path: string;
}
