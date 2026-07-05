import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: string;

  @Column()
  name: string;

  @Column({ name: 'phone_number' })
  phoneNumber: string;

  @Column({ nullable: true })
  email: string;

  @Column({ name: 'ai_sentiment_score', default: 0 })
  aiSentimentScore: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}