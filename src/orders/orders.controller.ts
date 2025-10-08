import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  Request,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CheckoutPartialDto } from './dtos/checkout-partial';
import { UpdateStatusDto } from './dtos/update-status';
import { CheckoutRequestDto } from './dtos/checkout-address.dto';
import { CreateShipmentDto } from '../shipping/dtos/shipping-data.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Order } from './schemas/order.schema';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Orders')
@ApiBearerAuth('bearer')
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @ApiOperation({ 
    summary: 'Crear orden desde checkout parcial', 
    description: 'Crea una orden a partir de datos parciales del checkout con gestión completa de direcciones de envío.' 
  })
  @ApiBody({ type: CheckoutPartialDto })
  @Post()
  async createOrderFromPartial(
    @Request() req,
    @Body() checkoutPartialDto: CheckoutPartialDto,
  ) {
    return this.ordersService.createOrderFromPartial(
      req.user.userId,
      checkoutPartialDto,
    );
  }

  @ApiOperation({ 
    summary: 'Procesar checkout completo con dirección', 
    description: 'Procesa un checkout completo permitiendo seleccionar dirección guardada o crear nueva, con validación completa para envío.' 
  })
  @ApiBody({ type: CheckoutRequestDto })
  @Post('checkout')
  async processCheckout(
    @Request() req,
    @Body() checkoutRequestDto: CheckoutRequestDto,
  ) {
    return this.ordersService.processCheckoutWithAddress(
      req.user.userId,
      checkoutRequestDto,
    );
  }

  @ApiOperation({ summary: 'Listar mis órdenes', description: 'Obtiene órdenes del usuario autenticado con paginación.' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @Get('my-orders')
  async getUserOrders(
    @Request() req,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const limitNum = limit ? parseInt(limit.toString(), 10) : 10;
    const offsetNum = offset ? parseInt(offset.toString(), 10) : 0;
    
    return this.ordersService.getUserOrders(req.user.userId, limitNum, offsetNum);
  }

  @ApiOperation({ summary: 'Resumen de mis órdenes', description: 'KPIs y totales de las órdenes del usuario.' })
  @Get('my-orders/summary')
  async getUserOrderSummary(@Request() req) {
    return this.ordersService.getOrderSummary(req.user.userId);
  }

  @ApiOperation({ summary: 'Detalle de mi orden', description: 'Obtiene una orden específica del usuario por ID.' })
  @ApiParam({ name: 'id', description: 'ID de la orden' })
  @Get('my-orders/:id')
  async getUserOrderById(@Param('id') id: string, @Request() req) {
    return this.ordersService.getUserOrderById(req.user.userId, id);
  }

  @ApiOperation({ summary: 'Obtener orden', description: 'Obtiene una orden por ID (visible al propietario y admins).' })
  @ApiParam({ name: 'id', description: 'ID de la orden' })
  @Get(':id')
  async getOrderById(@Param('id') id: string, @Request() req) {
    return this.ordersService.getOrderById(id, req.user.userId);
  }

  @Roles('admin')
  @ApiOperation({ summary: 'Listar órdenes (admin)', description: 'Lista de órdenes para panel administrativo.' })
  @Get()
  async getOrders(@Request() req) {
    return this.ordersService.getOrders(req.user);
  }

  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar estado (admin)', description: 'Actualiza el estado de una orden.' })
  @ApiParam({ name: 'id', description: 'ID de la orden' })
  @ApiBody({ type: UpdateStatusDto })
  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
    @Request() req,
  ) {
    return this.ordersService.updateStatus(id, updateStatusDto, req.user);
  }

  // ========== DRENVÍO DESHABILITADO TEMPORALMENTE ==========
  // @ApiOperation({ 
  //   summary: 'Generar envío para orden', 
  //   description: 'Genera envío con DrEnvío para una orden específica.' 
  // })
  // @ApiParam({ name: 'id', description: 'ID de la orden' })
  // @ApiBody({ type: CreateShipmentDto })
  // @Post(':id/generate-shipment')
  // async generateShipmentForOrder(
  //   @Request() req,
  //   @Param('id') orderId: string,
  //   @Body() createShipmentDto: CreateShipmentDto,
  // ) {
  //   return this.ordersService.generateShipmentForOrder(orderId, createShipmentDto.shippingData);
  // }
  // ========== FIN DRENVÍO DESHABILITADO ==========

}
