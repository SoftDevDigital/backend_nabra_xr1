export class CategoryResponseDto {
  category: string;
  count: number;
}

export class CategoryProductsResponseDto {
  products: any[];
  total: number;
  page: number;
  totalPages: number;
}

export class CategoryStatsResponseDto {
  category: string;
  totalProducts: number;
  priceRange: {
    min: number;
    max: number;
  };
  averagePrice: number;
  availableSizes: string[];
  featuredProducts: number;
  preorderProducts: number;
}
