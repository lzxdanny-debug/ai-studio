import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from '../database/entities/user.entity';
import { UserCreditEntity } from '../database/entities/user-credit.entity';
import { RegisterDto, UserRole } from '@ai-platform/shared';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepo: Repository<UserEntity>,
    @InjectRepository(UserCreditEntity)
    private creditsRepo: Repository<UserCreditEntity>,
  ) {}

  async create(dto: RegisterDto): Promise<UserEntity> {
    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('该邮箱已注册');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.usersRepo.create({
      email: dto.email,
      passwordHash,
      displayName: dto.displayName,
    });
    const savedUser = await this.usersRepo.save(user);

    // 初始化积分账户（赠送 500 积分）
    const credit = this.creditsRepo.create({
      userId: savedUser.id,
      balance: 500,
    });
    await this.creditsRepo.save(credit);

    return savedUser;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async validatePassword(user: UserEntity, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  /**
   * 通过 shanhaiapi.com 登录后 find-or-create 本地用户。
   * 以 username 为唯一键（存储在 displayName 字段）。
   */
  async findOrCreateByMountsea(profile: {
    username: string;
    role: string;
  }): Promise<UserEntity> {
    // 用 displayName 作为 mountsea username 的存储字段
    let user = await this.usersRepo.findOne({
      where: { displayName: profile.username },
    });
    if (user) {
      const mappedRole =
        profile.role === 'admin' ? UserRole.ADMIN : UserRole.USER;
      if (user.role !== mappedRole) {
        user.role = mappedRole;
        user = await this.usersRepo.save(user);
      }
      return user;
    }

    const mappedRole =
      profile.role === 'admin' ? UserRole.ADMIN : UserRole.USER;

    const newUser = this.usersRepo.create({
      displayName: profile.username,
      email: null as any,
      passwordHash: null as any,
      role: mappedRole,
    });
    return this.usersRepo.save(newUser);
  }

  /**
   * 启动时按环境变量确保本地管理员账号存在。
   * 若账号已存在则更新密码和角色；若不存在则新建。
   */
  async ensureAdminUser(email: string, password: string): Promise<void> {
    const passwordHash = await bcrypt.hash(password, 12);
    let user = await this.usersRepo.findOne({ where: { email } });

    if (user) {
      user.role = UserRole.ADMIN;
      user.passwordHash = passwordHash;
      await this.usersRepo.save(user);
    } else {
      user = this.usersRepo.create({
        email,
        passwordHash,
        displayName: 'Admin',
        role: UserRole.ADMIN,
      });
      const saved = await this.usersRepo.save(user);
      const credit = this.creditsRepo.create({ userId: saved.id, balance: 0 });
      await this.creditsRepo.save(credit);
    }
  }

  async findOrCreateByGoogle(profile: {
    googleId: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
  }): Promise<UserEntity> {
    // 先通过 googleId 查找
    let user = await this.usersRepo.findOne({ where: { googleId: profile.googleId } });
    if (user) return user;

    // 再通过 email 查找（可能已有邮箱账号，直接关联 Google）
    user = await this.usersRepo.findOne({ where: { email: profile.email } });
    if (user) {
      user.googleId = profile.googleId;
      if (!user.avatarUrl && profile.avatarUrl) user.avatarUrl = profile.avatarUrl;
      return this.usersRepo.save(user);
    }

    // 全新用户
    const newUser = this.usersRepo.create({
      googleId: profile.googleId,
      email: profile.email,
      displayName: profile.displayName || profile.email.split('@')[0],
      avatarUrl: profile.avatarUrl,
      passwordHash: null as any,
    });
    const savedUser = await this.usersRepo.save(newUser);

    // 赠送初始积分
    const credit = this.creditsRepo.create({ userId: savedUser.id, balance: 500 });
    await this.creditsRepo.save(credit);

    return savedUser;
  }
}
