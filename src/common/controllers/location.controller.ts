import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody, ApiParam, ApiResponse } from '@nestjs/swagger';
import { LocationService } from '../services/location.service';
import type { DrenvioAddress } from '../services/location.service';
import { Public } from '../decorators/public.decorator';

export interface LocationOption {
  value: string;
  label: string;
  placeId: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface LocationSearchResponse {
  success: boolean;
  options: LocationOption[];
  message?: string;
}

@ApiTags('Location')
@Controller('location')
export class LocationController {
  constructor(private locationService: LocationService) {}

  @Public()
  @ApiOperation({ summary: 'Buscar lugares', description: 'Busca lugares usando Google Maps API según query de búsqueda.' })
  @ApiQuery({ name: 'q', required: true, description: 'Texto de búsqueda (mínimo 2 caracteres)' })
  @ApiResponse({ status: 200, description: 'Lista de lugares encontrados' })
  @Get('search')
  async searchPlaces(@Query('q') query: string) {
    if (!query || query.length < 2) {
      return {
        success: false,
        message: 'Query must be at least 2 characters long',
        results: [],
      };
    }

    try {
      const results = await this.locationService.searchPlaces(query);
      return {
        success: true,
        results,
        count: results.length,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error searching places',
        error: error.message,
        results: [],
      };
    }
  }

  // ===== ENDPOINTS ESPECÍFICOS PARA FRONTEND =====

  @Public()
  @ApiOperation({ summary: 'Buscar ubicaciones (opciones)', description: 'Busca ubicaciones formateadas para select/autocomplete del frontend.' })
  @ApiQuery({ name: 'q', required: true, description: 'Texto de búsqueda' })
  @ApiQuery({ name: 'country', required: false, description: 'Código de país (default: mx)' })
  @ApiResponse({ status: 200, description: 'Opciones de ubicación con coordenadas' })
  @Get('search/options')
  async searchLocationOptions(
    @Query('q') query: string,
    @Query('country') country: string = 'mx'
  ): Promise<LocationSearchResponse> {
    if (!query || query.length < 2) {
      return {
        success: false,
        options: [],
        message: 'La búsqueda debe tener al menos 2 caracteres',
      };
    }

    try {
      const results = await this.locationService.searchPlaces(query, country);
      
      const options: LocationOption[] = results.map((place, index) => ({
        value: place.place_id,
        label: place.name || place.formatted_address.split(',')[0],
        placeId: place.place_id,
        address: place.formatted_address,
        coordinates: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        },
      }));

      return {
        success: true,
        options,
        message: `Se encontraron ${options.length} ubicaciones`,
      };
    } catch (error) {
      return {
        success: false,
        options: [],
        message: 'Error al buscar ubicaciones',
      };
    }
  }

  @Public()
  @ApiOperation({ summary: 'Países soportados', description: 'Lista de países soportados con códigos y banderas.' })
  @ApiResponse({ status: 200, description: 'Lista de países' })
  @Get('countries')
  async getSupportedCountries() {
    return {
      success: true,
      countries: [
        {
          code: 'mx',
          name: 'México',
          flag: '🇲🇽',
        },
        {
          code: 'ar',
          name: 'Argentina',
          flag: '🇦🇷',
        },
        {
          code: 'co',
          name: 'Colombia',
          flag: '🇨🇴',
        },
        {
          code: 'pe',
          name: 'Perú',
          flag: '🇵🇪',
        },
        {
          code: 'cl',
          name: 'Chile',
          flag: '🇨🇱',
        },
        {
          code: 'br',
          name: 'Brasil',
          flag: '🇧🇷',
        },
      ],
    };
  }

