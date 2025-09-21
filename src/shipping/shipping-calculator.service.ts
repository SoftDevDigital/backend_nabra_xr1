import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Shipment } from './schemas/shipment.schema';
import { DrEnvioService, DrEnvioShippingQuote } from './drenvio.service';
import { ProfileService } from '../users/profile.service';
import { ProductsService } from '../products/products.service';
import { CartService } from '../cart/cart.service';
import { drenvioConfig } from '../config/drenvio.config';

export interface ShippingCalculationRequest {
  userId: string;
  addressId?: string; // Si no se proporciona, usa la dirección por defecto
  cartItems?: Array<{
    productId: string;
    quantity: number;
  }>;
  customItems?: Array<{
    name: string;
    weight: number; // kg
    dimensions: { length: number; width: number; height: number }; // cm
    value: number; // ARS
    quantity: number;
  }>;
}

export interface ShippingOption {
  serviceId: string;
  serviceName: string;
  description: string;
  cost: number;
  originalCost: number;
  discount?: number;
  estimatedDays: number;
  estimatedDeliveryDate: string;
  carrier: string;
  zone: string;
  isFree: boolean;
  restrictions?: string[];
  features?: string[];
}

export interface ShippingCalculationResponse {
  success: boolean;
  options: ShippingOption[];
  destination: {
    address: string;
    zone: string;
    postalCode: string;
  };
  packageInfo: {
    totalWeight: number;
    totalValue: number;
    dimensions: { length: number; width: number; height: number };
    itemCount: number;
  };
  appliedPromotions?: Array<{
    type: string;
    description: string;
    discount: number;
  }>;
  errors?: string[];
  warnings?: string[];
}

@Injectable()
export class ShippingCalculatorService {
  private readonly logger = new Logger(ShippingCalculatorService.name);

  constructor(
    @InjectModel(Shipment.name) private shipmentModel: Model<Shipment>,
    private drenvioService: DrEnvioService,
    @Inject(forwardRef(() => ProfileService)) private profileService: ProfileService,
    @Inject(forwardRef(() => ProductsService)) private productsService: ProductsService,
    @Inject(forwardRef(() => CartService)) private cartService: CartService,
  ) {}

  // ===== CÁLCULO PRINCIPAL =====

  async calculateShipping(request: ShippingCalculationRequest): Promise<ShippingCalculationResponse> {
    try {
      this.logger.log(`Calculating shipping for user: ${request.userId}`);

      // 1. Obtener dirección de destino
      const destinationAddress = await this.getDestinationAddress(request.userId, request.addressId);

      // 2. Preparar items del paquete
      const packageInfo = await this.preparePackageInfo(request);

      // 3. Validar restricciones
      this.validatePackage(packageInfo);

      // 4. Obtener cotizaciones de DrEnvío
      const quotes = await this.drenvioService.getShippingQuotes(
        this.getOriginAddress(),
        this.formatAddressForDrEnvio(destinationAddress),
        {
          length: packageInfo.dimensions.length,
          width: packageInfo.dimensions.width,
          height: packageInfo.dimensions.height,
          weight: packageInfo.totalWeight,
        },
        packageInfo.totalValue,
      );

      // 5. Procesar opciones y aplicar promociones
      const options = await this.processShippingOptions(quotes, packageInfo, request.userId);

      // 6. Preparar respuesta
      return {
        success: true,
        options,
        destination: {
          address: this.formatAddressString(destinationAddress),
          zone: this.getZoneByPostalCode(destinationAddress.postalCode),
          postalCode: destinationAddress.postalCode,
        },
        packageInfo: {
          totalWeight: packageInfo.totalWeight,
          totalValue: packageInfo.totalValue,
          dimensions: packageInfo.dimensions,
          itemCount: packageInfo.itemCount,
        },
        appliedPromotions: this.getAppliedPromotions(packageInfo.totalValue, options),
      };
    } catch (error) {
      this.logger.error('Error calculating shipping:', error);
      
      return {
        success: false,
        options: [],
        destination: { address: '', zone: '', postalCode: '' },
        packageInfo: { totalWeight: 0, totalValue: 0, dimensions: { length: 0, width: 0, height: 0 }, itemCount: 0 },
        errors: [error.message || 'Error calculating shipping'],
      };
    }
  }

  // ===== CÁLCULO RÁPIDO DESDE CARRITO =====

  async calculateShippingFromCart(userId: string, addressId?: string): Promise<ShippingCalculationResponse> {
    const cart = await this.cartService.getCart(userId);
    
    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const cartItems = cart.items.map(item => ({
      productId: typeof item.product === 'string' 
        ? item.product 
        : (item.product as any)._id?.toString() || item.product.toString(),
      quantity: item.quantity,
    }));

    return this.calculateShipping({
      userId,
      addressId,
      cartItems,
    });
  }

  // ===== MÉTODOS AUXILIARES =====

