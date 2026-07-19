/**
 * AI platform entry for apps/web.
 * Applications use @repo/ai — never OpenAI/Anthropic SDK directly.
 */
import { getAIPlatform, chatService } from '@repo/ai';

export const ai = getAIPlatform();

export { getAIPlatform, chatService };
export { chat, stream, complete } from './helpers';
