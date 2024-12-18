import { Controller, Post, Body, Res, Req, Get } from '@nestjs/common';
import { Response, Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  //crear usuario
  @Post('create')
  async createUser(@Body() createUserData: CreateUserDto) {
    return this.usersService.createUser(createUserData);
  }
  //login de usuario
  @Post('login')
  async login(@Body() loginUserData: LoginUserDto, @Res() res: Response) {
    return await this.usersService.login(loginUserData, res);
  }

  @Get('getUser')
  async getUser(@Req() req: Request, @Res() res: Response) {
    return await this.usersService.allowedUser(req, res);
  }
}
