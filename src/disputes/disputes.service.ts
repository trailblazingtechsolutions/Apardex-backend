import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Dispute,
  DisputeStatus,
} from '../admin/entities/dispute.entity';
import { CreateDisputeDto } from '../admin/dto/dispute.dto';

@Injectable()
export class DisputesService {
  constructor(
    @InjectRepository(Dispute)
    private readonly disputeRepo: Repository<Dispute>,
  ) {}

  private generateTicketId(): string {
    return `DIS-${Math.floor(100000 + Math.random() * 900000)}`;
  }

  async createDispute(reportedById: string, dto: CreateDisputeDto): Promise<Dispute> {
    const dispute = this.disputeRepo.create({
      ...dto,
      reportedById,
      ticketId: this.generateTicketId(),
    });
    return this.disputeRepo.save(dispute);
  }

  async getMyDisputes(userId: string): Promise<Dispute[]> {
    return this.disputeRepo.find({
      where: { reportedById: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getMyDisputeById(userId: string, id: string): Promise<Dispute> {
    const dispute = await this.disputeRepo.findOne({
      where: { id, reportedById: userId },
    });
    if (!dispute) throw new NotFoundException('Dispute not found');
    return dispute;
  }

  async cancelDispute(userId: string, id: string): Promise<Dispute> {
    const dispute = await this.getMyDisputeById(userId, id);
    if (dispute.status !== DisputeStatus.OPEN) {
      throw new NotFoundException('Only open disputes can be cancelled');
    }
    dispute.status = DisputeStatus.DISMISSED;
    return this.disputeRepo.save(dispute);
  }
}
