import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { ContactDto } from '../dtos/contact.dto';
import { MailService } from '../services/mail.service';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private mailService: MailService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Enviar formulario de contacto', 
    description: 'Envía un mensaje de contacto a Nabra desde el formulario web' 
  })
  @ApiBody({ type: ContactDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Mensaje enviado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Datos de entrada inválidos' 
  })
  async sendContactMessage(@Body() contactData: ContactDto) {
    const { name, email, phone, comment } = contactData;

    // Preparar el contenido del email
    const emailContent = `
      <h2>Nuevo mensaje de contacto desde el sitio web</h2>
      <hr>
      <p><strong>Nombre:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Teléfono:</strong> ${phone}</p>
      <p><strong>Mensaje:</strong></p>
      <p>${comment}</p>
      <hr>
      <p><em>Enviado desde el formulario de contacto de Nabra</em></p>
    `;

    // Enviar email a Nabra
    await this.mailService.sendMail({
      to: 'contact@nabra.mx',
      subject: `Nuevo mensaje de contacto - ${name}`,
      html: emailContent,
    });

    return {
      success: true,
      message: 'Mensaje enviado exitosamente. Te contactaremos pronto.'
    };
  }
}
