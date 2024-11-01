import { IsNotEmpty, IsString, IsEmail } from 'class-validator';
export class LoginUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;
  @IsString()
  @IsEmail()
  email: string;
  @IsString()
  @IsNotEmpty()
  password: string;
}
