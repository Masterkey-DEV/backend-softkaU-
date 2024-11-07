import { Injectable } from '@nestjs/common';

@Injectable()
export class GameService {
  generateRandomNumbers = (min: number, max: number, count: number) => {
    const numbers = new Set<number>();
    while (numbers.size < count) {
      const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
      numbers.add(randomNum);
    }
    return Array.from(numbers);
  };

  generateBingoCard(): (number | string)[][] {
    // Generar 5 números para cada columna respetando el rango de cada letra en Bingo
    const columnB: number[] = this.generateRandomNumbers(1, 15, 5);
    const columnI: number[] = this.generateRandomNumbers(16, 30, 5);
    const columnN: (number | string)[] = this.generateRandomNumbers(31, 45, 4);
    const columnG: number[] = this.generateRandomNumbers(46, 60, 5);
    const columnO: number[] = this.generateRandomNumbers(61, 75, 5);

    // Insertar el espacio libre en el centro de la columna N
    columnN.splice(2, 0, 'FREE');

    // Combinar todas las columnas en una tarjeta 5x5
    return [
      [columnB[0], columnI[0], columnN[0], columnG[0], columnO[0]],
      [columnB[1], columnI[1], columnN[1], columnG[1], columnO[1]],
      [columnB[2], columnI[2], columnN[2], columnG[2], columnO[2]],
      [columnB[3], columnI[3], columnN[3], columnG[3], columnO[3]],
      [columnB[4], columnI[4], columnN[4], columnG[4], columnO[4]],
    ];
  }
}
