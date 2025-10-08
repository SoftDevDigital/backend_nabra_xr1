import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface PlaceSearchResult {
  place_id: string;
  formatted_address: string;
  name?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface PlaceDetails {
  result: {
    place_id: string;
    formatted_address: string;
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
  };
}

export interface NominatimSearchResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
  address?: {
    country: string;
    country_code: string;
    state: string;
    city: string;
    postcode: string;
    road?: string;
    house_number?: string;
  };
}

export interface NominatimDetailsResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    country: string;
    country_code: string;
    state: string;
    city: string;
    postcode: string;
    road?: string;
    house_number?: string;
  };
}

export interface DrenvioAddress {
  country: string;
  postal_code: string;
  state: string;
  city: string;
  address: string;
  contact?: {
    name: string;
    phone: string;
    email: string;
  };
}

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly nominatimBaseUrl = 'https://nominatim.openstreetmap.org';

  constructor(private httpService: HttpService) {}

  async searchPlaces(query: string, country: string = 'mx'): Promise<PlaceSearchResult[]> {
    try {
      this.logger.debug(`Searching places for query: ${query} in country: ${country}`);
      
      // Mapear códigos de país a nombres
      const countryNames = {
        mx: 'México',
        ar: 'Argentina',
        co: 'Colombia',
        pe: 'Perú',
        cl: 'Chile',
        br: 'Brasil',
      };

      const countryName = countryNames[country] || 'México';
      
      const response = await firstValueFrom(
        this.httpService.get(`${this.nominatimBaseUrl}/search`, {
          params: {
            q: `${query} ${countryName}`,
            format: 'json',
            addressdetails: 1,
            limit: 10,
            countrycodes: country,
            'accept-language': 'es',
          },
          headers: {
            'User-Agent': 'Nabra-XR-Ecommerce/1.0 (contact@nabraxr.com)',
          },
        }),
      );

      const results = response.data as NominatimSearchResult[];
      this.logger.debug(`Nominatim returned ${results?.length || 0} results`);
      
      if (!results || results.length === 0) {
        this.logger.warn('Nominatim returned no results, using fallback');
        return this.getFallbackPlaces(query, country);
      }
      
      return this.formatNominatimResults(results);
    } catch (error) {
      this.logger.error('Error searching places with Nominatim:', error);
      return this.getFallbackPlaces(query, country);
    }
  }

  async getPlaceDetails(placeId: string): Promise<PlaceDetails> {
    try {
      this.logger.debug(`Getting place details for placeId: ${placeId}`);
      
      const response = await firstValueFrom(
        this.httpService.get(`${this.nominatimBaseUrl}/details`, {
          params: {
            place_id: placeId,
            format: 'json',
            addressdetails: 1,
            'accept-language': 'es',
          },
          headers: {
            'User-Agent': 'Nabra-XR-Ecommerce/1.0 (contact@nabraxr.com)',
          },
        }),
      );

      const result = response.data as NominatimDetailsResult;
      return this.formatNominatimDetails(result);
    } catch (error) {
      this.logger.error('Error getting place details with Nominatim:', error);
      // Fallback to fallback details if Nominatim fails
      return this.getFallbackPlaceDetails(placeId);
    }
  }

  formatAddressForDrenvio(placeDetails: PlaceDetails, contact?: any): DrenvioAddress {
    const components = placeDetails.result.address_components;
    
    const postalCode = components.find(c => 
      c.types.includes('postal_code')
    )?.long_name || '';
    
    const state = components.find(c => 
      c.types.includes('administrative_area_level_1')
    )?.long_name || '';
    
    const city = components.find(c => 
      c.types.includes('locality') || c.types.includes('administrative_area_level_2')
    )?.long_name || '';
    
    const country = components.find(c => 
      c.types.includes('country')
    )?.short_name || 'MX';

    return {
      country,
      postal_code: postalCode,
      state,
      city,
      address: placeDetails.result.formatted_address,
      contact: contact || {
        name: 'Cliente',
        phone: '0000000000',
        email: 'cliente@example.com',
      },
    };
  }

  private formatNominatimResults(results: NominatimSearchResult[]): PlaceSearchResult[] {
    return results.map(result => ({
      place_id: result.place_id,
      formatted_address: result.display_name,
      name: result.display_name.split(',')[0], // First part as name
      geometry: {
        location: {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
        },
      },
    }));
  }

  private formatNominatimDetails(result: NominatimDetailsResult): PlaceDetails {
    const addressComponents: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }> = [];
    
    if (result.address) {
      // Convert Nominatim address to Google Places format
      if (result.address.country) {
        addressComponents.push({
          long_name: result.address.country,
          short_name: result.address.country_code || 'MX',
          types: ['country', 'political'],
        });
      }
      
      if (result.address.state) {
        addressComponents.push({
          long_name: result.address.state,
          short_name: result.address.state,
          types: ['administrative_area_level_1', 'political'],
        });
      }
      
      if (result.address.city) {
        addressComponents.push({
          long_name: result.address.city,
          short_name: result.address.city,
          types: ['locality', 'political'],
        });
      }
      
      if (result.address.postcode) {
        addressComponents.push({
          long_name: result.address.postcode,
          short_name: result.address.postcode,
          types: ['postal_code'],
        });
      }
    }

    return {
      result: {
        place_id: result.place_id,
        formatted_address: result.display_name,
        address_components: addressComponents,
        geometry: {
          location: {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
          },
        },
      },
    };
  }

  private getFallbackPlaces(query: string, country: string = 'mx'): PlaceSearchResult[] {
    // Fallback con ubicaciones comunes por país
    const commonPlacesByCountry = {
      mx: [
        {
          place_id: '151197',
          formatted_address: 'Ciudad de México, CDMX, México',
          name: 'Ciudad de México',
          geometry: {
            location: { lat: 19.4326, lng: -99.1332 }
          }
        },
        {
          place_id: '151198',
          formatted_address: 'Guadalajara, Jalisco, México',
          name: 'Guadalajara',
          geometry: {
            location: { lat: 20.6597, lng: -103.3496 }
          }
        },
        {
          place_id: '151199',
          formatted_address: 'Monterrey, Nuevo León, México',
          name: 'Monterrey',
          geometry: {
            location: { lat: 25.6866, lng: -100.3161 }
          }
        },
        {
          place_id: '151200',
          formatted_address: 'Puebla, Puebla, México',
          name: 'Puebla',
          geometry: {
            location: { lat: 19.0414, lng: -98.2063 }
          }
        },
        {
          place_id: '151201',
          formatted_address: 'Tijuana, Baja California, México',
          name: 'Tijuana',
          geometry: {
            location: { lat: 32.5149, lng: -117.0382 }
          }
        }
      ],
      ar: [
        {
          place_id: '152001',
          formatted_address: 'Buenos Aires, CABA, Argentina',
          name: 'Buenos Aires',
          geometry: {
            location: { lat: -34.6118, lng: -58.3960 }
          }
        },
        {
          place_id: '152002',
          formatted_address: 'Córdoba, Córdoba, Argentina',
          name: 'Córdoba',
          geometry: {
            location: { lat: -31.4201, lng: -64.1888 }
          }
        },
        {
          place_id: '152003',
          formatted_address: 'Rosario, Santa Fe, Argentina',
          name: 'Rosario',
          geometry: {
            location: { lat: -32.9442, lng: -60.6505 }
          }
        },
        {
          place_id: '152004',
          formatted_address: 'Mendoza, Mendoza, Argentina',
          name: 'Mendoza',
          geometry: {
            location: { lat: -32.8908, lng: -68.8272 }
          }
        },
        {
          place_id: '152005',
          formatted_address: 'La Plata, Buenos Aires, Argentina',
          name: 'La Plata',
          geometry: {
            location: { lat: -34.9214, lng: -57.9544 }
          }
        }
      ]
    };

    const commonPlaces = commonPlacesByCountry[country] || commonPlacesByCountry.mx;
    const queryLower = query.toLowerCase();
    
    const filtered = commonPlaces.filter(place => 
      place.name.toLowerCase().includes(queryLower) ||
      place.formatted_address.toLowerCase().includes(queryLower)
    );
    
    // If no matches found, return first few places as fallback
    return filtered.length > 0 ? filtered.slice(0, 5) : commonPlaces.slice(0, 3);
  }

  async getFallbackPlaceDetails(placeId: string): Promise<PlaceDetails> {
    const fallbackPlaces = {
      '151197': {
        result: {
          place_id: '151197',
          formatted_address: 'Ciudad de México, CDMX, México',
          address_components: [
            { long_name: 'México', short_name: 'MX', types: ['country', 'political'] },
            { long_name: 'Ciudad de México', short_name: 'CDMX', types: ['administrative_area_level_1', 'political'] },
            { long_name: 'Ciudad de México', short_name: 'Ciudad de México', types: ['locality', 'political'] },
            { long_name: '06000', short_name: '06000', types: ['postal_code'] }
          ],
          geometry: {
            location: { lat: 19.4326, lng: -99.1332 }
          }
        }
      },
      '151198': {
        result: {
          place_id: '151198',
          formatted_address: 'Guadalajara, Jalisco, México',
          address_components: [
            { long_name: 'México', short_name: 'MX', types: ['country', 'political'] },
            { long_name: 'Jalisco', short_name: 'JAL', types: ['administrative_area_level_1', 'political'] },
            { long_name: 'Guadalajara', short_name: 'Guadalajara', types: ['locality', 'political'] },
            { long_name: '44100', short_name: '44100', types: ['postal_code'] }
          ],
          geometry: {
            location: { lat: 20.6597, lng: -103.3496 }
          }
        }
      },
      '151199': {
        result: {
          place_id: '151199',
          formatted_address: 'Monterrey, Nuevo León, México',
          address_components: [
            { long_name: 'México', short_name: 'MX', types: ['country', 'political'] },
            { long_name: 'Nuevo León', short_name: 'NL', types: ['administrative_area_level_1', 'political'] },
            { long_name: 'Monterrey', short_name: 'Monterrey', types: ['locality', 'political'] },
            { long_name: '64000', short_name: '64000', types: ['postal_code'] }
          ],
          geometry: {
            location: { lat: 25.6866, lng: -100.3161 }
          }
        }
      }
    };

    return fallbackPlaces[placeId] || fallbackPlaces['151197'];
  }

  validateAddress(address: DrenvioAddress): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!address.postal_code || address.postal_code.length < 5) {
      errors.push('Código postal es requerido y debe tener al menos 5 dígitos');
    }

    if (!address.city) {
      errors.push('Ciudad es requerida');
    }

    if (!address.state) {
      errors.push('Estado es requerido');
    }

    if (!address.address || address.address.length < 10) {
      errors.push('Dirección es requerida y debe tener al menos 10 caracteres');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

