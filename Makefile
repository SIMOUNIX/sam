.PHONY: dev bot dashboard frontend

dev:
	@trap 'kill 0' SIGINT; \
	uv run sam & \
	cd sam/interfaces/dashboard/frontend && bun run dev & \
	wait

bot:
	uv run sam

dashboard:
	uv run sam-dashboard

frontend:
	cd sam/interfaces/dashboard/frontend && bun run dev
