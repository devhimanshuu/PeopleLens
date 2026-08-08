import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { Roles } from '@app/common/decorators/roles.decorator';
import { Role } from '@app/common/enums/role.enum';
import type { RequestUser } from '@app/common/interfaces/request-user.interface';
import { type CreateEmployeeDto } from './dto/create-employee.dto';
import { type QueryEmployeesDto } from './dto/query-employees.dto';
import { type UpdateEmployeeDto } from './dto/update-employee.dto';
import { type EmployeesService } from './employees.service';

/**
 * Employee records — the workforce core domain. Admin + manager roles write;
 * viewers read. Managers are scoped to their assigned departments.
 */
@ApiTags('Employees')
@ApiBearerAuth('access-token')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @ApiOperation({
    summary: 'List employees',
    description: 'Search, filter, sort and paginate the workforce.',
  })
  findAll(@CurrentUser() user: RequestUser, @Query() query: QueryEmployeesDto) {
    return this.employeesService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an employee by id' })
  @ApiParam({ name: 'id', description: 'Employee id' })
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.employeesService.findOne(user, id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Create an employee',
    description: 'Admin + manager roles. Managers are scoped to their departments.',
  })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateEmployeeDto, @Req() req: Request) {
    return this.employeesService.create(user, dto, req.ip);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Update an employee',
    description: 'Admin + manager roles. Managers are scoped to their departments.',
  })
  @ApiParam({ name: 'id', description: 'Employee id' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @Req() req: Request,
  ) {
    return this.employeesService.update(user, id, dto, req.ip);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft-delete an employee',
    description: 'Admin + manager roles. The record is retained in history.',
  })
  @ApiParam({ name: 'id', description: 'Employee id' })
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string, @Req() req: Request) {
    return this.employeesService.remove(user, id, req.ip);
  }

  @Patch(':id/restore')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restore a soft-deleted employee',
    description:
      'Reverses a soft delete. Admin + manager roles, scoped to assigned departments for managers. Audited with action restore.',
  })
  @ApiParam({ name: 'id', description: 'Employee id' })
  restore(@CurrentUser() user: RequestUser, @Param('id') id: string, @Req() req: Request) {
    return this.employeesService.restore(user, id, req.ip);
  }
}
