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
import { PasswordService } from './password/password.service';
import { AuthService } from 'src/auth/auth.service';
import { Response, Request } from 'express';
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private passwordService: PasswordService,
    private authService: AuthService,
  ) {}

  async createUser(createUserDto: CreateUserDto) {
    const { email } = createUserDto;

    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está en uso.');
    }
    let { password } = createUserDto;
    password = await this.passwordService.hashPassword(password);
    createUserDto.password = password;
    return this.userModel.create(createUserDto);
  }

  async login(loginUserDto: LoginUserDto, @Res() res: Response) {
    const user = await this.userModel.findOne({ email: loginUserDto.email });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const isPasswordCorrect = await this.passwordService.comparePassword(
      loginUserDto.password,
      user.password,
    );
    if (!isPasswordCorrect) {
      throw new HttpException('Contraseña incorrecta', 401);
    }
    const userData = {
      userId: user._id,
      userName: user.name,
      password: user.password,
      email: user.email,
    };
    const { access_token } = await this.authService.sign(userData);
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: true,
    });
    res.send(userData);
  }

  async getTable(@Req() req: Request, @Res() res: Response) {
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
