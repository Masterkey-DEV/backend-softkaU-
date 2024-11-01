import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { GameService } from './game.service';
import { Server, Socket } from 'socket.io';
import { emit } from 'process';

@WebSocketGateway()
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly gameService: GameService) {}

  handleConnection(client: Socket) {
    const cookies = client.handshake.headers.cookie;
    console.log('Cliente conectado:', client.id);
    console.log(cookies);
    return 'Hola';
  }

  handleDisconnect(client: Socket) {
    console.log('Cliente desconectado:', client.id);
  }
}
