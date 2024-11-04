import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}
  private readonly saltRounds = 10;
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.saltRounds);
  }

  async comparePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

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
      name: user.name,
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