  private async getDestinationAddress(userId: string, addressId?: string) {
    const profile = await this.profileService.getProfile(userId);
    
    if (addressId) {
      return await this.profileService.getAddressById(userId, addressId);
    }

    // Usar dirección por defecto
    const addresses = await this.profileService.getUserAddresses(userId);
    const defaultAddress = addresses.find(addr => addr.isDefault);
    
    if (!defaultAddress) {
      throw new BadRequestException('No default shipping address found');
    }

    return defaultAddress;
  }

  private getOriginAddress() {
    const { companyInfo } = drenvioConfig;
    return {
      name: companyInfo.name,
      phone: companyInfo.contact.phone,
      street: companyInfo.address.street,
      city: companyInfo.address.city,
      state: companyInfo.address.state,
      postalCode: companyInfo.address.postalCode,
      country: companyInfo.address.country,
      neighborhood: 'Centro', // Valor por defecto
    };
  }

  private async preparePackageInfo(request: ShippingCalculationRequest) {
    let totalWeight = 0;
    let totalValue = 0;
    let itemCount = 0;
    const items: any[] = [];

    // Procesar items del carrito
    if (request.cartItems) {
      for (const cartItem of request.cartItems) {
        const product = await this.productsService.findById(cartItem.productId);
        
        // Estimar peso y dimensiones del producto (estos valores deberían estar en el esquema del producto)
        const estimatedWeight = this.estimateProductWeight(product);
        const estimatedDimensions = this.estimateProductDimensions(product);
        
        totalWeight += estimatedWeight * cartItem.quantity;
        totalValue += product.price * cartItem.quantity;
        itemCount += cartItem.quantity;
        
        items.push({
          name: product.name,
          weight: estimatedWeight,
          dimensions: estimatedDimensions,
          value: product.price,
          quantity: cartItem.quantity,
          sku: (product._id as any).toString(),
        });
      }
    }

    // Procesar items personalizados
    if (request.customItems) {
      for (const customItem of request.customItems) {
        totalWeight += customItem.weight * customItem.quantity;
        totalValue += customItem.value * customItem.quantity;
        itemCount += customItem.quantity;
        
        items.push(customItem);
      }
    }

    // Calcular dimensiones del paquete
    const packageDimensions = this.calculatePackageDimensions(items);

    return {
      totalWeight,
      totalValue,
      itemCount,
      dimensions: packageDimensions,
      items,
    };
  }

  private estimateProductWeight(product: any): number {
    // Lógica para estimar peso basada en categoría
    const categoryWeights = {
      'sandalias': 0.5,
      'zapatillas': 0.8,
      'botas': 1.2,
      'plataformas': 0.9,
    };

    return categoryWeights[product.category] || 0.7; // Peso por defecto
  }

  private estimateProductDimensions(product: any): { length: number; width: number; height: number } {
    // Lógica para estimar dimensiones basada en categoría
    const categoryDimensions = {
      'sandalias': { length: 30, width: 15, height: 8 },
      'zapatillas': { length: 32, width: 18, height: 12 },
      'botas': { length: 35, width: 20, height: 15 },
      'plataformas': { length: 30, width: 18, height: 15 },
    };

    return categoryDimensions[product.category] || { length: 30, width: 18, height: 10 };
  }

  private calculatePackageDimensions(items: any[]): { length: number; width: number; height: number } {
    if (items.length === 0) {
      return { length: 10, width: 10, height: 10 };
    }

    // Algoritmo simple: sumar volúmenes y calcular dimensiones del paquete
    let totalVolume = 0;
    let maxLength = 0;
    let maxWidth = 0;
    let totalHeight = 0;

    items.forEach(item => {
      const dims = item.dimensions;
      const qty = item.quantity;
      
      totalVolume += dims.length * dims.width * dims.height * qty;
      maxLength = Math.max(maxLength, dims.length);
      maxWidth = Math.max(maxWidth, dims.width);
      totalHeight += dims.height * qty;
    });

    // Optimizar empaque
    const length = Math.max(maxLength, Math.ceil(Math.cbrt(totalVolume * 0.7)));
    const width = Math.max(maxWidth, Math.ceil(Math.cbrt(totalVolume * 0.7)));
    const height = Math.min(totalHeight, Math.ceil(totalVolume / (length * width)));

    return {
      length: Math.max(length, 10),
      width: Math.max(width, 10),
      height: Math.max(height, 5),
    };
  }

  private validatePackage(packageInfo: any): void {
    const { limits } = drenvioConfig;

    if (packageInfo.totalWeight > limits.maxPackageWeight) {
      throw new BadRequestException(`Package weight exceeds maximum: ${limits.maxPackageWeight}kg`);
    }

    if (packageInfo.totalValue > limits.maxPackageValue) {
      throw new BadRequestException(`Package value exceeds maximum: $${limits.maxPackageValue}`);
    }

    const { dimensions } = packageInfo;
    if (dimensions.length > limits.maxDimension || 
        dimensions.width > limits.maxDimension || 
        dimensions.height > limits.maxDimension) {
      throw new BadRequestException(`Package dimensions exceed maximum: ${limits.maxDimension}cm`);
    }
  }

