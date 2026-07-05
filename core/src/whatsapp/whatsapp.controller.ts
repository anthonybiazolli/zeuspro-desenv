import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('instance/create')
  async createInstance(@Body('instanceName') instanceName: string) {
    return await this.whatsappService.createInstance(instanceName);
  }

  @Post('instance/logout')
  async logoutInstance(@Body('instanceName') instanceName: string) {
    return await this.whatsappService.logoutInstance(instanceName);
  }

  @Post('instance/delete')
  async deleteInstance(@Body('instanceName') instanceName: string) {
    return await this.whatsappService.deleteInstance(instanceName);
  }

  @Post('webhook/force-config')
  async forceWebhookConfig(@Body('instanceName') instanceName: string) {
    return await this.whatsappService.configureWebhook(instanceName);
  }

  @Get('status/:instanceName')
  async getStatus(@Param('instanceName') instanceName: string) {
    return await this.whatsappService.getInstanceStatus(instanceName);
  }

  // --- ROTA CORRIGIDA (Resolve o erro 404 do console) ---
  @Get('device-contacts/:instanceName')
  async getDeviceContacts(@Param('instanceName') instanceName: string) {
    return await this.whatsappService.getDeviceContacts(instanceName);
  }

  @Post('contact')
  async createContact(@Body() body: { name: string; phoneNumber: string }) {
    return await this.whatsappService.createContact(body.name, body.phoneNumber);
  }

  @Get('contacts')
  async getContacts() {
    return await this.whatsappService.getContacts();
  }

  @Get('messages/:contactId')
  async getMessages(@Param('contactId') contactId: string) {
    return await this.whatsappService.getContactMessages(contactId);
  }

  @Post('message/send')
  async sendMessage(@Body() body: { instanceName: string; number: string; text: string }) {
    return await this.whatsappService.sendMessage(body.instanceName, body.number, body.text);
  }

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    this.whatsappService.processWebhook(body);
    return { success: true };
  }
}