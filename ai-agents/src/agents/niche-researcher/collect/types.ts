/** Raw signal collected from any source before LLM extraction */
export interface RawSignal {
  text: string;
  source_type: 'reddit' | 'google_search' | 'google_trends';
  source_url?: string;
  metadata: Record<string, unknown>;
}
