import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  async send(senderId: string, dto: SendMessageDto): Promise<Message> {
    const message = this.messageRepository.create({
      senderId,
      receiverId: dto.receiverId,
      propertyId: dto.propertyId ?? null,
      content: dto.content,
    });
    return this.messageRepository.save(message);
  }

  async getConversation(
    userId: string,
    otherUserId: string,
  ): Promise<Message[]> {
    return this.messageRepository
      .createQueryBuilder('message')
      .where(
        '(message.senderId = :userId AND message.receiverId = :otherId) OR (message.senderId = :otherId AND message.receiverId = :userId)',
        { userId, otherId: otherUserId },
      )
      .orderBy('message.createdAt', 'ASC')
      .getMany();
  }

  async getInbox(userId: string): Promise<Message[]> {
    return this.messageRepository
      .createQueryBuilder('message')
      .where('message.receiverId = :userId', { userId })
      .orderBy('message.createdAt', 'DESC')
      .getMany();
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.messageRepository.count({
      where: { receiverId: userId, isRead: false },
    });
    return { count };
  }

  async markAsRead(userId: string, otherUserId: string): Promise<void> {
    await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ isRead: true })
      .where(
        'receiverId = :userId AND senderId = :otherUserId AND isRead = false',
        {
          userId,
          otherUserId,
        },
      )
      .execute();
  }
}
