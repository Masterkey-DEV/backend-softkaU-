import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseGuards, ExecutionContext, Inject } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsGuard } from './game.guard';
import { UserInterface } from 'src/auth/interfaces/user.interface';
import { GameService } from './game.service';

@UseGuards(WsGuard)
@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private playerNumber = 0;
  private waitPlayers = 0;
  private playedNumbers = new Set<number>();
  private playersActive = new Set<UserInterface>();
  private playersConnection = new Set<Socket>();
  private gameStarted = false;
  private timeStarted = false;

  constructor(
    private readonly gameService: GameService,
    @Inject(WsGuard) private readonly wsGuard: WsGuard,
  ) {}

  async handleConnection(client: Socket) {
    const user = await this.authenticateUser(client);
    if (!user) {
      client.disconnect();
      return;
    }

    // Evita contar conexiones duplicadas
    const clientAlreadyConnected = Array.from(this.playersActive).some(
      (connectedClient) => connectedClient.userId === user.userId,
    );

    if (clientAlreadyConnected) {
      console.log('El cliente ya está conectado');
      await this.rejoinPlayer(client, user);
    } else if (this.gameStarted) {
      console.log('La partida ya ha comenzado');
      client.emit('error', 'game started, wait until the game ends');
      client.disconnect();
    }

    // Agrega nuevo jugador
    this.playersConnection.add(client);
    this.playerNumber++;
    this.waitPlayers++;
    this.playersActive.add(user);
    this.updateGameStatus();

    if (this.waitPlayers > 1 && !this.gameStarted && !this.timeStarted) {
      this.timeStarted = true;
      this.startGameTimer();
    } else {
      client.emit(
        'waiting',
        `Waiting for more players... Current: ${this.playerNumber}`,
      );
    }

    // Genera y envía la tarjeta de bingo
    const userPlayer = await this.gameService.addBingoCard(user);
    client.emit('game_card', userPlayer.bingoCard);
    console.log('Tarjeta de bingo generada');
  }

  @SubscribeMessage('iWin')
  async handleWinner(client: Socket) {
    const user = await this.authenticateUser(client);
    if (!user) {
      client.disconnect();
      return;
    }

    const playerBingoCard = await this.gameService.getCurrentBingoCard(user);
    if (this.gameService.checkWin(playerBingoCard, this.playedNumbers)) {
      client.emit('victory', 'Congratulations, you have won!');
      this.server.emit('lose', 'Sorry, you lost.');
      this.endGame();
    } else {
      client.emit('lose', 'Sorry, you did not win. Disconnecting...');
      client.disconnect();
      this.disconnectPlayer(client);
    }
  }

  private async rejoinPlayer(client: Socket, user: UserInterface) {
    this.playersConnection.add(client);
    const currentBingoCard = await this.gameService.getCurrentBingoCard(user);
    client.emit('game_card', currentBingoCard);
    this.updateGameStatus();
  }

  private async authenticateUser(
    client: Socket,
  ): Promise<UserInterface | null> {
    const user = await this.wsGuard.canActivate(
      this.createExecutionContext(client),
    );
    if (!user) {
      client.emit('error', "unauthorized, you're not allowed to play");
      client.disconnect();
    }
    return user;
  }

  private updateGameStatus() {
    this.server.emit('current_players', this.playersConnection.size);
    if (this.playersConnection.size == 1 && this.gameStarted) {
      this.server.emit('victory', 'You won the game');
      this.endGame();
    }
  }

  private startGameTimer() {
    let timeLeft = 30;
    const interval = setInterval(() => {
      this.server.emit('pre_game_timer', timeLeft);
      timeLeft--;

      if (timeLeft <= 0) {
        clearInterval(interval);
        this.waitPlayers > 1 ? this.emitGameStart() : this.cancelGame();
      }
    }, 1000);
  }

  private emitGameStart() {
    this.server.emit('game_start', 'The game is starting now!');
    this.gameStarted = true;
    let gameTimeLeft = 230;

    const interval = setInterval(() => {
      gameTimeLeft -= 3;
      const randomNumber = this.generateUniqueRandomNumber();
      this.playedNumbers.add(randomNumber);

      if (this.playedNumbers.size === 75 || gameTimeLeft <= 0) {
        this.endGame();
        clearInterval(interval);
      }
      if (this.playersConnection.size == 1 && this.gameStarted) {
        this.server.emit(
          'victory',
          'you won the game by default no players left',
        );
      } else {
        this.server.emit('number_played', randomNumber);
        this.server.emit('game_time_left', gameTimeLeft);
      }
    }, 5000);
  }

  private generateUniqueRandomNumber(): number {
    let randomNumber;
    do {
      randomNumber = Math.floor(Math.random() * 75) + 1;
    } while (this.playedNumbers.has(randomNumber));
    return randomNumber;
  }

  private endGame() {
    this.server.emit('game_end', 'The game has ended.');
    for (const connection of this.playersConnection) {
      connection.disconnect();
    }
    this.resetGameState();
  }

  private cancelGame() {
    this.server.emit('game_start', 'Sorry, not enough players.');
    this.endGame();
  }

  private resetGameState() {
    this.gameService.deleteAllBingoCards();
    this.playersConnection.clear();
    this.playedNumbers.clear();
    this.playersActive.clear();
    this.gameStarted = false;
    this.timeStarted = false;
    this.playerNumber = 0;
    this.waitPlayers = 0;
  }

  async handleDisconnect(client: Socket) {
    if (this.playersConnection.has(client)) {
      this.disconnectPlayer(client);
    }
  }

  private disconnectPlayer(client: Socket) {
    this.playersConnection.delete(client);
    this.updateGameStatus();
    client.disconnect();
  }

  private createExecutionContext(client: Socket): ExecutionContext {
    return {
      switchToHttp: () => null,
      switchToWs: () => ({
        getClient: () => client,
        getData: () => null,
      }),
      getHandler: () => null,
      getClass: () => null,
    } as ExecutionContext;
  }
}
