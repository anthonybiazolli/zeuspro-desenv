import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../entities/user.entity';
import { Tenant } from '../entities/tenant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Tenant]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'chave_jwt_zeus_pro_super_secreta_2026',
      signOptions: { expiresIn: '12h' }, // Sessões de 12 horas
    }),
  ],
  controllers: [AuthController],
  providers: [GoogleStrategy, JwtStrategy],
})
export class AuthModule {}