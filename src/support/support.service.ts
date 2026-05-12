import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportConversation, ConversationStatus } from './entities/support-conversation.entity';
import { SupportMessage, SenderRole } from './entities/support-message.entity';
import { CreateConversationDto, ReplyMessageDto, ConversationFiltersDto } from './dto/support.dto';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportConversation)
    private readonly conversationRepo: Repository<SupportConversation>,
    @InjectRepository(SupportMessage)
    private readonly messageRepo: Repository<SupportMessage>,
  ) {}

  // ─── User-facing ─────────────────────────────────────────────────────────────

  async createConversation(userId: string, dto: CreateConversationDto): Promise<SupportConversation> {
    const conversation = await this.conversationRepo.save(
      this.conversationRepo.create({ userId, subject: dto.subject }),
    );
    await this.messageRepo.save(
      this.messageRepo.create({
        conversationId: conversation.id,
        senderId: userId,
        senderRole: SenderRole.USER,
        content: dto.message,
      }),
    );
    return conversation;
  }

  async getUserConversations(userId: string): Promise<SupportConversation[]> {
    return this.conversationRepo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  async getUserConversationById(userId: string, id: string) {
    const conversation = await this.conversationRepo.findOne({ where: { id, userId } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    const messages = await this.messageRepo.find({
      where: { conversationId: id },
      order: { createdAt: 'ASC' },
    });
    return { conversation, messages };
  }

  async userReply(userId: string, conversationId: string, dto: ReplyMessageDto) {
    const conversation = await this.conversationRepo.findOne({ where: { id: conversationId, userId } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.status === ConversationStatus.CLOSED) {
      throw new ForbiddenException('This conversation is closed');
    }

    const message = await this.messageRepo.save(
      this.messageRepo.create({
        conversationId,
        senderId: userId,
        senderRole: SenderRole.USER,
        content: dto.content,
      }),
    );
    await this.conversationRepo.update(conversationId, {
      status: ConversationStatus.OPEN,
      isReadByAgent: false,
    });
    return message;
  }

  // ─── Admin/Support Agent ──────────────────────────────────────────────────────

  async getAllConversations(filters: ConversationFiltersDto) {
    const { status, userId, agentId, page = 1, limit = 20 } = filters;
    const qb = this.conversationRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.user', 'user')
      .orderBy('c.updatedAt', 'DESC');

    if (status) qb.andWhere('c.status = :status', { status });
    if (userId) qb.andWhere('c.userId = :userId', { userId });
    if (agentId) qb.andWhere('c.agentId = :agentId', { agentId });

    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const unread = await this.conversationRepo.count({
      where: { isReadByAgent: false, status: ConversationStatus.OPEN },
    });

    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit), unread } };
  }

  async getConversationThread(id: string) {
    const conversation = await this.conversationRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const messages = await this.messageRepo.find({
      where: { conversationId: id },
      order: { createdAt: 'ASC' },
    });

    await this.conversationRepo.update(id, { isReadByAgent: true });
    await this.messageRepo.update({ conversationId: id, senderRole: SenderRole.USER }, { isRead: true });

    return { conversation, messages };
  }

  async agentReply(agentId: string, conversationId: string, dto: ReplyMessageDto) {
    const conversation = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.status === ConversationStatus.CLOSED) {
      throw new ForbiddenException('This conversation is closed');
    }

    const message = await this.messageRepo.save(
      this.messageRepo.create({
        conversationId,
        senderId: agentId,
        senderRole: SenderRole.ADMIN,
        content: dto.content,
      }),
    );
    await this.conversationRepo.update(conversationId, {
      status: ConversationStatus.IN_PROGRESS,
      agentId,
      isReadByAgent: true,
    });
    return message;
  }

  async closeConversation(id: string): Promise<{ message: string }> {
    const conversation = await this.conversationRepo.findOne({ where: { id } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    await this.conversationRepo.update(id, { status: ConversationStatus.CLOSED });
    return { message: 'Conversation closed' };
  }

  async assignConversation(id: string, agentId: string): Promise<{ message: string }> {
    const conversation = await this.conversationRepo.findOne({ where: { id } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    await this.conversationRepo.update(id, {
      agentId,
      status: ConversationStatus.IN_PROGRESS,
    });
    return { message: 'Conversation assigned' };
  }
}
