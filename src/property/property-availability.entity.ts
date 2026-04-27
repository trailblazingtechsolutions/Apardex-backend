import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Property } from './property.entity';

@Entity('property_availability')
@Unique(['propertyId', 'date'])
export class PropertyAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @Column()
  propertyId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', nullable: true })
  reason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
