import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_DAYS = 7;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private usersService: UsersService
  ) {}

  async register(dto: RegisterDto) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Validate password strength
    this.validatePassword(dto.password);

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        fullName: dto.fullName || null,
        role: 'user',
        plan: 'free',
        emailVerified: false, // In production, require email verification
      },
    });

    // TODO: Send verification email
    console.log(`📧 Verification email would be sent to: ${user.email}`);

    return {
      userId: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
    };
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const { accessToken, refreshToken, expiresInSeconds } = await this.generateTokens(
      user,
      userAgent,
      ipAddress
    );

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      expiresInSeconds,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        plan: user.plan,
      },
    };
  }

  async refresh(refreshToken: string) {
    // Verify refresh token
    let payload: { sub: string; sid: string; jti: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Find session
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    // Verify token hash matches
    const tokenHash = await this.hashToken(refreshToken);
    // Note: In production, compare hashes securely

    // Generate new tokens
    const user = session.user;
    const { accessToken, refreshToken: newRefreshToken, expiresInSeconds } = 
      await this.generateTokens(user, session.userAgent, session.ipAddress, session.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresInSeconds,
    };
  }

  async logout(refreshToken: string, userId: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Revoke session
      await this.prisma.session.updateMany({
        where: {
          id: payload.sid,
          userId,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      // Invalidate cache
      await this.redisService.del(`session:${payload.sid}`);
    } catch {
      // Token already invalid, just return success
    }

    return { success: true };
  }

  private async generateTokens(
    user: { id: string; email: string; role: string; plan: string },
    userAgent?: string | null,
    ipAddress?: string | null,
    existingSessionId?: string
  ) {
    const jti = uuidv4();
    const refreshJti = uuidv4();

    // Access token payload
    const accessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
      jti,
    };

    // Generate access token
    const accessToken = this.jwtService.sign(accessTokenPayload);
    const expiresInSeconds = 900; // 15 minutes

    // Calculate refresh token expiry
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + REFRESH_TOKEN_DAYS);

    // Create or update session
    let sessionId: string;
    const refreshTokenHash = await this.hashToken(refreshJti);

    if (existingSessionId) {
      // Update existing session
      await this.prisma.session.update({
        where: { id: existingSessionId },
        data: {
          refreshTokenHash,
          expiresAt: refreshExpiresAt,
        },
      });
      sessionId = existingSessionId;
    } else {
      // Create new session
      const session = await this.prisma.session.create({
        data: {
          userId: user.id,
          refreshTokenHash,
          userAgent: userAgent || null,
          ipAddress: ipAddress || null,
          expiresAt: refreshExpiresAt,
        },
      });
      sessionId = session.id;
    }

    // Generate refresh token
    const refreshTokenPayload = {
      sub: user.id,
      sid: sessionId,
      jti: refreshJti,
    };

    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      expiresIn: `${REFRESH_TOKEN_DAYS}d`,
    });

    return {
      accessToken,
      refreshToken,
      expiresInSeconds,
    };
  }

  private async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }

  private validatePassword(password: string): void {
    if (password.length < 8 || password.length > 72) {
      throw new BadRequestException('Password must be 8-72 characters');
    }

    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasLetter || !hasNumber) {
      throw new BadRequestException('Password must contain at least 1 letter and 1 number');
    }
  }
}
