import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  USER = 'user',
  HOST = 'host',
  ADMIN = 'admin',
}

export enum KycStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
}

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  FINANCIAL_OFFICER = 'financial_officer',
  KYC_REVIEWER = 'kyc_reviewer',
  SUPPORT_AGENT = 'support_agent',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  hostCode!: string | null;

  @Column({ nullable: true })
  fullName!: string;

  // Retained for admin/team members who are stored with separate name parts.
  @Column({ nullable: true })
  firstName!: string;

  @Column({ nullable: true })
  lastName!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ type: 'varchar', select: false, nullable: true })
  password!: string | null;

  // Social auth (e.g. Google) — null for password-based accounts
  @Column({ type: 'varchar', unique: true, nullable: true })
  googleId!: string | null;

  @Column({ type: 'enum', enum: AuthProvider, default: AuthProvider.LOCAL })
  authProvider!: AuthProvider;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @Column({ type: 'enum', enum: AdminRole, nullable: true })
  adminRole!: AdminRole | null;

  @Column({ default: false })
  isEmailVerified!: boolean;

  @Column({ type: 'varchar', nullable: true })
  otp!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  otpExpiresAt!: Date | null;

  // Host-specific fields
  @Column({ nullable: true })
  documentUrl!: string;

  @Column({ default: false })
  isDocumentVerified!: boolean;

  @Column({
    type: 'enum',
    enum: KycStatus,
    default: KycStatus.PENDING,
  })
  kycStatus!: KycStatus;

  @Column({ type: 'text', nullable: true })
  kycRejectionReason!: string | null;

  @Column({ nullable: true })
  phoneNumber!: string;

  @Column({ type: 'varchar', nullable: true })
  location!: string | null;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl!: string | null;

  // Account status
  @Column({ default: true })
  isActive!: boolean;

  // Security settings
  @Column({ default: false })
  isTwoFactorEnabled!: boolean;

  @Column({ default: true })
  isLoginAlertsEnabled!: boolean;

  // Billing address
  @Column({ type: 'jsonb', nullable: true })
  billingAddress!: {
    firstName: string;
    lastName: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null;

  @Column({ default: 0 })
  tokenVersion!: number;

  // Set for accounts created with a temporary password (invited admins). While
  // true, JwtAuthGuard only allows the change-password and logout routes.
  @Column({ default: false })
  mustChangePassword!: boolean;

  // Transient — set by JwtStrategy after validation, never persisted
  currentSessionId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
