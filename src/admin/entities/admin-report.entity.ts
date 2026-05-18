import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum ReportOutputType {
  CSV = 'csv',
  PDF = 'pdf',
  CSV_PDF = 'csv_pdf',
}

export enum ReportType {
  CUSTOM = 'custom',
  MONTHLY = 'monthly',
  PAYOUT_SUMMARY = 'payout_summary',
  REFUNDS_ADJUSTMENTS = 'refunds_adjustments',
  PLATFORM_PERFORMANCE = 'platform_performance',
}

export enum ReportStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  READY = 'ready',
  FAILED = 'failed',
}

@Entity('admin_reports')
export class AdminReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'enum', enum: ReportType, default: ReportType.CUSTOM })
  reportType!: ReportType;

  @Column({ type: 'enum', enum: ReportOutputType, default: ReportOutputType.CSV })
  outputType!: ReportOutputType;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.PENDING })
  status!: ReportStatus;

  @Column({ type: 'date', nullable: true })
  dateRangeStart!: Date | null;

  @Column({ type: 'date', nullable: true })
  dateRangeEnd!: Date | null;

  @Column()
  generatedById!: string;

  @Column({ type: 'varchar', nullable: true })
  fileUrl!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
