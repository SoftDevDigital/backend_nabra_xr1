import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from '../schemas/order.schema';

@Injectable()
export class OrderNumberService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
  ) {}

  async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ORD-${year}`;
    
    // Buscar el último número de orden del año actual
    const lastOrder = await this.orderModel
      .findOne({ orderNumber: { $regex: `^${prefix}` } })
      .sort({ orderNumber: -1 })
      .exec();

    let nextNumber = 1;
    if (lastOrder) {
      // Extraer el número del último orderNumber (ej: ORD-2025-001234 -> 1234)
      const lastNumber = parseInt(lastOrder.orderNumber.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    // Formatear con ceros a la izquierda (6 dígitos)
    const formattedNumber = nextNumber.toString().padStart(6, '0');
    return `${prefix}-${formattedNumber}`;
  }

  async isOrderNumberUnique(orderNumber: string): Promise<boolean> {
    const existingOrder = await this.orderModel.findOne({ orderNumber }).exec();
    return !existingOrder;
  }
}
