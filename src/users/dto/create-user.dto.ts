import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsArray,
  IsOptional,
  Length,
} from 'class-validator';
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;
  @IsString()
  @IsEmail()
  email: string;
  @IsString()
  @IsNotEmpty()
  @Length(8, 20)
  password: string;
  @IsArray()
  @IsOptional()
  bingoCard: (string | number)[];
}
