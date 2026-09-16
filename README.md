# Student Management System - Frontend

A React + TypeScript frontend for a Student Management System, backed by a Django REST Framework API. It provides role-based dashboards for Admin, Teacher, and Student (with a placeholder Staff role), JWT authentication with automatic token refresh, student/teacher onboarding and academic placement review, an AI assistant for students, AI-assisted assignment evaluation for teachers, and S3-backed profile picture / assignment attachment uploads.

## Tech Stack

- **Framework:** React 19 + Vite
- **Language:** TypeScript
- **Routing:** React Router v7 (`react-router-dom`)
- **Forms/Validation:** `react-hook-form` + `zod` (via `@hookform/resolvers`)
- **Image Cropping:** `react-easy-crop` (used for profile picture upload)
- **Styling:** Plain CSS (per-page stylesheets under `src/pages/styles/`, no CSS framework)
- **Auth:** JWT (access + refresh tokens) persisted in `localStorage`

## Project Structure

```text
src/
├── assets/                 # Static assets
├── components/
│   ├── ai/                 # FloatingAiAssistant widget (student AI assistant)
│   ├── assignments/        # AssignmentEvaluationModal (AI evaluation review UI)
│   ├── common/              # Reusable UI: EntityTable, Modal, ConfirmDialog,
│   │                        # Avatar, PaginatedSelect, ThemeToggle,
│   │                        # ProfilePhotoCropper, ProfilePictureUploader
│   └── layout/              # DashboardLayout, Navbar, Sidebar
├── config/                  # navigation.ts - single source of truth for
│                             # sidebar links + navbar page titles per role
├── context/                  # ThemeContext, ToastContext, ProfilePictureContext
├── hooks/                    # usePermissions, usePaginatedDropdown
├── pages/
│   ├── admin/                # Admin CRUD pages (Students, Teachers, Departments,
│   │                          # Sections, Courses, CourseOfferings, Enrollments,
│   │                          # AttendanceMgmt, Staff, PendingApprovals, Permissions)
│   ├── auth/                  # Login, Register, PendingApproval, Onboarding,
│   │                          # AcademicReview
│   ├── staff/                 # StaffDashboard (placeholder)
│   ├── student/                # StudentDashboard, Courses, Attendance, Remarks,
│   │                            # Assignments, AiAssistant, Profile
│   ├── styles/                 # Per-page/section CSS
│   └── teacher/                 # TeacherDashboard, Courses, Attendance,
│                                 # ClassAssignments, ClassStudents, Profile
├── services/                    # api.ts, auth.ts, entities.ts, tokenScheduler.ts
├── types/                        # user.ts (all shared types), permissions.ts
└── utils/                        # cropImage.ts (canvas crop for profile pictures)
```

## Authentication & Token Refresh

- `services/auth.ts` handles login, registration, logout, and reading/writing `access_token`, `refresh_token`, and the cached `user` object in `localStorage`.
- `services/api.ts` is the single `fetch` wrapper (`apiRequest`) used by every service. It attaches the `Authorization: Bearer` header, and on a `401` transparently refreshes the access token once (deduping concurrent refreshes via a shared in-flight promise) before retrying the original request. If refresh fails, it clears auth and redirects to `/`.
- `services/tokenScheduler.ts` proactively refreshes the access token ~60 seconds before it expires (decoded from the JWT payload), rather than waiting for a request to hit a 401.

## Role-Based Routing

