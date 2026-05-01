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
