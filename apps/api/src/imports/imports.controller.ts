import {
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

/** Maximum accepted CSV size (10 MB) — guards the API against runaway uploads. */
const MAX_CSV_SIZE_BYTES = 10 * 1024 * 1024;
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { PaginationDto } from '@app/common/dto/pagination.dto';
import { Roles } from '@app/common/decorators/roles.decorator';
import { Role } from '@app/common/enums/role.enum';
import type { RequestUser } from '@app/common/interfaces/request-user.interface';
import { ImportsService } from './imports.service';

/** CSV bulk import — upload, history, error reports and template. */
@ApiTags('Imports')
@ApiBearerAuth('access-token')
@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_CSV_SIZE_BYTES } }))
  @ApiOperation({
    summary: 'Import employees from a CSV file',
    description: 'Admin + manager roles. Returns an import summary with a per-row error report.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'CSV file' },
      },
    },
  })
  importCsv(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    return this.importsService.importCsv(user, file, req.ip);
  }

  @Get()
  @ApiOperation({ summary: 'List import history' })
  findAll(@CurrentUser() user: RequestUser, @Query() query: PaginationDto) {
    return this.importsService.findAll(user, query.page, query.pageSize);
  }

  @Get('template')
  @ApiOperation({
    summary: 'Download a CSV template',
    description: 'Pre-filled with one example row.',
  })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="peoplelens-employees-template.csv"')
  getTemplate(): StreamableFile {
    return new StreamableFile(Buffer.from(this.importsService.buildTemplate(), 'utf-8'));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an import record with its error report' })
  @ApiParam({ name: 'id', description: 'Import history id' })
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.importsService.findOne(user, id);
  }
}