Routing lives in `src/App.tsx`. A `ProtectedRoute` component enforces:
- Authentication (redirects to `/` if not logged in).
- Role match (redirects to the user's own dashboard if they hit another role's route).
- Onboarding completion for `student`/`teacher` roles (redirects to `/onboarding` if their profile isn't created yet).
- Academic review for students (redirects to `/academic-review` if `academic_review_pending` is true on the user).

| Route | Role | Notes |
|---|---|---|
| `/`, `/register`, `/pending-approval` | Public | Login, registration, pending-approval screen |
| `/onboarding` | student/teacher (post-approval) | First-login profile completion |
| `/academic-review` | student | Waits for admin to confirm Department/Section |
| `/admin/*` | admin | Dashboard + entity management pages |
| `/student/*` | student | Dashboard, courses, attendance, remarks, assignments, AI assistant, profile |
| `/teacher/*` | teacher | Dashboard, classes, attendance, per-class assignments/roster, profile |
| `/staff/*` | staff | Placeholder dashboard only |

`src/config/navigation.ts` is the single source of truth for both the sidebar links and the navbar page title per route, keyed by role.

## Onboarding & Academic Placement Flow

1. User registers as `student`, `teacher`, or `staff` (public registration excludes `admin`) and is created with `status: "pending"`.
2. Admin approves the account from `/admin/approvals`.
3. On first login, an approved student/teacher without a linked profile is routed to `/onboarding` to submit their profile details (`services/auth.ts`'s `completeOnboarding`, `POST /users/onboarding/`).
4. For students, Department and Section are **not** chosen during onboarding — they are assigned later by an admin. Until then, `academic_review_pending` is true on the user and `/academic-review` shows a "waiting for admin" screen with a manual "check status" action (`refreshCurrentUser`, `GET /users/me/`).
5. Once an admin confirms placement (from the Students admin page), the student can reach `/student`.

## Theme System

`src/context/ThemeContext.tsx` provides a light/dark theme, persisted to `localStorage` (`eduportal_theme`) and defaulting to the OS `prefers-color-scheme` when nothing is stored. The active theme is set as `data-theme` on `<html>`; `components/common/ThemeToggle.tsx` toggles it.

## Shared Components

- **`EntityTable`** – Generic, sortable, permission-aware data table used across all admin CRUD pages.
- **`Modal`** / **`ConfirmDialog`** – Form overlay and destructive-action confirmation.
- **`PaginatedSelect`** – Scroll-paginated dropdown with optional server-side search, used for foreign-key pickers (Department, Section, Teacher, Course, etc.) built on the `usePaginatedDropdown` hook.
- **`Avatar`** – Renders a profile picture or initials fallback.
- **`ProfilePictureUploader`** / **`ProfilePhotoCropper`** – Profile picture upload flow with client-side cropping (`react-easy-crop` + `utils/cropImage.ts`) before upload.
- **`ThemeToggle`** – Light/dark switch.
- **`FloatingAiAssistant`** (`components/ai/`) – Floating chat widget for the student AI assistant.
- **`AssignmentEvaluationModal`** (`components/assignments/`) – Teacher-facing modal for reviewing/approving an AI-generated assignment evaluation.

## API / Service Layer

All HTTP calls live under `src/services/`; no component calls `fetch` directly.

- **`api.ts`** – Base `apiRequest` wrapper (base URL, auth header, 401 refresh-and-retry).
- **`auth.ts`** – Login, register, logout, approve/reject user, onboarding, current-user cache.
- **`entities.ts`** – CRUD services for all domain entities (Students, Teachers, Departments, Sections, Courses, CourseOfferings, Enrollments, Attendance, Remarks, Assignments) via a generic `createCrudService<T>` factory, plus dedicated "me" endpoints (`/students/me/...`, `/teachers/me/...`) for self-service data, dropdown "reference" endpoints for foreign-key pickers, attendance bulk-save, profile picture upload/confirm/remove, assignment attachment/submission upload flows, and the AI assistant/evaluation endpoints.
- **`tokenScheduler.ts`** – Proactive token refresh scheduling.

### Profile Picture / S3 Handling

Profile pictures (students and teachers) and assignment attachments/submissions use the same two-step flow: the frontend requests a presigned S3 upload URL from the backend, uploads the file directly to S3, then calls a "confirm" endpoint so the backend validates and records the object key. This keeps file bytes off the Django server entirely. See `studentProfilePictureService`/`teacherProfilePictureService` and the assignment attachment/submission functions in `services/entities.ts`, and `ProfilePictureUploader.tsx` / `ProfilePhotoCropper.tsx` for the client-side cropping step before upload.

## AI Features

- **Student AI Assistant** (`pages/student/AiAssistant.tsx`, `components/ai/FloatingAiAssistant.tsx`) – Lets a student ask questions about their own teacher feedback/remarks. Calls `askAiAssistant` (`POST /ai-assistant/ask/`); identity is derived from the JWT, never sent in the request body.
- **AI Assignment Evaluation** (`components/assignments/AssignmentEvaluationModal.tsx`, used from `pages/teacher/ClassAssignments.tsx`) – Teacher-triggered evaluation of a single student's submission (`runAssignmentAiCheck`, `POST .../ai-check/`), returning a suggested score, strengths/weaknesses, and confidence. The teacher then approves, edits, or rejects the evaluation (`reviewAssignmentEvaluation`, `PATCH .../evaluation/`), which is a separate capability from the student assistant above.

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Read via `import.meta.env.VITE_API_BASE_URL` in `src/services/api.ts`, defaulting to `http://127.0.0.1:8000` if unset. The Vite dev server must be restarted after changing `.env`.

## Local Development

**Prerequisites:** Node.js (v18+), npm, and a running Django backend reachable at the URL in `.env` (with CORS configured for `http://localhost:5173`).

```bash
npm install
echo "VITE_API_BASE_URL=http://127.0.0.1:8000" > .env
npm run dev
```

The dev server starts at `http://localhost:5173`.

## Scripts

From `package.json`:

- `npm run dev` – Start the Vite dev server (HMR).
- `npm run build` – Type-check (`tsc -b`) and build the production bundle.
- `npm run lint` – Run ESLint.
- `npm run preview` – Preview the production build locally.

## Known Limitations

- Pagination controls exist on list pages, but `EntityTable` itself expects the data it's given (no infinite client-side loading beyond what each page requests).
- `Permissions.tsx` (admin) is read-only pending a backend endpoint to patch permissions directly.
- Staff functionality beyond an empty placeholder dashboard is not implemented.
- Student self-enrollment exists for browsing/enrolling in available course offerings (`pages/student/Courses.tsx`), but Department/Section academic placement is always admin-assigned, never student-chosen.
