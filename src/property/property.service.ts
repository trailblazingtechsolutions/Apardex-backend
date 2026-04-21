import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property, PropertyStatus } from './property.entity';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { SearchPropertyDto } from './dto/search-property.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class PropertyService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(hostId: string, dto: CreatePropertyDto): Promise<Property> {
    const property = this.propertyRepository.create({ ...dto, hostId });
    return this.propertyRepository.save(property);
  }

  async search(dto: SearchPropertyDto) {
    const {
      location,
      guests,
      minPrice,
      maxPrice,
      type,
      page = 1,
      limit = 10,
    } = dto;

    const query = this.propertyRepository
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.host', 'host')
      .where('property.status = :status', { status: PropertyStatus.ACTIVE });

    if (location) {
      query.andWhere(
        '(LOWER(property.city) LIKE :location OR LOWER(property.country) LIKE :location OR LOWER(property.state) LIKE :location)',
        { location: `%${location.toLowerCase()}%` },
      );
    }

    if (guests) {
      query.andWhere('property.maxGuests >= :guests', { guests });
    }

    if (minPrice !== undefined) {
      query.andWhere('property.pricePerNight >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      query.andWhere('property.pricePerNight <= :maxPrice', { maxPrice });
    }

    if (type) {
      query.andWhere('property.type = :type', { type });
    }

    const total = await query.getCount();
    const data = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('property.createdAt', 'DESC')
      .getMany();

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findFeatured(): Promise<Property[]> {
    return this.propertyRepository.find({
      where: { status: PropertyStatus.ACTIVE },
      order: { avgRating: 'DESC', totalReviews: 'DESC' },
      take: 8,
    });
  }

  async findById(id: string): Promise<Property> {
    const property = await this.propertyRepository.findOne({ where: { id } });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async findByHost(hostId: string): Promise<Property[]> {
    return this.propertyRepository.find({
      where: { hostId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: string,
    hostId: string,
    dto: UpdatePropertyDto,
  ): Promise<Property> {
    const property = await this.findById(id);
    if (property.hostId !== hostId)
      throw new ForbiddenException('Access denied');
    await this.propertyRepository.update(id, dto);
    return this.findById(id);
  }

  async uploadImages(
    id: string,
    hostId: string,
    files: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    }[],
  ): Promise<Property> {
    const property = await this.findById(id);
    if (property.hostId !== hostId)
      throw new ForbiddenException('Access denied');

    const uploads = await Promise.all(
      files.map((file) =>
        this.cloudinaryService.uploadFile(file, 'property-images'),
      ),
    );

    const newUrls = uploads.map((r) => r.secure_url);
    const existingImages = property.images ?? [];
    await this.propertyRepository.update(id, {
      images: [...existingImages, ...newUrls],
    });

    return this.findById(id);
  }

  async remove(id: string, hostId: string): Promise<void> {
    const property = await this.findById(id);
    if (property.hostId !== hostId)
      throw new ForbiddenException('Access denied');
    await this.propertyRepository.delete(id);
  }

  async updateStatus(id: string, status: PropertyStatus): Promise<Property> {
    await this.findById(id);
    await this.propertyRepository.update(id, { status });
    return this.findById(id);
  }
}
