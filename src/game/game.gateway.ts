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
@WebSocketGateway()
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private playerNumber: number = 0; //numero de jugadores conectados
  private waitPlayers: number = 0; // numero de jugadores esperando
  private playedNumbers: Set<number> = new Set(); // numeros aleatorios que se han jugado
  private playersActive: Set<string> = new Set(); // Almacena los IDs de jugadores activos
  private gameStarted: boolean = false; // si el juego ha comenzado

  constructor(
    private readonly gameService: GameService,
    @Inject(WsGuard) private readonly wsGuard: WsGuard,
  ) {}

  async handleConnection(client: Socket) {
    // Autoriza la conexión del usuario en base al token JWT
    const user = await this.wsGuard.canActivate(
      this.createExecutionContext(client),
    );
    if (!user || this.playersActive.has(user.userId)) {
      client.emit('error', 'unauthorized');
      client.disconnect();
      return;
    } else if (this.gameStarted) {
      client.emit('error', 'game started wait until the game ends');
      client.disconnect();
      return;
    }

    // Aumenta el número de jugadores activos y los agrega al set de jugadores
    this.playerNumber++;
    this.playersActive.add(user.userId);
    this.gameStatus();

    // Si el juego no ha comenzado, espera a que haya más de un jugador
    this.waitPlayers++;
    if (!this.gameStarted && this.waitPlayers > 1) {
      this.startGameTimer();
    } else {
      this.server.emit(
        'waiting',
        `Waiting for more players... Current: ${this.playerNumber}`,
      );
    }

    // Genera y envía la tarjeta de bingo del jugador
    const userPlayer = await this.gameService.addBingoCard(user);
    client.emit('game-card', userPlayer.bingoCard);
  }

  @SubscribeMessage('iWin')
  async handleWinner(client: Socket) {
    // Verifica la tarjeta del jugador cuando envía el mensaje 'iWin'
    const user = await this.wsGuard.canActivate(
      this.createExecutionContext(client),
    );
    if (!user) {
      client.emit('error', 'unauthorized');
      return;
    }
    // obteneems la tarjeta (balota) del jugador
    const playerBingoCard = await this.gameService.getBingoCard(user);
    // verificamos si el jugador ha ganado
    if (this.gameService.checkWin(playerBingoCard, this.playedNumbers)) {
      client.emit('win', 'Congratulations, you have won!');
      // ush gano pues se acabo el juego
      this.endGame();
    } else {
      // no gano pailas se fue de la partida
      client.emit('lose', 'Sorry, you did not win. Disconnecting...');
      this.removePlayer(client, user);
    }
  }

  async gameStatus() {
    // Envía el estado actual de la cantidad de jugadores en línea
    this.server.emit(
      'game_status',
      `Current players online: ${this.playerNumber}`,
    );
  }

  private startGameTimer() {
    // Inicia el temporizador previo al inicio del juego
    this.gameStarted = true;
    let timeLeft = 30;

    const interval = setInterval(() => {
      this.server.emit('pre_game_timer', timeLeft);
      timeLeft--;

      if (timeLeft <= 0 && this.waitPlayers > 1) {
        clearInterval(interval);
        this.emitGameStart();
      } else if (timeLeft <= 0 && this.waitPlayers <= 1) {
        clearInterval(interval);
        this.server.emit('game_start', 'srry not enough players');
        this.endGame();
      }
    }, 1000);
  }

  private emitGameStart() {
    // Inicia el juego y envía números aleatorios a los clientes
    this.server.emit('game_start', 'The game is starting now!');
    let gameTimeLeft = 230; // 3min y poco mas

    const interval = setInterval(() => {
      gameTimeLeft -= 3; // esto debe de coincidir con el intervalo de la función startGameTimer ;)
      let randomNumber;
      do {
        randomNumber = Math.floor(Math.random() * 75) + 1;
        console.log(randomNumber);
        console.log(this.playedNumbers.has(randomNumber));
        this.playedNumbers.add(randomNumber);
      } while (!this.playedNumbers.has(randomNumber));

      this.server.emit('numbers_played', {
        number: randomNumber,
      });
      this.server.emit('game_time_left', gameTimeLeft);

      if (gameTimeLeft <= 0) {
        clearInterval(interval);
        this.endGame();
      }
    }, 3000); // 3s
  }

  private endGame() {
    // Finaliza el juego y limpia los recursos necesarios
    this.server.emit('game_end', 'The game has ended.');
    this.playedNumbers.clear();
    this.playersActive.clear();
    this.gameStarted = false;
    this.playerNumber = 0;
    this.waitPlayers = 0;
  }

  async handleDisconnect(client: Socket) {
    // Maneja la desconexión de un cliente y limpia sus datos
    const user = await this.wsGuard.canActivate(
      this.createExecutionContext(client),
    );
    if (user) {
      this.removePlayer(client, user);
    }

    console.log('Client disconnected:', client.id);
  }

  private removePlayer(client: Socket, user: UserInterface) {
    // Elimina al jugador del juego y actualiza el estado de jugadores activos
    // this.playersActive.delete(user.userId); // no podemos quitarlo de la lista de usuarios activos porque podria volver a ingresar
    this.gameService.removeBingoCard(user);
    if (this.playerNumber > 0) {
      this.playerNumber--;
    }
    this.waitPlayers = Math.max(0, this.waitPlayers - 1);
    client.disconnect();
    this.gameStatus();
  }

  private createExecutionContext(client: Socket): ExecutionContext {
    // Crea un contexto de ejecución simulado para que WsGuard pueda autenticar usuarios
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
