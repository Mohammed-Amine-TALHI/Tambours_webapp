---
name: project-stack-state
description: Tech stack and build state of the PFE webapp — what exists (auth/users) vs what's missing (the whole schema feature)
metadata:
  type: project
---

App lives in `Projet Fatih Webapp/App/` with `backend/` (Laravel) and `frontend/` (React+Vite+Tailwind v4).

**Backend (Laravel + Sanctum):** auth (login/logout/me, token), forgot-password OTP flow, first-login password change (`password.changed` middleware), role middleware (`role:admin`). Models: User, EmailDomain. Controllers: Auth, ForgotPassword, Password, Admin\AdminUserController, Admin\EmailDomainController. API routes in `backend/routes/api.php`.

**Frontend (React 19 + react-router 7 + axios):** auth context + guards, AdminLayout, pages: Login, FirstLogin, ForgotPassword, ResetPassword, AppHome, admin/UsersList, admin/UserNew. API client in `src/lib/api.js`.

**Built:** authentication, user management, email-domain management (admin).

**NOT built (the core of the project):** everything about conveyors/drums/components/datasheets — the interactive master schema, per-conveyor view, drum detail + datasheets, Excel import, admin schema "design" editor (place shapes/zones over schema + circles), component cross-reference ("same component, all locations"), email-datasheet feature.

**Why:** the schema feature is the actual PFE deliverable; auth was the scaffolding done first.

**How to apply:** build the schema feature on top of the existing auth/role system (operators = read-only consultation, admins = manage). Reuse the `role:admin` middleware and AdminLayout.
