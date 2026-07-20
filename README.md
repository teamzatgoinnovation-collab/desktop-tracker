# tracker-desktop

**Status:** Electron client with Phase 9 PT parity (dashboard / lists / detail / approvals)  
**Kind:** Electron + Vite + React  
**Backend:** `tracker` (+ hub `zatgo_core` ping)  
**Package:** `@zatgo/tracker-desktop`  
**Stack:** [FRONTEND_STACK](../../Docs/Foundation/FRONTEND_STACK.md)

## Auth

Sign in with ERPNext / Frappe **site URL + email/password**. Login runs in the Electron main process via `@zatgo/erpnext`.

## Features

| Page | API |
|------|-----|
| Dashboard | hub ping + `dashboard_summary` |
| Projects | `list_projects` → `get_project` (+ project tasks) |
| Tasks | `list_tasks` → `get_task` + `update_task_status` |
| Approvals | `list_mine` + approve/reject |
| Connection | session / test site |

Kanban / Gantt remain on Frappe Desk.

## Run

```bash
pnpm install
pnpm --filter @zatgo/tracker-desktop dev
```

Vite port: **5177**. Default site URL: `https://demo.zatgo.online`.
