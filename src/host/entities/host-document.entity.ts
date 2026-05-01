import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('host_documents')
export class HostDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  hostId!: string;

  @Column()
  documentUrl!: string;

  @Column({ type: 'varchar', nullable: true })
  documentType!: string | null;

  @Column({ default: false })
  isVerified!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
