import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { Roles } from '@app/common/decorators/roles.decorator';
import { Role } from '@app/common/enums/role.enum';
import type { RequestUser } from '@app/common/interfaces/request-user.interface';
import { CopilotService } from './copilot.service';
import { CopilotChatDto } from './dto/copilot-chat.dto';

/**
 * PeopleLens Workforce Copilot API.
 *
 * Authentication + authorization run through the global guards (Neon Auth
 * session → RBAC), so every endpoint here is protected before the copilot
 * logic runs. The copilot itself is read-only: it never mutates workforce
 * data and inherits the caller's department scope from the analytics services.
 */
@ApiTags('AI Copilot')
@ApiBearerAuth('access-token')
@Controller('ai/copilot')
export class CopilotController {
  constructor(private readonly copilot: CopilotService) {}

  @Post('chat')
  @ApiOperation({
    summary: 'Ask the Workforce Copilot a question',
    description:
      'Natural-language question answered from real PeopleLens analytics. The model selects a controlled tool; the backend executes it with the caller RBAC scope and formats the grounded answer.',
  })
  chat(@CurrentUser() user: RequestUser, @Body() dto: CopilotChatDto) {
    return this.copilot.chat(user, dto);
  }

  @Get('capabilities')
  @ApiOperation({
    summary: 'Copilot capabilities + suggested questions',
    description: 'Whether the copilot is configured, the active model, and starter questions.',
  })
  capabilities() {
    return this.copilot.capabilities();
  }

  @Get('conversations/:id')
  @ApiOperation({
    summary: 'Conversation history',
    description: 'Messages for one conversation — only the owner can read it.',
  })
  getConversation(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.copilot.getConversation(user, id);
  }

  @Delete('conversations/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clear a conversation',
    description: 'Deletes the messages of one conversation — only the owner can clear it.',
  })
  clearConversation(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.copilot.clearConversation(user, id);
  }

  @Get('metrics')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'AI operational metrics (admin only)',
    description:
      'Aggregate counters only — request/success/error counts, latency, tool usage, token totals. No prompts, answers or employee data are retained.',
  })
  metrics() {
    return this.copilot.metricsSnapshot();
  }
}
