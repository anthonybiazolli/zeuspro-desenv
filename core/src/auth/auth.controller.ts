import { Controller, Get, Req, UseGuards, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Tenant } from '../entities/tenant.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Tenant) private tenantRepository: Repository<Tenant>,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
    // Inicia o fluxo do Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    const googleUser = req.user;
    
    // 1. Verifica se o usuário já existe
    let user = await this.userRepository.findOne({ where: { email: googleUser.email } });
    
    // 2. Se não existir, cria o Tenant e depois o Usuário
    if (!user) {
      const newTenant = this.tenantRepository.create({
        name: `Workspace de ${googleUser.firstName}`,
      });
      const savedTenant = await this.tenantRepository.save(newTenant);

      // Correção elegante para evitar o "undefined" se não houver sobrenome
      const fullName = [googleUser.firstName, googleUser.lastName].filter(Boolean).join(' ');

      user = this.userRepository.create({
        tenantId: savedTenant.id,
        googleId: googleUser.googleId,
        email: googleUser.email,
        name: fullName,
        avatarUrl: googleUser.picture,
        role: 'OWNER',
      });
      await this.userRepository.save(user);
    }

    // 3. Gera o JWT
    const payload = { sub: user.id, email: user.email, tenantId: user.tenantId, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    // 4. A Mágica: Redireciona o usuário para o frontend Next.js passando o Token na URL
    return res.redirect(`http://localhost/dashboard?token=${accessToken}`);
  }
}