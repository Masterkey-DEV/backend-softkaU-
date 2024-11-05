Proyecto Bingo
hola mi nombres es Juan Sebastian Moreno tengo 19 años soy desarrollador full stack con enfasis en el backend este es mi proyecto para la prueba tecnica de sofkaU

## Tecnologias

- para el desarrollo del backend escogi nest js como framework debido a que es un framework que te obliga a usar buenas praticas y escribir tu codigo de forma modular con la arquitectura mvc
- use mongoDB como db porque no habia necesidad de utilizar una db relacional bajo mi parecer
- use websockets para comunicar a los jugadores

# Descripción

- el backend del juego fue hecho utilizando nest.js y websockets y una db en mongodb
- registro y login de usuarios
- encriptacion de datos
- cuenta con autenticacion atraves de cookies y webtokens
- guards para controlar el acceso a los websockets
- logica de juego para generar la targeta de bingo y verificar si el usuario gano
- avisos de error y notificaciones a través de websockets

## funciionamiento

- el frontend se conecta a la api de nest.js y se envía el token de autenticación en caso de tener una cuenta ya registrada esto se hace atraves de la ruta /api/auth/login para login y /api/auth/register para registrarse
- cuando el usuario se autentica, se le asigna un token de autenticación
- una vez autenticado, el usuario puede entrar jugar al bingo a través de websockets atraves de la ruta /api y el token de autenticación se envia en la cabecera de la petición en las cookies
- si ya hay una partida en curso, el usuario sera notificado y desconectado
- de no haber una partida en curso, se agrega el jugador a los jgadores conectados y en espera ademas se le genera una targeta de bingo para esta partida
- se espera 30 segundos a la conexion de mas jugadores para comenzar la partida si solo se conecta un jugador, el temporizador no da inicio, si se conecta mas de un jugador pero al comenzar la partida solo hay uno o menos se le notifica que la partida no puede coenzar por falta de jugadores se desconecta y reinicia
- si durante la partida el usuario juega bingo y no gana el juego, se le notifica y se desconecta
- si el usuario gana, se le notifica a el de su victoria y a el resto de jugaores de su derrota y se desconectan
- si durante la partida no hay jugadores suficientes para tener un juego en condiciones (que sea mas de un jugador) el ultimo jugador gana automaticamente la partida por defecto
- si el juego termina por el tiemo limite de juego (en este caso el justo para que s ejueguen todos los numeros posibles) se le notifica a los jugadores del empate y se desconectan
