import {
  Controller,
  Post,
  Body,
  Res,
  Get,
  UseGuards,
  HttpCode,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtRefreshAuthGuard } from '../guards/jwt-refresh-auth.guard';
import { User as UserDecorator } from 'src/shared/utilidades/decorators';
import { LoginAuthUseCase } from 'src/modules/auth/application/use-cases/login-auth.usecase';
import { RefreshAuthUseCase } from 'src/modules/auth/application/use-cases/refresh.auth.usecase';
import { RegisterAuthUseCase } from 'src/modules/auth/application/use-cases/register-auth.usecase';
import { GetAuthUserUseCase } from 'src/modules/auth/application/use-cases/get-auth-user.usecase';
import { LoginAuthDto } from '../dtos/login-auth.dto';
import { Request, Response } from 'express';
// import { CreateUserDto } from 'src/modules/users/adapters/in/dtos/create-user.dto';
import { RevokeSessionByDeviceUseCase } from 'src/modules/sessions/application/use-cases/revoke-session-by-device.usecase';
import { ErrorResponse, isTypeResponse } from 'src/shared/response-standard/guard';
import { successResponse } from 'src/shared/response-standard/response';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { getDeviceIdOrThrow, getOrCreateDeviceId } from 'src/shared/utilidades/utils/getOrCreateDeviceId.util'
import { VerifyUserPasswordBySessionUseCase } from 'src/modules/auth/application/use-cases/verify-user-password-by-session.usecase';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginAuthUseCase: LoginAuthUseCase,
    private readonly registerAuthUseCase: RegisterAuthUseCase,
    private readonly refreshAuthUseCase: RefreshAuthUseCase,
    private readonly getAuthUserUseCase: GetAuthUserUseCase,
    private readonly revokeSessionByDeviceUseCase: RevokeSessionByDeviceUseCase,
    private readonly verifyUserPasswordBySessionUseCase: VerifyUserPasswordBySessionUseCase,


  ) {}
  // Registro deshabilitado temporalmente; se reactivara cuando el flujo este definido.
  /*
  @Post('register')
  async register(
    @Body() dto: CreateUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.registerAuthUseCase.execute(dto);
    if (isTypeResponse(result)) return result;

    const { access_token, refresh_token } = result;

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: false, // pon en true en prod
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    });

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000, // 1 hora
    });

    return { access_token };
  }
  */

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginAuthDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string } | ErrorResponse> {


    const deviceId = getOrCreateDeviceId(req, res);
    const deviceName = (req.headers['x-device-name'] as string) ?? null;
    const userAgent = (req.headers['x-user-agent'] as string) ?? req.headers['user-agent'] ?? null;
    const ipAddress = req.ip || req.socket?.remoteAddress || null;

    if (!deviceId) {
      throw new UnauthorizedException('DeviceId faltante (header x-device-id)');
    }
    console.log(deviceId, 'deviceId');
    
    const result = await this.loginAuthUseCase.execute(
     { dto,
      deviceId,
      deviceName,
      userAgent,
      ipAddress}
    );
    if (isTypeResponse(result)) return result;

    const { access_token, refresh_token } = result;
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000,
    });

    return { message: 'OK' };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @UserDecorator() user: { id: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const deviceId = getDeviceIdOrThrow(req);
    if (!deviceId) {
      throw new UnauthorizedException('DeviceId faltante (header x-device-id)');
    }
    await this.revokeSessionByDeviceUseCase.execute(user.id, deviceId);

    res.clearCookie('refresh_token');
    res.clearCookie('access_token');
    return successResponse('Sesion cerrada correctamente');
  }

  // REFRESH TOKEN
  @UseGuards(JwtRefreshAuthGuard)
  @Get('refresh')
  async refresh(
    @UserDecorator() user: any, // puede venir con userId o sub
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refresh_token'];
    const deviceId = getDeviceIdOrThrow(req);

    if (!refreshToken) {
      throw new UnauthorizedException('refresh_token faltante (cookie)');
    }
    if (!deviceId) {
      throw new UnauthorizedException('DeviceId faltante (header x-device-id)');
    }
    const result = await this.refreshAuthUseCase.execute({
      user,
      deviceId,
      refreshToken,
    });

    if (isTypeResponse(result)) return result;

    const { access_token, refresh_token } = result;

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000, // 1h
    });

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { message: 'OK' };
  }

  
  @Post('verify-password')
  @UseGuards(JwtAuthGuard)
  async verifyPassword(
    @UserDecorator() user: { id: string },
    @Body() body: { currentPassword: string },
    @Req() req: Request,
  ) {
    const deviceId = getDeviceIdOrThrow(req);
    return this.verifyUserPasswordBySessionUseCase.execute({
      userId: user.id,
      deviceId,
      password: body.currentPassword,
    });
  }

  @Get('validate-token')
  @UseGuards(JwtAuthGuard)
  async validateToken(@Res() res: Response) {
    return res.status(200).json({ message: 'Token es valido' });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getAuthUser(@UserDecorator() user: { id: string; role: string }) {
    return this.getAuthUserUseCase.execute(user);
  }
}
