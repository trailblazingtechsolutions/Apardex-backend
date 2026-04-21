import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './favorite.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
  ) {}

  async add(userId: string, propertyId: string): Promise<Favorite> {
    const existing = await this.favoriteRepository.findOne({
      where: { userId, propertyId },
    });
    if (existing) throw new ConflictException('Property already in favorites');

    const favorite = this.favoriteRepository.create({ userId, propertyId });
    return this.favoriteRepository.save(favorite);
  }

  async remove(userId: string, propertyId: string): Promise<void> {
    const favorite = await this.favoriteRepository.findOne({
      where: { userId, propertyId },
    });
    if (!favorite) throw new NotFoundException('Favorite not found');
    await this.favoriteRepository.delete(favorite.id);
  }

  async findAll(userId: string): Promise<Favorite[]> {
    return this.favoriteRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