  @Public()
  @ApiOperation({ summary: 'Ciudades populares', description: 'Lista de ciudades populares por país.' })
  @ApiQuery({ name: 'country', required: false, description: 'Código de país (default: mx)' })
  @ApiResponse({ status: 200, description: 'Lista de ciudades populares' })
  @Get('cities/popular')
  async getPopularCities(@Query('country') country: string = 'mx') {
    const popularCities = {
      mx: [
        { name: 'Ciudad de México', state: 'CDMX', postalCode: '06000' },
        { name: 'Guadalajara', state: 'Jalisco', postalCode: '44100' },
        { name: 'Monterrey', state: 'Nuevo León', postalCode: '64000' },
        { name: 'Puebla', state: 'Puebla', postalCode: '72000' },
        { name: 'Tijuana', state: 'Baja California', postalCode: '22000' },
        { name: 'León', state: 'Guanajuato', postalCode: '37000' },
        { name: 'Juárez', state: 'Chihuahua', postalCode: '32000' },
        { name: 'Torreón', state: 'Coahuila', postalCode: '27000' },
      ],
      ar: [
        { name: 'Buenos Aires', state: 'CABA', postalCode: '1000' },
        { name: 'Córdoba', state: 'Córdoba', postalCode: '5000' },
        { name: 'Rosario', state: 'Santa Fe', postalCode: '2000' },
        { name: 'Mendoza', state: 'Mendoza', postalCode: '5500' },
        { name: 'La Plata', state: 'Buenos Aires', postalCode: '1900' },
        { name: 'Tucumán', state: 'Tucumán', postalCode: '4000' },
        { name: 'Mar del Plata', state: 'Buenos Aires', postalCode: '7600' },
        { name: 'Salta', state: 'Salta', postalCode: '4400' },
      ],
    };

    return {
      success: true,
      cities: popularCities[country] || popularCities.mx,
      country: country.toUpperCase(),
    };
  }

  @Public()
  @ApiOperation({ summary: 'Detalles de lugar', description: 'Obtiene detalles completos de un lugar por place_id de Google.' })
  @ApiQuery({ name: 'placeId', required: true, description: 'ID de lugar de Google Maps' })
  @ApiResponse({ status: 200, description: 'Detalles del lugar y dirección formateada para DrEnvío' })
  @Get('details')
  async getPlaceDetails(@Query('placeId') placeId: string) {
    if (!placeId) {
      return {
        success: false,
        message: 'Place ID is required',
      };
    }

    try {
      const details = await this.locationService.getPlaceDetails(placeId);
      const drenvioAddress = this.locationService.formatAddressForDrenvio(details);
      
      return {
        success: true,
        placeDetails: details,
        drenvioAddress,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error getting place details',
        error: error.message,
      };
    }
  }

  @Public()
  @ApiOperation({ summary: 'Formatear dirección', description: 'Convierte detalles de lugar a formato DrEnvío con validación.' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        placeDetails: { type: 'object', description: 'Detalles del lugar de Google Maps' },
        contact: { type: 'object', description: 'Información de contacto opcional' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Dirección formateada y validación' })
  @Post('format-address')
  async formatAddressForDrenvio(@Body() body: { placeDetails: any; contact?: any }) {
    try {
      const { placeDetails, contact } = body;
      const drenvioAddress = this.locationService.formatAddressForDrenvio(placeDetails, contact);
      const validation = this.locationService.validateAddress(drenvioAddress);

      return {
        success: true,
        drenvioAddress,
        validation,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error formatting address',
        error: error.message,
      };
    }
  }

  @Public()
  @ApiOperation({ summary: 'Validar dirección', description: 'Valida una dirección en formato DrEnvío.' })
  @ApiBody({ 
    schema: { 
      type: 'object',
      description: 'Dirección en formato DrEnvío'
    }
  })
  @ApiResponse({ status: 200, description: 'Resultado de validación de la dirección' })
  @Post('validate-address')
  async validateAddress(@Body() address: DrenvioAddress) {
    try {
      const validation = this.locationService.validateAddress(address);
      return {
        success: true,
        validation,
        address,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error validating address',
        error: error.message,
      };
    }
  }
}
