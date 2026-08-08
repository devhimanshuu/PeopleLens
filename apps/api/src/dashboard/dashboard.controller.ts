import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/interfaces/request-user.interface';
import { type DashboardService } from './dashboard.service';

/** Analytics dashboard — KPIs and distributions, role-scoped. */
@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get dashboard overview',
    description:
      'KPIs + department/status/gender distributions + recent hires. Scoped for managers.',
  })
  getOverview(@CurrentUser() user: RequestUser) {
    return this.dashboardService.getOverview(user);
  }
}
