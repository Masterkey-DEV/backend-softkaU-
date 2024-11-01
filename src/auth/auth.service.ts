import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async decode(token: string) {
    try {
      const decoded = this.jwtService.verify(token);
      return decoded;
    } catch (error) {
      return null;
    }
  }

  async sign(user: any) {
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

  async validateUser(token: string) {
    try {
      const decoded = this.jwtService.verify(token);
      return true;
    } catch (error) {
      return null;
    }
  }
}
