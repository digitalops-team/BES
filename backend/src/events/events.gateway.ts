import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    console.log('WebSocket Gateway inicializado');
  }

  handleConnection(client: Socket) {
    console.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
  }

  // Método para emitir eventos a un cliente específico o a todos
  emitToUser(usuarioId: string, event: string, data: any) {
    // Por simplicidad, aquí emitimos a todos. En producción,
    // se recomienda usar "rooms" para aislar los sockets por usuarioId.
    this.server.emit(`${event}-${usuarioId}`, data);
  }
}
