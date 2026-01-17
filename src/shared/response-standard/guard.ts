import { status } from '../constantes/constants';

export type ErrorResponse =
  | { type: status.ERROR; message: string }
  | { type: status.INVALID; message: string }
  | { type: status.UNAUTHORIZED; message: string }
  | { type: status.WARNING; message: string };

export function isTypeResponse(response: unknown): response is ErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'type' in response &&
    Object.values(status).includes((response as any).type)
  );
}
