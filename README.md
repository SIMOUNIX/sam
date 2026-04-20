# SAM

Personal AI agent system. Discord-native, Mistral-powered, with a local web dashboard for monitoring.

## Prerequisites

- **Python 3.11+** and [uv](https://docs.astral.sh/uv/)
- **[bun](https://bun.com/)** (for the dashboard UI)
- A Mistral API key and a Discord bot token

## First-time setup

```bash
# 1. Python deps + editable install (registers `sam`, `sam-dump`, `sam-dashboard`)
uv sync
uv pip install -e .

# 2. Environment
cp .env.example .env
# edit .env and fill in:
#   SAM_LLM_PROVIDER=mistral
#   SAM_MISTRAL_API_KEY=...
#   SAM_DISCORD_BOT_TOKEN=...

# 3. Members config
# edit config/members.toml and add your family/members with their discord_id

# 4. Dashboard UI deps
cd sam/interfaces/dashboard/frontend
bun install
cd -
```

## Running

SAM has three independent processes. Start each in its own terminal.

### 1 · Discord bot

```bash
uv run sam
```

### 2 · Dashboard backend (FastAPI)

```bash
uv run sam-dashboard
# → http://127.0.0.1:8765
```

### 3 · Dashboard UI

**Dev mode** (hot reload, proxies `/api` to port 8765):

```bash
cd sam/interfaces/dashboard/frontend
bun run dev
# → http://127.0.0.1:5173
```

**Built mode** (FastAPI serves the compiled UI — no separate process):

```bash
cd sam/interfaces/dashboard/frontend
bun run build
# then just `uv run sam-dashboard` and open http://127.0.0.1:8765
```

## Utilities

```bash
uv run sam-dump        # print all memories/episodes/events/reminders as tables
```

## Project layout

```
sam/
├── config/members.toml          # identity (name + discord_id)
├── sam/
│   ├── main.py                  # bot entry
│   ├── core/
│   │   ├── llm/                 # Mistral client + function-calling tools
│   │   └── memory/              # SQLite + ChromaDB vector store
│   ├── interfaces/
│   │   ├── messaging/discord_bot.py
│   │   └── dashboard/
│   │       ├── app.py           # FastAPI (/api/state, /api/logs)
│   │       └── frontend/        # React + Vite + shadcn/ui + Tailwind v4
│   └── logger.py                # pretty console + JSON file at ~/.sam/sam.log
└── pyproject.toml
```
