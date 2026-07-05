import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contact_id' })
  contactId: string;

  @Column('text')
  text: string;

  @Column({ name: 'is_from_me', default: false })
  isFromMe: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}