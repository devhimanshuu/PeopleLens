import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/interfaces/request-user.interface';
// Value imports — NOT type-only: the global ValidationPipe resolves the DTO
// class from emitted `design:paramtypes` metadata (see security audit).
import { type AnalyticsService } from './analytics.service';
import { type QueryAnalyticsDto } from './dto/query-analytics.dto';
import { type QueryCompareDto } from './dto/query-compare.dto';

/**
 * Workforce-intelligence APIs. Every view is role-scoped server-side
 * (managers see only their departments); viewers read but never receive
 * salary aggregates. All analytics are computed from the current dataset —
 * insights describe observed patterns, never predictions.
 */
@ApiTags('Analytics')
@ApiBearerAuth('access-token')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Full workforce-intelligence overview',
    description:
      'Executive summary, KPIs, attrition, engagement, composition, insights and data quality for one filter state. Filters are intersected with the caller RBAC scope.',
  })
  getOverview(@CurrentUser() user: RequestUser, @Query() query: QueryAnalyticsDto) {
    return this.analyticsService.getOverview(user, query);
  }

  @Get('compare')
  @ApiOperation({
    summary: 'Compare departments',
    description:
      'Headcount, attrition, tenure, income, overtime, satisfaction and performance side-by-side. Managers may only compare departments in their scope; out-of-scope ids are dropped.',
  })
  getCompare(@CurrentUser() user: RequestUser, @Query() query: QueryCompareDto) {
    const departmentIds = query.departmentIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    return this.analyticsService.getCompare(user, departmentIds);
  }

  @Get('filters')
  @ApiOperation({
    summary: 'Analytics filter options',
    description: 'Scope-aware option lists (departments, job titles, buckets) for the filter bar.',
  })
  getFilters(@CurrentUser() user: RequestUser) {
    return this.analyticsService.getFilters(user);
  }

  @Get('hierarchy')
  @ApiOperation({
    summary: 'Organization hierarchy',
    description:
      'Tree of departments → teams → employees with employee profile previews. Scoped to a manager assigned departments.',
  })
  getHierarchy(@CurrentUser() user: RequestUser) {
    return this.analyticsService.getHierarchy(user);
  }
}
