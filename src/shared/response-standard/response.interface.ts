import { status } from '../constantes/constants';

export interface SuccessResponse<T = any> {
  type: status.SUCCESS;
  message: string;
  data?: T;
}

export interface ErrorResponse {
  type: status.ERROR;
  message: string;
}

export interface WarningResponse {
  type: status.WARNING;
  message: string;
}

export interface InfoResponse {
  type: status.INFO;
  message: string;
}
export interface InvalidResponse {
  type: status.INVALID;
  message: string;
}
