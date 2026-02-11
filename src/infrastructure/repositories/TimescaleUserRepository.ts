import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { User } from '../../domain/entities/User';
import { UserEntity } from '../database/entities/UserEntity';

@Injectable()
export class TimescaleUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const userEntity = await this.userRepository.findOne({ where: { id } });
    return userEntity ? this.toDomain(userEntity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const userEntity = await this.userRepository.findOne({ where: { email } });
    return userEntity ? this.toDomain(userEntity) : null;
  }

  async create(
    user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<User> {
    const userEntity = this.userRepository.create(user);
    const savedEntity = await this.userRepository.save(userEntity);
    return this.toDomain(savedEntity);
  }

  async update(id: string, user: Partial<User>): Promise<User> {
    await this.userRepository.update(id, user);
    const updatedEntity = await this.userRepository.findOne({ where: { id } });
    if (!updatedEntity) {
      throw new Error('User not found');
    }
    return this.toDomain(updatedEntity);
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    await this.userRepository.update(userId, {
      refreshToken: refreshToken ?? undefined,
    });
  }

  private toDomain(entity: UserEntity): User {
    return new User({
      id: entity.id,
      email: entity.email,
      password: entity.password,
      fullName: entity.fullName,
      role: entity.role,
      isActive: entity.isActive,
      refreshToken: entity.refreshToken,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
