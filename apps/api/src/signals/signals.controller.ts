import { Controller, Get } from '@nestjs/common';
import { type SignalsService } from './signals.service';

@Controller('signals')
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  @Get('live')
  getLive() {
    return this.signalsService.getLiveSnapshot();
  }
}
