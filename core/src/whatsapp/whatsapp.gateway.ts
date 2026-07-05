import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' } }) // Permite que o Next.js se conecte
export class WhatsappGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('WhatsappGateway');

  handleConnection(client: Socket) {
    this.logger.log(`⚡ Frontend Conectado no WebSocket: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Frontend Desconectado: ${client.id}`);
  }

  // Envia a nova mensagem direto para a tela do usuário em milissegundos
  emitNewMessage(message: any) {
    this.server.emit('newMessage', message);
  }

  // Notifica o frontend para puxar a lista de contatos atualizada (ex: novo lead)
  emitContactUpdate() {
    this.server.emit('contactUpdate');
  }
}