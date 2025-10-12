import { Get, Req, Res, UseGuards } from '@nestjs/common';
import { Controller, Post, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { Public } from '../common/decorators/public.decorator';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @ApiOperation({ 
    summary: 'Registro de usuario', 
    description: 'Crea un nuevo usuario con nombres y credenciales. El token JWT se envía como cookie HTTP-only segura. También retorna el usuario y token en el body para compatibilidad.' 
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Usuario creado correctamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(registerDto);
    
    // Establecer cookie HTTP-only segura (mejor práctica de seguridad)
    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      domain: '.nabra.mx',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      path: '/',
    });

    // Cookie con datos del usuario (accesible desde JS)
    res.cookie('user_data', JSON.stringify(result.user), {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      domain: '.nabra.mx',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return result;
  }

  @Public()
  @ApiOperation({ 
    summary: 'Inicio de sesión', 
    description: 'Autentica al usuario con email y contraseña. El token JWT se envía como cookie HTTP-only segura. También retorna token en el body para compatibilidad.' 
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Autenticación exitosa' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(loginDto);
    
    // Establecer cookie HTTP-only segura (mejor práctica de seguridad)
    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      domain: '.nabra.mx',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      path: '/',
    });

    // Cookie con datos del usuario (accesible desde JS)
    res.cookie('user_data', JSON.stringify(result.user), {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      domain: '.nabra.mx',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return result;
  }

  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Cerrar sesión', 
    description: 'Cierra la sesión del usuario y limpia las cookies de autenticación.' 
  })
  @ApiResponse({ status: 200, description: 'Sesión cerrada correctamente' })
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Limpiar cookies de autenticación
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      domain: '.nabra.mx',
      path: '/',
    });

    res.clearCookie('user_data', {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      domain: '.nabra.mx',
      path: '/',
    });

    return { message: 'Logged out successfully' };
  }

  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Verificar sesión', 
    description: 'Verifica si el usuario tiene una sesión activa válida (mediante cookie o header Authorization).' 
  })
  @ApiResponse({ status: 200, description: 'Sesión válida' })
  @ApiResponse({ status: 401, description: 'Sesión inválida o expirada' })
  @Get('verify')
  @UseGuards(JwtAuthGuard)
  async verify(@Req() req: Request) {
    return { 
      valid: true,
      user: req.user,
    };
  }
}
