import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KycStatus, User, UserRole } from '../user/user.entity';
import { HostPayoutMethod } from './entities/host-payout-method.entity';
import { HostPayout } from './entities/host-payout.entity';
import { HostPreferences } from './entities/host-preferences.entity';
import { HostDocument } from './entities/host-document.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { AddPayoutMethodDto } from './dto/payout-method.dto';
import { PayoutPreferenceDto } from './dto/payout-preference.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';

@Injectable()
export class HostService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(HostPayoutMethod)
    private readonly payoutMethodRepo: Repository<HostPayoutMethod>,
    @InjectRepository(HostPayout)
    private readonly payoutRepo: Repository<HostPayout>,
    @InjectRepository(HostPreferences)
    private readonly prefsRepo: Repository<HostPreferences>,
    @InjectRepository(HostDocument)
    private readonly documentRepo: Repository<HostDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private async assertHost(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.HOST)
      throw new ForbiddenException('Host access only');
    return user;
  }

  // ─── Payout Methods ─────────────────────────────────────────────────────────

  async getPayoutMethods(hostId: string): Promise<HostPayoutMethod[]> {
    return this.payoutMethodRepo.find({
      where: { hostId },
      order: { createdAt: 'ASC' },
    });
  }

  async addPayoutMethod(
    hostId: string,
    dto: AddPayoutMethodDto,
  ): Promise<HostPayoutMethod> {
    const count = await this.payoutMethodRepo.count({ where: { hostId } });
    const method = this.payoutMethodRepo.create({
      ...dto,
      hostId,
      isDefault: count === 0,
    });
    return this.payoutMethodRepo.save(method);
  }

  async setDefaultPayoutMethod(
    hostId: string,
    id: string,
  ): Promise<HostPayoutMethod> {
    const method = await this.payoutMethodRepo.findOne({
      where: { id, hostId },
    });
    if (!method) throw new NotFoundException('Payout method not found');
    await this.payoutMethodRepo.update({ hostId }, { isDefault: false });
    await this.payoutMethodRepo.update(id, { isDefault: true });
    return this.payoutMethodRepo.findOne({
      where: { id },
    }) as Promise<HostPayoutMethod>;
  }

  async removePayoutMethod(
    hostId: string,
    id: string,
  ): Promise<{ message: string }> {
    const method = await this.payoutMethodRepo.findOne({
      where: { id, hostId },
    });
    if (!method) throw new NotFoundException('Payout method not found');
    await this.payoutMethodRepo.remove(method);
    if (method.isDefault) {
      const next = await this.payoutMethodRepo.findOne({ where: { hostId } });
      if (next)
        await this.payoutMethodRepo.update(next.id, { isDefault: true });
    }
    return { message: 'Payout method removed' };
  }

  // ─── Payout Preferences ─────────────────────────────────────────────────────

  async getPayoutPreferences(hostId: string): Promise<HostPreferences> {
    const existing = await this.prefsRepo.findOne({ where: { hostId } });
    if (existing) return existing;
    return this.prefsRepo.save(this.prefsRepo.create({ hostId }));
  }

  async updatePayoutPreferences(
    hostId: string,
    dto: PayoutPreferenceDto,
  ): Promise<HostPreferences> {
    let prefs = await this.prefsRepo.findOne({ where: { hostId } });
    if (!prefs) prefs = this.prefsRepo.create({ hostId });
    Object.assign(prefs, dto);
    return this.prefsRepo.save(prefs);
  }

  // ─── Payout History ─────────────────────────────────────────────────────────

  async getPayouts(hostId: string): Promise<HostPayout[]> {
    return this.payoutRepo.find({
      where: { hostId },
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Documents ──────────────────────────────────────────────────────────────

  async getDocuments(hostId: string) {
    const user = await this.assertHost(hostId);
    const additionalDocs = await this.documentRepo.find({
      where: { hostId },
      order: { createdAt: 'ASC' },
    });

    type DocEntry = {
      id: string | null;
      documentUrl: string;
      documentType: string | null;
      isVerified: boolean;
      createdAt: Date;
    };
    const docs: DocEntry[] = [];
    if (user.documentUrl) {
      docs.push({
        id: null,
        documentUrl: user.documentUrl,
        documentType: 'registration_document',
        isVerified: user.isDocumentVerified,
        createdAt: user.createdAt,
      });
    }
    for (const d of additionalDocs) {
      docs.push({
        id: d.id,
        documentUrl: d.documentUrl,
        documentType: d.documentType,
        isVerified: d.isVerified,
        createdAt: d.createdAt,
      });
    }
    return docs;
  }

  /**
   * KYC document submission, done from the host's profile rather than at signup.
   * Saving a HostDocument is what surfaces the host in the admin KYC queue
   * (see AdminService.getKycQueue).
   */
  async uploadDocument(
    hostId: string,
    dto: UploadDocumentDto,
    file: Express.Multer.File,
  ) {
    const host = await this.assertHost(hostId);
    if (!file) throw new BadRequestException('Document file is required');

    const result = await this.cloudinaryService.uploadFile(file, 'documents');
    const doc = await this.documentRepo.save(
      this.documentRepo.create({
        hostId,
        documentUrl: result.secure_url,
        documentType: dto.documentType ?? null,
        isVerified: false,
      }),
    );

    // A rejected host who submits a new document is resubmitting — put them
    // back in the pending queue so reviewers see the new upload. Approved and
    // flagged hosts keep their status; those are admin decisions to revisit.
    if (host.kycStatus === KycStatus.REJECTED) {
      await this.userRepo.update(hostId, {
        kycStatus: KycStatus.PENDING,
        kycRejectionReason: null,
      });
    }

    return doc;
  }

  // ─── Active Sessions / Logout All ───────────────────────────────────────────

  async logoutAllDevices(hostId: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { id: hostId } });
    if (!user) throw new NotFoundException('User not found');
    await this.userRepo.update(hostId, {
      tokenVersion: (user.tokenVersion ?? 0) + 1,
    });
    return { message: 'All other devices have been logged out' };
  }
}
