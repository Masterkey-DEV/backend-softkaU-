import {
  HttpException,
  Injectable,
  NotFoundException,
  ConflictException,
  Req,
  Res,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { User, UserDocument } from '../schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthService } from 'src/auth/auth.service';
import { Response, Request } from 'express';
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private authService: AuthService,
  ) {}

  async createUser(createUserDto: CreateUserDto) {
    const { email, name } = createUserDto;

    const existingUser = await this.userModel.findOne({ name });
    const existingEmail = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('user already exists');
    } else if (existingEmail) {
      throw new ConflictException(' email already exists');
    }
    let { password } = createUserDto;
    password = await this.authService.hashPassword(password);
    createUserDto.password = password;
    const user = await this.userModel.create(createUserDto);
    const userData = {
      userId: user._id,
      name: user.name,
      email: user.email,
    };
    return userData;
  }

  async login(loginUserDto: LoginUserDto, @Res() res: Response) {
    const user = await this.userModel.findOne({ name: loginUserDto.name });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (user.email != loginUserDto.email) {
      throw new NotFoundException('correo no encontrado');
    }
    const isPasswordCorrect = await this.authService.comparePassword(
      loginUserDto.password,
      user.password,
    );
    if (!isPasswordCorrect) {
      throw new HttpException('Contraseña incorrecta', 401);
    }
    const userData = {
      userId: user._id,
      name: user.name,
      email: user.email,
    };
    const { access_token } = await this.authService.sign(userData);
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: true,
    });
    res.send(userData);
  }

  async allowedUser(@Req() req: Request, @Res() res: Response) {
    const { access_token } = req.cookies;
    if (!access_token) {
      throw new HttpException('No hay token de acceso', 401);
    }
    const user = await this.authService.validateUser(access_token);
    if (!user) {
      throw new HttpException('token de acceso inválido', 401);
    }

    res.send('Hola');
  }
}
