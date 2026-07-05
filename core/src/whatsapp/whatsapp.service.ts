import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '../entities/contact.entity';
import { Message } from '../entities/message.entity';
import { WhatsappGateway } from './whatsapp.gateway';
import axios from 'axios';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly evoUrl = process.env.EVOLUTION_API_URL || 'http://evolution-api:8080';
  private readonly evoKey = process.env.EVOLUTION_API_KEY || 'zeus_pro_evolution_master_key';
  private readonly aiUrl = 'http://ai_engine:8000';

  constructor(
    @InjectRepository(Contact) private contactRepository: Repository<Contact>,
    @InjectRepository(Message) private messageRepository: Repository<Message>,
    private whatsappGateway: WhatsappGateway
  ) {}

  async createInstance(instanceName: string) {
    try {
      const res = await axios.post(`${this.evoUrl}/instance/create`, { instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' }, { headers: { apikey: this.evoKey } });
      return res.data;
    } catch (error) { throw new Error('Falha ao criar instância'); }
  }

  async logoutInstance(instanceName: string) {
    try {
      const res = await axios.delete(`${this.evoUrl}/instance/logout/${instanceName}`, { headers: { apikey: this.evoKey } });
      return { success: true, data: res.data };
    } catch (error) { return { success: false }; }
  }

  async deleteInstance(instanceName: string) {
    try {
      const res = await axios.delete(`${this.evoUrl}/instance/delete/${instanceName}`, { headers: { apikey: this.evoKey } });
      return { success: true, data: res.data };
    } catch (error) { return { success: false }; }
  }

  async configureWebhook(instanceName: string) {
    try {
      // Correção do payload exigido pela Evolution API v1.8+
      const payload = {
        enabled: true,
        url: 'http://core:3000/whatsapp/webhook',
        byEvents: false,
        base64: false,
        events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'MESSAGES_DELETE']
      };
      await axios.post(`${this.evoUrl}/webhook/set/${instanceName}`, payload, { headers: { apikey: this.evoKey } });
      return { success: true };
    } catch (error) {
      this.logger.warn(`Webhook ignorado (Já configurado ou payload rejeitado)`);
      return { success: true };
    }
  }

  async getInstanceStatus(instanceName: string) {
    try {
      const res = await axios.get(`${this.evoUrl}/instance/connectionState/${instanceName}`, { headers: { apikey: this.evoKey } });
      return res.data;
    } catch { return { instance: { state: 'disconnected' } }; }
  }

  async getDeviceContacts(instanceName: string) {
    try {
      const res = await axios.get(`${this.evoUrl}/chat/findContacts/${instanceName}`, { headers: { apikey: this.evoKey } });
      return res.data.filter((c: any) => c.remoteJid && c.remoteJid.endsWith('@s.whatsapp.net')).map((c: any) => ({ name: c.pushName || c.remoteJid.split('@')[0], phoneNumber: c.remoteJid.replace('@s.whatsapp.net', '') }));
    } catch (error) { return []; }
  }

  async createContact(name: string, phoneNumber: string) {
    const cleanPhone = phoneNumber.replace(/\D/g, ''); 
    let contact = await this.contactRepository.findOne({ where: { phoneNumber: cleanPhone } });
    if (!contact) {
      contact = await this.contactRepository.save(this.contactRepository.create({ name, phoneNumber: cleanPhone, aiSentimentScore: 0 }));
    }
    return contact;
  }

  async getContacts() {
    return await this.contactRepository.find({ order: { updatedAt: 'DESC' } });
  }

  async getContactMessages(contactId: string) {
    return await this.messageRepository.find({ where: { contactId }, order: { createdAt: 'ASC' } });
  }

  // --- CORREÇÃO AQUI: Salvamento Otimista ---
  async sendMessage(instanceName: string, number: string, text: string) {
    try {
      // 1. Manda a mensagem pela Evolution API
      const res = await axios.post(
        `${this.evoUrl}/message/sendText/${instanceName}`, 
        { number, options: { presence: 'composing' }, textMessage: { text } }, 
        { headers: { apikey: this.evoKey } }
      );

      // 2. Pega o ID nativo gerado pelo WhatsApp
      const whatsappId = res.data?.key?.id;

      // 3. Garante que o contato existe
      let contact = await this.contactRepository.findOne({ where: { phoneNumber: number } });
      if (!contact) {
        contact = await this.contactRepository.save(this.contactRepository.create({ name: number, phoneNumber: number, aiSentimentScore: 0 }));
      }

      // 4. Salva a mensagem no nosso banco de dados imediatamente!
      const newMessage = await this.messageRepository.save(this.messageRepository.create({
        whatsappId: whatsappId || null,
        contactId: contact.id,
        text: text,
        isFromMe: true,
        status: 'SENT'
      }));

      // 5. Emite para a tela aparecer na hora sem precisar recarregar (Fim do F5!)
      this.whatsappGateway.emitNewMessage(newMessage);

      return res.data;
    } catch (error) {
      this.logger.error('Erro ao enviar mensagem via plataforma', error);
      throw new Error('Falha ao enviar mensagem');
    }
  }

  async processWebhook(body: any) {
    this.logger.log(`📥 Webhook Recebido: ${body.event}`);

    // ==========================================
    // 1. CHEGADA DE NOVA MENSAGEM OU EXCLUSÃO
    // ==========================================
    if (body.event === 'messages.upsert') {
      const data = body.data;
      const remoteJid = data.key.remoteJid;
      
      // Agora bloqueamos APENAS grupos e status. Liberamos @lid (Message Yourself) e humanos (@s.whatsapp.net)
      if (!remoteJid || remoteJid.includes('@g.us') || remoteJid.includes('status@broadcast')) return;

      const whatsappId = data.key.id;
      const phoneNumber = remoteJid.split('@')[0];
      const pushName = data.pushName || 'Contato';
      const isFromMe = data.key.fromMe;

      // 🚨 MENSAGEM APAGADA PARA TODOS (REVOKE) 🚨
      if (data.message?.protocolMessage?.type === 0 || data.message?.protocolMessage?.type === 'REVOKE') {
         const targetId = data.message.protocolMessage.key?.id;
         if (targetId) {
             const msgToDelete = await this.messageRepository.findOne({ where: { whatsappId: targetId } });
             if (msgToDelete) {
                 msgToDelete.isDeleted = true;
                 await this.messageRepository.save(msgToDelete);
                 this.whatsappGateway.server.emit('messageUpdate', { id: msgToDelete.id, isDeleted: true });
                 this.logger.log(`🗑️ Mensagem apagada interceptada e preservada.`);
             }
         }
         return; 
      }

      const messageText = data.message?.conversation || data.message?.extendedTextMessage?.text || '';
      if (!messageText) return;

      const exists = await this.messageRepository.findOne({ where: { whatsappId } });
      if (exists) return;

      let contact = await this.contactRepository.findOne({ where: { phoneNumber } });
      if (!contact) {
        contact = await this.contactRepository.save(this.contactRepository.create({ name: pushName, phoneNumber: phoneNumber }));
        this.whatsappGateway.emitContactUpdate();
      }

      const newMessage = await this.messageRepository.save(this.messageRepository.create({ 
        whatsappId, contactId: contact.id, text: messageText, isFromMe: isFromMe, status: isFromMe ? 'SENT' : 'RECEIVED'
      }));

      this.whatsappGateway.emitNewMessage(newMessage);

      if (!isFromMe) {
        try {
          await axios.post(`${this.aiUrl}/api/ai/analyze-lead`, { contact_id: contact.id, message_text: messageText });
          this.whatsappGateway.emitContactUpdate();
        } catch (error) { this.logger.error('Falha AI:', error.message); }
      }
    }

    // ==========================================
    // 2. CONFIRMAÇÕES DE LEITURA (TICKS AZUIS)
    // ==========================================
    if (body.event === 'messages.update') {
      const data = body.data; // Pode vir como objeto único na v1.8.2
      const status = data.status; // 'DELIVERY_ACK' ou 'READ'
      const whatsappId = data.id;

      if (whatsappId && status) {
         const msgToUpdate = await this.messageRepository.findOne({ where: { whatsappId } });
         if (msgToUpdate && msgToUpdate.status !== 'READ') { // Se já leu, não volta o status
            msgToUpdate.status = status;
            await this.messageRepository.save(msgToUpdate);
            this.whatsappGateway.server.emit('messageUpdate', { id: msgToUpdate.id, status: status });
            this.logger.log(`✅ Status da mensagem atualizado para: ${status}`);
         }
      }
    }
  }
}