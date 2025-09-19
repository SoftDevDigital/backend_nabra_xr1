import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart } from './schemas/cart.schema';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import { UpdateCartDto } from './dtos/update-cart.dto';
import { Types } from 'mongoose';

@Injectable()
export class CartService {
  constructor(@InjectModel(Cart.name) private cartModel: Model<Cart>) {}

  async getCart(userId: string) {
    let cart = await this.cartModel
      .findOne({ userId })
      .populate('items.product');
    if (!cart) {
      cart = await this.cartModel.create({ userId, items: [] });
    }
    return cart;
  }

  async addToCart(userId: string, addToCartDto: AddToCartDto) {
    const cart = await this.getCart(userId);
    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === addToCartDto.productId &&
        item.size === addToCartDto.size,
    );
    if (existingItem) {
      existingItem.quantity += addToCartDto.quantity;
    } else {
      cart.items.push({
        _id: new Types.ObjectId(),
        product: new Types.ObjectId(addToCartDto.productId),
        quantity: addToCartDto.quantity,
        size: addToCartDto.size,
      });
    }
    return await cart.save(); // Asegúrate de guardar para generar _id
  }

  async updateCartItem(
    userId: string,
    itemId: string,
    updateCartDto: UpdateCartDto,
  ) {
    const cart = await this.getCart(userId);
    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId,
    );
    if (itemIndex === -1) throw new NotFoundException('Item not found');
    if (updateCartDto.quantity)
      cart.items[itemIndex].quantity = updateCartDto.quantity;
    if (updateCartDto.size) cart.items[itemIndex].size = updateCartDto.size;
    return await cart.save();
  }

  async removeFromCart(userId: string, itemId: string) {
    const cart = await this.getCart(userId);
    cart.items = cart.items.filter((item) => item._id.toString() !== itemId);
    return await cart.save();
  }
}