  private async processShippingOptions(
    quotes: DrEnvioShippingQuote[], 
    packageInfo: any, 
    userId: string
  ): Promise<ShippingOption[]> {
    const options: ShippingOption[] = [];

    for (const quote of quotes) {
      const originalCost = quote.cost;
      let finalCost = originalCost;
      let discount = 0;
      let isFree = false;

      // Aplicar envío gratis si aplica
      const freeShippingDiscount = await this.calculateFreeShippingDiscount(
        packageInfo.totalValue, 
        quote.zone, 
        userId
      );

      if (freeShippingDiscount > 0) {
        discount = freeShippingDiscount;
        finalCost = Math.max(0, originalCost - discount);
        isFree = finalCost === 0;
      }

      // Agregar características del servicio
      const features = this.getServiceFeatures(quote.serviceId);

      options.push({
        serviceId: quote.serviceId,
        serviceName: quote.serviceName,
        description: this.getServiceDescription(quote.serviceId),
        cost: Math.round(finalCost * 100) / 100,
        originalCost,
        discount,
        estimatedDays: quote.estimatedDays,
        estimatedDeliveryDate: quote.estimatedDeliveryDate,
        carrier: quote.carrier,
        zone: quote.zone,
        isFree,
        restrictions: quote.restrictions,
        features,
      });
    }

    return options.sort((a, b) => a.cost - b.cost);
  }

  private async calculateFreeShippingDiscount(totalValue: number, zone: string, userId: string): Promise<number> {
    const zoneConfig = drenvioConfig.deliveryZones[zone.toLowerCase()];
    
    if (!zoneConfig) return 0;

    // Envío gratis por monto mínimo
    if (totalValue >= zoneConfig.freeShippingThreshold) {
      return zoneConfig.baseRate;
    }

    // TODO: Aquí se pueden agregar otras promociones
    // - Usuario premium
    // - Cupones de descuento
    // - Promociones especiales

    return 0;
  }

  private getServiceFeatures(serviceId: string): string[] {
    const features = {
      standard: ['Seguimiento incluido', 'Entrega en domicilio'],
      express: ['Seguimiento incluido', 'Entrega en domicilio', 'Entrega rápida'],
      same_day: ['Seguimiento incluido', 'Entrega en domicilio', 'Entrega el mismo día', 'Solo CABA'],
    };

    return features[serviceId] || [];
  }

  private getServiceDescription(serviceId: string): string {
    const descriptions = {
      standard: 'Entrega estándar en días hábiles',
      express: 'Entrega express prioritaria',
      same_day: 'Entrega el mismo día (solo CABA)',
    };

    return descriptions[serviceId] || 'Servicio de entrega';
  }

  private getAppliedPromotions(totalValue: number, options: ShippingOption[]) {
    const promotions: any[] = [];

    // Promoción de envío gratis
    const freeOptions = options.filter(opt => opt.isFree);
    if (freeOptions.length > 0) {
      promotions.push({
        type: 'free_shipping',
        description: 'Envío gratis por compra mínima',
        discount: freeOptions[0].originalCost,
      });
    }

    return promotions;
  }

  private getZoneByPostalCode(postalCode: string): string {
    const code = postalCode.replace(/\D/g, '');
    
    if (code >= '1000' && code <= '1499') return 'CABA';
    if (code >= '1600' && code <= '1900') return 'GBA';
    return 'INTERIOR';
  }

  private formatAddressString(address: any): string {
    return `${address.street}, ${address.neighborhood}, ${address.city}, ${address.state} ${address.postalCode}`;
  }

  private formatAddressForDrEnvio(address: any): any {
    return {
      name: address.receiverName || address.alias || 'Destinatario',
      phone: address.receiverPhone || '',
      street: address.street,
      apartment: address.apartment,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      references: address.references,
      coordinates: address.coordinates,
    };
  }

  // ===== MÉTODOS PÚBLICOS ADICIONALES =====

  async getEstimatedDeliveryDate(serviceId: string, destinationZone: string): Promise<string> {
    const estimatedDays = this.getEstimatedDaysByService(serviceId, destinationZone);
    const date = new Date();
    date.setDate(date.getDate() + estimatedDays);
    
    // Saltar fines de semana
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
    }
    
    return date.toISOString().split('T')[0];
  }

  private getEstimatedDaysByService(serviceId: string, zone: string): number {
    const baseDays = {
      CABA: { standard: 2, express: 1, same_day: 0 },
      GBA: { standard: 3, express: 2, same_day: 0 },
      INTERIOR: { standard: 5, express: 3, same_day: 0 },
    };

    return baseDays[zone]?.[serviceId] || 5;
  }
}
