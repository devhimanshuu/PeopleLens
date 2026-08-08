import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '@app/common/decorators/public.decorator';
import { type AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  // Uptime monitors poll health frequently; a 429 would be misread as
  // "service down". Health is DB-free and cheap, so it is exempt from
  // rate limiting.
  @SkipThrottle()
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }
}
