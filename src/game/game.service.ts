import { Injectable } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { UserInterface } from 'src/auth/interfaces/user.interface';

@Injectable()
export class GameService {
  private numbersPlayed: Set<number> = new Set();

  constructor(
    private authService: AuthService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}
  async getBingoCard(user: UserInterface) {
    const userPlayer = await this.userModel.findById(user.userId);
    return userPlayer.bingoCard;
  }
  async getCurrentBingoCard(user: UserInterface) {
    const userPlayer = await this.userModel.findById(user.userId);
    return userPlayer.bingoCard;
  }

  deleteAllBingoCards() {
    this.userModel.updateMany({}, { bingoCard: [] });
  }

  async addBingoCard(user: UserInterface) {
    const newBingoCard = await this.generateBingoCard();
    user.bingoCard = newBingoCard;
    const userPlayer = await this.userModel.findByIdAndUpdate(
      user.userId,
      {
        bingoCard: newBingoCard,
      },
      { new: true },
    );
    return userPlayer;
  }
  async removeBingoCard(user: UserInterface) {
    const userPlayer = await this.userModel.findById(user.userId);
    userPlayer.bingoCard = [];
    await this.userModel.findByIdAndUpdate(user.userId, {
      bingoCard: [],
    });
    return true;
  }
  generateRandomNumbers(min: number, max: number, count: number): number[] {
    const numbers = new Set<number>();
    while (numbers.size < count) {
      const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
      numbers.add(randomNum);
    }
    return Array.from(numbers);
  }

  generateBingoCard(): (number | string)[][] {
    const columnB: number[] = this.generateRandomNumbers(1, 15, 5);
    const columnI: number[] = this.generateRandomNumbers(16, 30, 5); // Uno menos para el espacio libre
    const columnN: (number | string)[] = this.generateRandomNumbers(31, 45, 4);
    const columnG: number[] = this.generateRandomNumbers(46, 60, 5);
    const columnO: number[] = this.generateRandomNumbers(61, 75, 5); // Uno menos para el espacio libre

    columnN.splice(2, 0, 'FREE');

    return [
      [columnB[0], columnI[0], columnN[0], columnG[0], columnO[0]],
      [columnB[1], columnI[1], columnN[1], columnG[1], columnO[1]],
      [columnB[2], columnI[2], columnN[2], columnG[2], columnO[2]],
      [columnB[3], columnI[3], columnN[3], columnG[3], columnO[3]],
      [columnB[4], columnI[4], columnN[4], columnG[4], columnO[4]],
    ];
  }
  checkWin(
    bingoCard: (number | string)[][],
    numbersPlayed: Set<number>,
  ): boolean {
    const hasNumber = (num: number | string) =>
      num === 'FREE' || numbersPlayed.has(num as number);

    for (let i = 0; i < 5; i++) {
      // Check rows
      if (bingoCard[i].every(hasNumber)) return true;
      // Check columns
      if ([0, 1, 2, 3, 4].map((j) => bingoCard[j][i]).every(hasNumber))
        return true;
    }
    // Check diagonals
    if ([0, 1, 2, 3, 4].map((i) => bingoCard[i][i]).every(hasNumber))
      return true;
    if ([0, 1, 2, 3, 4].map((i) => bingoCard[i][4 - i]).every(hasNumber))
      return true;

    return false;
  }
}
