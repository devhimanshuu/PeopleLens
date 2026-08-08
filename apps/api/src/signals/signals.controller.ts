import { Controller, Get } from '@nestjs/common';
import { Public } from '@app/common/decorators/public.decorator';
import { type SignalsService } from './signals.service';

@Controller('signals')
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  @Public()
  @Get('live')
  getLive() {
    return this.signalsService.getLiveSnapshot();
  }
}
