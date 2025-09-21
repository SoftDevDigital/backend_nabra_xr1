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
import { Roles } from '../common/decorators/roles.decorator';
import { Order } from './schemas/order.schema';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

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

  @Get('my-orders/summary')
  async getUserOrderSummary(@Request() req) {
    return this.ordersService.getOrderSummary(req.user.userId);
  }

  @Get('my-orders/:id')
  async getUserOrderById(@Param('id') id: string, @Request() req) {
    return this.ordersService.getUserOrderById(req.user.userId, id);
  }

  @Get(':id')
  async getOrderById(@Param('id') id: string, @Request() req) {
    return this.ordersService.getOrderById(id, req.user.userId);
  }

  @Roles('admin')
  @Get()
  async getOrders(@Request() req) {
    return this.ordersService.getOrders(req.user);
  }

  @Roles('admin')
  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
    @Request() req,
  ) {
    return this.ordersService.updateStatus(id, updateStatusDto, req.user);
  }
}
