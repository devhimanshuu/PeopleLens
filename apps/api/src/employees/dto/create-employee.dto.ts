import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { EmployeeStatus, Gender } from '@peoplelens/types';

const EMPLOYEE_CODE_PATTERN = /^[A-Za-z0-9._-]{2,30}$/;

/**
 * Payload for creating an employee. Validation enforces the profile contract:
 * required identity fields, stable employee code, valid email, and controlled
 * enums for status/gender.
 */
export class CreateEmployeeDto {
  @ApiProperty({ example: 'EMP-0001', description: 'Stable, unique employee code' })
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  @Matches(EMPLOYEE_CODE_PATTERN, {
    message: 'employeeCode may only contain letters, numbers, dots, dashes and underscores',
  })
  employeeCode!: string;

  @ApiProperty({ example: 'Alex' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName!: string;

  @ApiProperty({ example: 'Morgan' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName!: string;

  @ApiProperty({ example: 'alex.morgan@company.com' })
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @ApiPropertyOptional({ example: '+1 555 010 0000' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiProperty({ example: 'Senior Engineer' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  jobTitle!: string;

  @ApiProperty({ enum: ['female', 'male', 'non_binary', 'prefer_not_to_say'], example: 'female' })
  @IsEnum(['female', 'male', 'non_binary', 'prefer_not_to_say'] as const)
  gender!: Gender;

  @ApiPropertyOptional({ example: '1992-04-12', description: 'ISO-8601 date (YYYY-MM-DD)' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateOfBirth?: Date;

  @ApiProperty({ example: '2023-06-01', description: 'Hire date (ISO-8601)' })
  @Type(() => Date)
  @IsDate()
  hiredAt!: Date;

  @ApiPropertyOptional({
    enum: ['active', 'on_leave', 'probation', 'terminated'],
    default: 'active',
  })
  @IsOptional()
  @IsEnum(['active', 'on_leave', 'probation', 'terminated'] as const)
  status?: EmployeeStatus;

  @ApiProperty({ description: 'Department id' })
  @IsString()
  @IsNotEmpty()
  departmentId!: string;

  @ApiPropertyOptional({ description: 'Team id' })
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional({ description: 'Manager employee id (reporting line)' })
  @IsOptional()
  @IsString()
  managerId?: string;
}
