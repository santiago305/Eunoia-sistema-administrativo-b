import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorador para extraer el usuario autenticado desde el request (inyectado por el JwtStrategy).
 *
 * @returns El objeto `user` que fue incluido en el `validate()` del JWT strategy.
 *
 * @example
 * ```ts
 * @Get('profile')
 * getProfile(@User() user) {
 *   return user;
 * }
 * ```
 */
export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    // Este `user` fue insertado por JwtStrategy.validate()
    return request.user || null; // Devuelve null si no estA logueado (opcional)
  },
);

