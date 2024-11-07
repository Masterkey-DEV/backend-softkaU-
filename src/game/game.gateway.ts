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

  // Variables para controlar intervalos
  private preGameTimerInterval: NodeJS.Timeout | null = null;
  private gameInterval: NodeJS.Timeout | null = null;

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

    const clientAlreadyConnected = Array.from(this.playersActive).some(
      (connectedClient) => connectedClient.userId === user.userId,
    );

    if (clientAlreadyConnected) {
      console.log('El cliente ya está conectado');
      await this.rejoinPlayer(client, user);
      return;
    }
    if (this.gameStarted) {
      console.log('La partida ya ha comenzado');
      client.emit('error', 'game started, wait until the game ends');
      client.disconnect();
      return;
    }

    // Añadir jugador nuevo
    this.playersConnection.add(client);
    this.playerNumber++;
    this.waitPlayers++;
    this.playersActive.add(user);
    this.updateGameStatus();

    // Iniciar temporizador de inicio de partida
    if (this.waitPlayers > 1 && !this.gameStarted && !this.timeStarted) {
      this.timeStarted = true;
      this.startGameTimer();
    } else {
      client.emit(
        'waiting',
        `Waiting for more players... Current: ${this.playerNumber}`,
      );
    }

    // Enviar tarjeta de bingo al cliente
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
      client.disconnect();
      this.server.emit('lose', `has perdido ${user.name} ah ganado`);
      this.endGame();
    } else {
      client.emit('lose', 'Sorry, you did not win. Disconnecting...');
      this.disconnectPlayer(client);
    }
  }

  private async rejoinPlayer(client: Socket, user: UserInterface) {
    this.playersConnection.add(client);
    this.waitPlayers++;
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
    if (this.waitPlayers <= 1 && this.gameStarted) {
      this.server.emit('victory', 'You won the game');
      this.endGame();
    }
  }

  private startGameTimer() {
    let timeLeft = 30;
    this.preGameTimerInterval = setInterval(() => {
      this.server.emit('pre_game_timer', timeLeft);
      timeLeft--;

      if (timeLeft <= 0) {
        if (this.preGameTimerInterval) {
          clearInterval(this.preGameTimerInterval);
          this.preGameTimerInterval = null;
        }
        this.waitPlayers > 1 ? this.emitGameStart() : this.cancelGame();
      }
    }, 1000);
  }

  private emitGameStart() {
    this.server.emit('game_start', 'The game is starting now!');
    this.gameStarted = true;
    let gameTimeLeft = 230;

    this.gameInterval = setInterval(() => {
      gameTimeLeft -= 3;
      const randomNumber = this.generateUniqueRandomNumber();
      this.playedNumbers.add(randomNumber);

      if (this.playedNumbers.size === 75 || gameTimeLeft <= 0) {
        this.endGame();
      } else if (this.playersConnection.size === 1 && this.gameStarted) {
        this.server.emit(
          'victory',
          'you won the game by default no players left',
        );
        this.endGame();
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

    if (this.preGameTimerInterval) {
      clearInterval(this.preGameTimerInterval);
      this.preGameTimerInterval = null;
    }
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }
  }

  async handleDisconnect(client: Socket) {
    if (this.playersConnection.has(client)) {
      this.disconnectPlayer(client);
      this.waitPlayers--;
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
