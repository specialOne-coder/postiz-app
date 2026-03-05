import { IsDefined, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateViralsCustomerDto {
  @IsString()
  @IsDefined()
  @MinLength(1)
  @MaxLength(255)
  externalId: string;
}
