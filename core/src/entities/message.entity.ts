import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'whatsapp_id', unique: true, nullable: true })
  whatsappId: string;

  @Column({ name: 'contact_id' })
  contactId: string;

  @Column('text')
  text: string;

  @Column({ name: 'is_from_me', default: false })
  isFromMe: boolean;

  @Column({ default: 'SENT' })
  status: string; // PENDING, SENT, DELIVERED, READ

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}