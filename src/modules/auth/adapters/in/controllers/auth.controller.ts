import {
  Controller,
  Post,
  Body,
  Res,
  Get,
  UseGuards,
} from '@nestjs/common';
import { JwtRefreshAuthGuard } from '../guards/jwt-refresh-auth.guard';
import { User as UserDecorator } from 'src/shared/utilidades/decorators';
import { LoginAuthUseCase } from 'src/modules/auth/application/use-cases/login-auth.usecase';
import { RefreshAuthUseCase } from 'src/modules/auth/application/use-cases/refresh.auth.usecase';
import { RegisterAuthUseCase } from 'src/modules/auth/application/use-cases/register-auth.usecase';
import { LoginAuthDto } from '../dtos/login-auth.dto';
import { Response } from 'express';
// import { CreateUserDto } from 'src/modules/users/adapters/in/dtos/create-user.dto';
import { ErrorResponse, isTypeResponse } from 'src/shared/response-standard/guard';
import { successResponse } from 'src/shared/response-standard/response';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginAuthUseCase: LoginAuthUseCase,
    private readonly registerAuthUseCase: RegisterAuthUseCase,
    private readonly refreshAuthUseCase: RefreshAuthUseCase,
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
  async login(
    @Body() dto: LoginAuthDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ access_token: string } | ErrorResponse> {
    const result = await this.loginAuthUseCase.execute(dto);
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

    return { access_token };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refresh_token');
    res.clearCookie('access_token');
    return successResponse('Sesion cerrada correctamente');
  }

  // REFRESH TOKEN
  @UseGuards(JwtRefreshAuthGuard)
  @Get('refresh')
  async refresh(
    @UserDecorator() user: any, // puede venir con userId o sub
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.refreshAuthUseCase.execute(user);

    if (isTypeResponse(result)) return result;

    const { access_token } = result;

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000, // 1h
    });

    return { access_token };
  }

  @Get('validate-token')
  @UseGuards(JwtAuthGuard)
  async validateToken(@Res() res: Response) {
    return res.status(200).json({ message: 'Token es valido' });
  }
}
