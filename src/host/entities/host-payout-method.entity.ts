import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum PayoutMethodType {
  BANK_ACCOUNT = 'bank_account',
  PAYSTACK_WALLET = 'paystack_wallet',
}

@Entity('host_payout_methods')
export class HostPayoutMethod {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  hostId!: string;

  @Column({ type: 'enum', enum: PayoutMethodType })
  type!: PayoutMethodType;

  // Bank account fields
  @Column({ type: 'varchar', nullable: true })
  bankName!: string | null;

  @Column({ type: 'varchar', nullable: true })
  bankCode!: string | null;

  @Column({ type: 'varchar', nullable: true })
  accountNumber!: string | null;

  @Column({ type: 'varchar', nullable: true })
  accountName!: string | null;

  // Wallet fields
  @Column({ type: 'varchar', nullable: true })
  walletEmail!: string | null;

  @Column({ default: false })
  isDefault!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
