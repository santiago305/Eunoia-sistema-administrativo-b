import {
  Controller,
  Post,
  Body,
  Res,
  Get,
  UseGuards,
  HttpCode,
  Req,
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
import { ErrorResponse, isTypeResponse } from 'src/shared/response-standard/guard';
import { successResponse } from 'src/shared/response-standard/response';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { VerifyUserPasswordBySessionUseCase } from 'src/modules/auth/application/use-cases/verify-user-password-by-session.usecase';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginAuthUseCase: LoginAuthUseCase,
    private readonly registerAuthUseCase: RegisterAuthUseCase,
    private readonly refreshAuthUseCase: RefreshAuthUseCase,
    private readonly getAuthUserUseCase: GetAuthUserUseCase,
    private readonly verifyUserPasswordBySessionUseCase: VerifyUserPasswordBySessionUseCase,


  ) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginAuthDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string } | ErrorResponse> {
    const deviceName = (req.headers['x-device-name'] as string | undefined) ?? null;
    const userAgent = (req.headers['x-user-agent'] as string | undefined) ?? req.headers['user-agent'] ?? null;
    const ip = (req.headers['x-forwarded-for'] as string | undefined) ?? req.ip ?? null;

    const result = await this.loginAuthUseCase.execute({
      dto,
      ip,
      userAgent: userAgent as string | null,
      deviceName,
    });
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
    @Res({ passthrough: true }) res: Response,
  ) {
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
    const result = await this.refreshAuthUseCase.execute({
      user,
      refreshToken: req.cookies?.refresh_token ?? '',
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
  ) {
    return this.verifyUserPasswordBySessionUseCase.execute({
      userId: user.id,
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
