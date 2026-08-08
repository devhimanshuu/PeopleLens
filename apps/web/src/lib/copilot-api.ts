import type {
  CopilotCapabilities,
  CopilotChatRequest,
  CopilotMessageView,
  CopilotResponse,
} from '@peoplelens/types';
import { api } from './api';

/**
 * Browser client for the PeopleLens Copilot API. All calls carry the Neon
 * session via the shared `api` client and unwrap the standard envelope.
 */

export function fetchCopilotCapabilities(): Promise<CopilotCapabilities> {
  return api.get<CopilotCapabilities>('/ai/copilot/capabilities');
}

export function sendCopilotMessage(payload: CopilotChatRequest): Promise<CopilotResponse> {
  return api.post<CopilotResponse>('/ai/copilot/chat', payload);
}

export function fetchCopilotConversation(id: string): Promise<CopilotMessageView[]> {
  return api.get<CopilotMessageView[]>(`/ai/copilot/conversations/${id}`);
}

export function clearCopilotConversation(id: string): Promise<void> {
  return api.delete<unknown>(`/ai/copilot/conversations/${id}`).then(() => undefined);
}
