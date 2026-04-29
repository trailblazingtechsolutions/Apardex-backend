import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
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

    try {
      const favorite = this.favoriteRepository.create({ userId, propertyId });
      return await this.favoriteRepository.save(favorite);
    } catch (err) {
      if (err instanceof QueryFailedError) {
        const pg = err as unknown as { code: string };
        if (pg.code === '23503')
          throw new NotFoundException('Property not found');
        if (pg.code === '23505')
          throw new ConflictException('Property already in favorites');
      }
      throw err;
    }
  }

  async remove(userId: string, propertyId: string): Promise<void> {
    const favorite = await this.favoriteRepository.findOne({
      where: { userId, propertyId },
    });
    if (!favorite) throw new NotFoundException('Favorite not found');
    await this.favoriteRepository.delete(favorite.id);
  }

  async findAll(userId: string): Promise<Favorite[]> {
    return this.favoriteRepository
      .createQueryBuilder('fav')
      .leftJoinAndSelect('fav.property', 'property')
      .where('fav.userId = :userId', { userId })
      .orderBy('fav.createdAt', 'DESC')
      .getMany();
  }
}
