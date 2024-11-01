export const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET not set bitch');
}

export const winningCombinations = [
  // Horizontales
  [0, 1, 2, 3, 4], // Fila 1
  [5, 6, 7, 8, 9], // Fila 2
  [10, 11, 12, 13, 14], // Fila 3
  [15, 16, 17, 18, 19], // Fila 4
  [20, 21, 22, 23, 24], // Fila 5

  // Verticales
  [0, 5, 10, 15, 20], // Columna 1
  [1, 6, 11, 16, 21], // Columna 2
  [2, 7, 12, 17, 22], // Columna 3
  [3, 8, 13, 18, 23], // Columna 4
  [4, 9, 14, 19, 24], // Columna 5

  // Diagonales
  [0, 6, 12, 18, 24], // Diagonal de izquierda a derecha
  [4, 8, 12, 16, 20], // Diagonal de derecha a izquierda

  // Esquinas
  [0, 4, 20, 24], // Las cuatro esquinas
];
