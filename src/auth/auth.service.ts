import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(user: any) {
    const payload: any = {
      userId: user.userId,
      username: user.userName,
      usermail: user.email,
    };
    if (user.table) {
      payload.table = user.table;
    }
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
  async validateUser(payload: any) {
    return this.jwtService.verify(payload);
  }
}
