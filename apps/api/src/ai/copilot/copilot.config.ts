import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Concrete connection settings for one OpenAI-compatible provider. */
export interface ProviderSettings {
  name: 'openai' | 'groq' | 'openrouter';
  apiKey: string;
  model: string;
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
  maxTokens: number;
}

/** Per-provider free-model defaults (used when AI_MODEL / *_MODEL are unset). */
const DEFAULT_MODELS: Record<ProviderSettings['name'], string> = {
  openai: 'gpt-4o-mini',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
};

const DEFAULT_BASE_URLS: Record<ProviderSettings['name'], string> = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
};

/**
 * Typed, validated copilot configuration. Reads the `ai` block registered by
 * `config/configuration.ts` and turns it into an ordered provider chain:
 *
 *   1. primary — AI_PROVIDER + AI_API_KEY (+ AI_MODEL / AI_BASE_URL overrides)
 *   2. groq     — GROQ_API_KEY (free tier by default)
 *   3. openrouter — OPENROUTER_API_KEY (free models by default)
 *
 * Any provider without an API key is skipped at runtime, so a user can enable
 * any subset (e.g. only Groq, or OpenAI + OpenRouter) with no config churn.
 */
@Injectable()
export class CopilotConfig {
  constructor(private readonly config: ConfigService) {}

  get provider(): string {
    return this.config.get<string>('ai.provider') ?? 'openai';
  }

  get requestsPerMinute(): number {
    return this.config.get<number>('ai.requestsPerMinute') ?? 10;
  }

  get maxInputChars(): number {
    return this.config.get<number>('ai.maxInputChars') ?? 4000;
  }

  get timeoutMs(): number {
    return this.config.get<number>('ai.timeoutMs') ?? 30_000;
  }

  get maxRetries(): number {
    return this.config.get<number>('ai.maxRetries') ?? 2;
  }

  get maxTokens(): number {
    return this.config.get<number>('ai.maxTokens') ?? 2000;
  }

  /** Ordered provider chain — primary first, then configured fallbacks. */
  providerChain(): ProviderSettings[] {
    const common = {
      timeoutMs: this.timeoutMs,
      maxRetries: this.maxRetries,
      maxTokens: this.maxTokens,
    };
    const primaryName =
      this.provider === 'groq' || this.provider === 'openrouter' ? this.provider : 'openai';

    const chain: ProviderSettings[] = [
      {
        name: primaryName,
        apiKey: this.config.get<string>('ai.apiKey') ?? '',
        model: this.modelFor(primaryName, this.config.get<string>('ai.model') ?? ''),
        baseUrl: this.baseUrlFor(primaryName, this.config.get<string>('ai.baseUrl') ?? ''),
        ...common,
      },
      {
        name: 'groq',
        apiKey: this.config.get<string>('ai.groq.apiKey') ?? '',
        model: this.modelFor('groq', this.config.get<string>('ai.groq.model') ?? ''),
        baseUrl: this.baseUrlFor('groq', this.config.get<string>('ai.groq.baseUrl') ?? ''),
        ...common,
      },
      {
        name: 'openrouter',
        apiKey: this.config.get<string>('ai.openrouter.apiKey') ?? '',
        model: this.modelFor('openrouter', this.config.get<string>('ai.openrouter.model') ?? ''),
        baseUrl: this.baseUrlFor(
          'openrouter',
          this.config.get<string>('ai.openrouter.baseUrl') ?? '',
        ),
        ...common,
      },
    ];

    // Dedupe: if the primary IS groq/openrouter, don't list it twice.
    const seen = new Set<string>();
    return chain.filter((p) => {
      if (seen.has(p.name)) return false;
      seen.add(p.name);
      return true;
    });
  }

  private modelFor(name: ProviderSettings['name'], configured: string): string {
    return configured.trim() || DEFAULT_MODELS[name];
  }

  private baseUrlFor(name: ProviderSettings['name'], configured: string): string {
    return configured.trim().replace(/\/+$/, '') || DEFAULT_BASE_URLS[name];
  }
}
