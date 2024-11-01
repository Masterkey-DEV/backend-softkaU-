import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import * as cookie from 'cookie';
import { UserInterface } from 'src/auth/interfaces/user.interface';

@Injectable()
export class WsGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<UserInterface | any> {
    console.log('He pasado por el guard');
    const cookies = context.switchToWs().getClient().handshake.headers.cookie;
    if (!cookies) {
      return null;
    }

    const parsedCookies = cookie.parse(cookies);
    const userToken = parsedCookies['access_token'];

    if (!userToken) {
      return null;
    }
    const isAuthenticated = await this.authService.validateUser(userToken);
    if (!isAuthenticated) return null;
    const user = await this.authService.decode(userToken);
    if (!user) return null;
    return user;
  }
}
