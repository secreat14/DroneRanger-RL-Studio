# TASK-20261020-003 — Local chat upgrade

- Executor: Codex/root; date2026-10-20; rules2026-10-15.1.
- Authority: recipient root AI_TASKS.md/TODO.md; no recipient coordination worktree.
- Source: Saplingagent main86eca656e1b54c840f227ff2c169e290757ec0e7 (release8becd741), applied onto recipient release d9da7c4 in detached .worktrees/chat-upgrade.
- User authorization: upgrade only this Drone-Ranger-RL-agent installation's chat; no upstream publication or branch synchronization.
- Scope: Optional contextUsage validation and serialized persistence; legacy omission and null clearing. Existing sessions and attachments are not migrated.
- Independent local service commit follows this handoff; final SHA and deployment result belong in the recipient root task index.

## Verification and limits

Exact selected source bytes match the checked upstream implementation. Candidate tests:54 frontend plus47 Agent/Workspace, all101passed; frontend TypeScript/Vite build passed. The existing build large-chunk warning and optional fsevents install-script notice remain. Browser validation uses actual Agent/Workspace/Builder with synthetic Codex in an isolated .cache directory:send/stream, rename, list/switch, context occupancy, reload recovery, GFM and math rendered successfully. No real model/account call, customer conversation write or human acceptance is claimed. Native Windows not tested.

## Deployment

Root will apply only the41path whitelist after expected-original hash checks, install locked frontend dependencies and use the owned runtime restart. Kernel0.9.5, business entrypoints, project config, credentials, existing session data and Git refs/remotes are excluded. Source-only originals are retained under .cache/chat-upgrade-20261020/source-before; backup does not revert business data or install dependencies. No automatic rollback.
