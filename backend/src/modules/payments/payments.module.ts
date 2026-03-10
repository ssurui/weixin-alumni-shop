import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ExchangeRateService } from './exchange-rate.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, ExchangeRateService],
  exports: [PaymentsService, ExchangeRateService],
})
export class PaymentsModule {}
