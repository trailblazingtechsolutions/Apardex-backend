import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SupportConversation } from './support-conversation.entity';

export enum SenderRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('support_messages')
export class SupportMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => SupportConversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation!: SupportConversation;

  @Column()
  conversationId!: string;

  @Column()
  senderId!: string;

  @Column({ type: 'enum', enum: SenderRole })
  senderRole!: SenderRole;

  @Column({ type: 'text' })
  content!: string;

  @Column({ default: false })
  isRead!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
