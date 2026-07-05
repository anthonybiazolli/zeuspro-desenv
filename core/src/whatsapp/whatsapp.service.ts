import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '../entities/contact.entity';
import { Message } from '../entities/message.entity';
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
  ) {}

  async createInstance(instanceName: string) {
    try {
      const response = await axios.post(`${this.evoUrl}/instance/create`, {
        instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS'
      }, { headers: { apikey: this.evoKey, 'Content-Type': 'application/json' } });
      return response.data;
    } catch (error) {
      throw new Error('Falha ao criar instância');
    }
  }

  async logoutInstance(instanceName: string) {
    try {
      const response = await axios.delete(`${this.evoUrl}/instance/logout/${instanceName}`, { headers: { apikey: this.evoKey } });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Falha ao desconectar' };
    }
  }

  async deleteInstance(instanceName: string) {
    try {
      const response = await axios.delete(`${this.evoUrl}/instance/delete/${instanceName}`, { headers: { apikey: this.evoKey } });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Falha ao excluir' };
    }
  }

  async configureWebhook(instanceName: string) {
    try {
      const payload = {
        webhook: { enabled: true, url: 'http://core:3000/whatsapp/webhook', byEvents: false, base64: false, events: ['MESSAGES_UPSERT'] }
      };
      await axios.post(`${this.evoUrl}/webhook/set/${instanceName}`, payload, { headers: { apikey: this.evoKey, 'Content-Type': 'application/json' } });
      return { success: true };
    } catch (error) {
      this.logger.error('Erro Webhook:', error.message);
    }
  }

  async getInstanceStatus(instanceName: string) {
    try {
      const response = await axios.get(`${this.evoUrl}/instance/connectionState/${instanceName}`, { headers: { apikey: this.evoKey } });
      return response.data;
    } catch (error) {
      return { instance: { state: 'disconnected' } };
    }
  }

  // --- NOVO: Criação manual de contato pelo painel ---
  async createContact(name: string, phoneNumber: string) {
    // Remove qualquer caractere que não seja número
    const cleanPhone = phoneNumber.replace(/\D/g, ''); 
    let contact = await this.contactRepository.findOne({ where: { phoneNumber: cleanPhone } });
    if (!contact) {
      contact = this.contactRepository.create({ name, phoneNumber: cleanPhone, aiSentimentScore: 0 });
      contact = await this.contactRepository.save(contact);
    }
    return contact;
  }

  async getContacts() {
    return await this.contactRepository.find({ order: { updatedAt: 'DESC' } });
  }

  async getContactMessages(contactId: string) {
    return await this.messageRepository.find({ where: { contactId }, order: { createdAt: 'ASC' } });
  }

  async sendMessage(instanceName: string, number: string, text: string) {
    try {
      const response = await axios.post(
        `${this.evoUrl}/message/sendText/${instanceName}`,
        { number, options: { presence: 'composing' }, textMessage: { text } },
        { headers: { apikey: this.evoKey, 'Content-Type': 'application/json' } },
      );
      
      const contact = await this.contactRepository.findOne({ where: { phoneNumber: number } });
      if (contact) {
        const newMessage = this.messageRepository.create({ contactId: contact.id, text: text, isFromMe: true });
        await this.messageRepository.save(newMessage);
      }
      return response.data;
    } catch (error) {
      this.logger.error('Erro ao enviar mensagem:', error.message);
      throw new Error('Falha ao enviar mensagem');
    }
  }

  async processWebhook(body: any) {
    if (body.event === 'messages.upsert') {
      const data = body.data;
      if (data.key.fromMe) return;

      const remoteJid = data.key.remoteJid;
      
      // --- A GRANDE FAXINA: Filtra TUDO que não for uma pessoa real ---
      if (!remoteJid || !remoteJid.endsWith('@s.whatsapp.net')) {
        return; // Ignora grupos (@g.us), status (@broadcast) e linked devices (@lid)
      }

      const phoneNumber = remoteJid.replace('@s.whatsapp.net', '');
      const pushName = data.pushName || 'Lead Desconhecido';
      const messageText = data.message?.conversation || data.message?.extendedTextMessage?.text || '';
      
      if (!messageText) return;

      let contact = await this.contactRepository.findOne({ where: { phoneNumber } });
      if (!contact) {
        contact = this.contactRepository.create({ name: pushName, phoneNumber: phoneNumber });
        contact = await this.contactRepository.save(contact);
      }

      const newMessage = this.messageRepository.create({ contactId: contact.id, text: messageText, isFromMe: false });
      await this.messageRepository.save(newMessage);

      try {
        await axios.post(`${this.aiUrl}/api/ai/analyze-lead`, { contact_id: contact.id, message_text: messageText });
      } catch (error) {
        this.logger.error('⚠️ Falha AI Engine:', error.message);
      }
    }
  }
}