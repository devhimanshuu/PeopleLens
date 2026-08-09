import { PrismaPg } from '@prisma/adapter-pg';
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
// Prisma data-access wrapper. - Resolves the connection string from validated configuration. - Connects at boot…
// and disconnects cleanly on shutdown. - Degrades gracefully: if PostgreSQL is unreachable (e.g. local dev…
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private connected = false;

  constructor(config: ConfigService) {
    const dbUrl = config.get<string>('databaseUrl');
    let adapter: PrismaPg | undefined;
    if (dbUrl) {
      try {
        adapter = new PrismaPg({ connectionString: dbUrl });
      } catch (err) {
        Logger.warn(`Failed to initialize PrismaPg adapter: ${err}`, 'PrismaService');
      }
    }
    super(adapter ? { adapter } : undefined);
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.connected = true;
      this.logger.log('PostgreSQL connection established.');
    } catch (error) {
      this.logger.warn(
        `PostgreSQL is unreachable — continuing without a database connection: ${this.errorMessage(error)}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.connected) return;
    await this.$disconnect();
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
