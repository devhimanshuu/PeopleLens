import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { EmployeeStatus, Gender } from '@peoplelens/types';

/** Sortable employee fields. */
export const EMPLOYEE_SORT_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'jobTitle',
  'status',
  'hiredAt',
  'createdAt',
] as const;

export type EmployeeSortField = (typeof EMPLOYEE_SORT_FIELDS)[number];

/**
 * Query parameters for the employees list endpoint — combines pagination,
 * free-text search, structured filters, and sorting.
 */
export class QueryEmployeesDto {
  @ApiPropertyOptional({ example: '1', description: 'Page number (1-based)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: '20', description: 'Page size (max 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ApiPropertyOptional({
    example: 'alex',
    description: 'Free-text search across name, email, code, title',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by department id' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by team id' })
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional({
    enum: ['active', 'on_leave', 'probation', 'terminated'],
    description: 'Filter by employment status',
  })
  @IsOptional()
  @IsEnum(['active', 'on_leave', 'probation', 'terminated'] as const)
  status?: EmployeeStatus;

  @ApiPropertyOptional({
    enum: ['female', 'male', 'non_binary', 'prefer_not_to_say'],
    description: 'Filter by gender',
  })
  @IsOptional()
  @IsEnum(['female', 'male', 'non_binary', 'prefer_not_to_say'] as const)
  gender?: Gender;

  @ApiPropertyOptional({
    default: false,
    description: 'Include soft-deleted employees (for audit/restore workflows)',
  })
  @IsOptional()
  // Explicit parse instead of `@Type(() => Boolean)`: the Boolean constructor
  // treats ANY non-empty string (including 'false') as truthy, which would
  // silently flip this flag. Accept only the literal 'true' or a boolean.
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeDeleted?: boolean;

  @ApiPropertyOptional({
    enum: EMPLOYEE_SORT_FIELDS,
    default: 'createdAt',
    description: 'Sort field',
  })
  @IsOptional()
  @IsIn(EMPLOYEE_SORT_FIELDS)
  sortBy: EmployeeSortField = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc', description: 'Sort direction' })
  @IsOptional()
  @IsIn(['asc', 'desc'] as const)
  sortOrder: 'asc' | 'desc' = 'desc';
}
