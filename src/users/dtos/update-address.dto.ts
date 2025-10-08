import { PartialType } from '@nestjs/mapped-types';
import { CreateAddressDto } from './address.dto';

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
