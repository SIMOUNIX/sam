export interface Models {
  llm_provider: string;
  llm_model: string;
  embedding_model: string;
  vector_db: string;
  sqlite_db: string;
  mistral_key_configured: boolean;
  discord_token_configured: boolean;
}

export interface ToolParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface Tool {
  name: string;
  description: string;
  params: ToolParam[];
}

export interface Member {
  family: string;
  firstname: string;
  discord_id: string;
}

export interface Counts {
  memories: number;
  episodes: number;
  events: number;
  reminders_total: number;
  reminders_pending: number;
  vector_documents: number | null;
}

export interface RecentMemory {
  id: number;
  member: string;
  content: string;
  at: string | null;
}

export interface RecentEpisode extends RecentMemory {
  context: string | null;
}

export interface RecentEvent {
  id: number;
  member: string;
  title: string;
  description: string | null;
  start_at: string | null;
  end_at: string | null;
}

export interface RecentReminder {
  id: number;
  member: string;
  content: string;
  due_at: string | null;
}

export interface Recent {
  memories: RecentMemory[];
  episodes: RecentEpisode[];
  events: RecentEvent[];
  reminders: RecentReminder[];
}

export interface SamState {
  generated_at: string;
  models: Models;
  tools: Tool[];
  members: Member[];
  counts: Counts;
  recent: Recent;
}

export interface RunStats {
  total_runs: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tool_calls: number;
  total_cost_usd: number;
  month_cost_usd: number;
  avg_cost_per_run: number;
}

export interface DailyStats {
  date: string;
  label: string;
  runs: number;
  input_tokens: number;
  output_tokens: number;
  tokens: number;
  cost_usd: number;
}

export interface RunRecord {
  id: number;
  member: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  tool_calls: number;
  duration_ms: number;
  cost_usd: number;
  status: string;
  created_at: string | null;
}

export interface LogLine {
  level?: string;
  msg?: string;
  timestamp?: string | null;
  [extra: string]: unknown;
}

export interface LogsResponse {
  lines: LogLine[];
  path: string;
  exists: boolean;
}
