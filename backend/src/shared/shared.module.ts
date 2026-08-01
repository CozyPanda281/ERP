import { Module } from '@nestjs/common';
import { CryptoModule } from './crypto/crypto.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [CryptoModule, EmailModule],
  exports: [CryptoModule, EmailModule],
})
export class SharedModule {}
