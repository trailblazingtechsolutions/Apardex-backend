import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('user_sessions')
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column({ type: 'varchar', nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'varchar', nullable: true })
  deviceName!: string | null;

  @Column({ type: 'varchar', nullable: true })
  deviceType!: string | null;

  @Column({ type: 'varchar', nullable: true })
  browser!: string | null;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastActiveAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
