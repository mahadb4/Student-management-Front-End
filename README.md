# Student Management System - Frontend

This is the official, complete documentation for the **CURRENT** state of the Student Management System frontend. This README serves as the definitive single source of truth for the project's architecture, flow, components, limitations, backend assumptions, and setup instructions. 

It reflects the actual implementation following a major architectural overhaul.

---

## 1. Project Overview

The Student Management System frontend is a comprehensive React application designed to manage the administrative, academic, and user operations of an educational institution. 

**This is not just a UI project.** It is a full frontend application connected to a Django REST Framework backend API with strict authentication, authorization, entity management, and role-based workflows.

**Main Technologies Used:**
- **Framework:** React 19 (orchestrated via Vite)
- **Language:** TypeScript for explicit typing and robust developer experience
- **Routing:** React Router v7 (`react-router-dom`)
- **Authentication:** JWT (JSON Web Tokens) with LocalStorage persistence
- **Access Control:** Role-based access control (RBAC) combined with a dynamic granular permission architecture.
- **Styling:** Custom Vanilla CSS (no Tailwind/Bootstrap dependencies)
- **Backend Integration:** Django REST Framework API backed by PostgreSQL

---

## 2. Complete Project Architecture

The current folder structure strictly separates presentation, domain logic, type definitions, and backend communication.

```text
src/
├── assets/                 # Static assets (images, icons, etc.)
├── components/
│   ├── common/             # Highly reusable UI elements independent of business logic
│   └── layout/             # Master layout components (Sidebar, Navbar, wrappers)
├── hooks/                  # Custom React hooks encapsulating logic (e.g., usePermissions)
├── pages/
│   ├── admin/              # Admin-exclusive dashboards and CRUD management pages
│   ├── auth/               # Unauthenticated pages (Login, Register, Pending Approval)
│   ├── staff/              # Staff role pages
│   ├── student/            # Student role pages (Dashboard, Courses, Attendance)
│   ├── styles/             # Modular CSS for page-level styling
│   └── teacher/            # Teacher role pages (Dashboard, Classes, Rosters)
├── services/               # The API Abstraction Layer (all backend fetch calls live here)
└── types/                  # TypeScript interfaces and type definitions
```

**Folder Responsibilities:**
- **`components/common/`**: Contains `EntityTable`, `Modal`, `ConfirmDialog`. These never fetch data themselves.
- **`components/layout/`**: Contains `DashboardLayout`, `Navbar`, and `Sidebar` which handle the outer UI shell.
- **`hooks/`**: Contains `usePermissions.ts` for evaluating what the current user can do.
- **`pages/`**: Organized strictly by user role. Pages fetch data and pass it to common components.
- **`services/`**: The only place where `fetch` is called. Divides concerns into `api.ts`, `auth.ts`, and `entities.ts`.
- **`types/`**: The single source of truth for the shape of data expected from the backend.

---

## 3. File-by-File Documentation

### Core Files

- **`src/main.tsx`**
  - **Purpose:** React entry point.
  - **Important:** Wraps `App` in `React.StrictMode` and imports global `index.css`.

- **`src/App.tsx`**
  - **Purpose:** The central router. 
  - **Important:** Defines all `Route` paths and wraps them in `ProtectedRoute` components which enforce role-based access.

- **`src/services/api.ts`**
  - **Purpose:** Base fetch wrapper.
  - **Important:** Automatically attaches the JWT `Authorization: Bearer` header to requests. Handles HTTP error throwing. All other services use this file.

- **`src/services/auth.ts`**
  - **Purpose:** Manages authentication lifecycle.
  - **Important:** Contains `loginUser`, `registerUser`, `logoutUser`, and token getters/setters interacting with `localStorage`.

- **`src/services/entities.ts`**
  - **Purpose:** Generic CRUD factory for domain entities.
  - **Important:** Uses a `createCrudService<T>` pattern to generate `getAll`, `getById`, `create`, `update`, `remove` for Students, Teachers, Courses, etc., drastically reducing boilerplate.

- **`src/hooks/usePermissions.ts`**
  - **Purpose:** Evaluates user roles and permissions array.
  - **Important:** Exposes `canRead`, `canCreate`, `canUpdate`, `canDelete` functions used by the UI to hide or disable unauthorized buttons.

- **`src/types/user.ts`**
  - **Purpose:** Defines the shape of all backend data.
  - **Important:** Includes `User`, `UserRole`, `Permission`, `Student`, `Teacher`, `Course`, `CourseOffering`, `Enrollment`, `Attendance`.

- **`src/types/permissions.ts`**
  - **Purpose:** Placeholder/extension file for permission structures.

### Shared Components

- **`src/components/layout/DashboardLayout.tsx`**: The master wrapper for authenticated pages. Injects the Sidebar and Navbar around a `main` content area.
- **`src/components/layout/Sidebar.tsx`**: Renders dynamic navigation links based on the role extracted from `usePermissions`.
- **`src/components/layout/Navbar.tsx`**: Top bar showing the current page title and user profile (with logout functionality).
- **`src/components/common/EntityTable.tsx`**: A generic data table. Receives column definitions and data. Automatically handles injecting "Edit" and "Delete" buttons based on `usePermissions`.
- **`src/components/common/Modal.tsx`**: A simple unstyled modal wrapper.
- **`src/components/common/ConfirmDialog.tsx`**: Used to prompt users before destructive actions (like deleting an entity).

### Authentication Pages

- **`src/pages/auth/Login.tsx`**: Handles user credential submission, calls `loginUser`, and redirects to the appropriate dashboard based on role.
- **`src/pages/auth/Register.tsx`**: Allows users to create an account with a specific role. Redirects to pending approval.
- **`src/pages/auth/PendingApproval.tsx`**: An informational screen indicating the user's account requires admin approval.

### Admin Pages (located in `src/pages/admin/`)

- **`AdminDashboard.tsx`**: Overview dashboard. Fetches metrics (counts) for students, teachers, departments, etc., using `Promise.all`.
- **`Departments.tsx`**: CRUD for `Department` entities.
- **`Courses.tsx`**: CRUD for `Course` entities.
- **`CourseOfferings.tsx`**: CRUD for `CourseOffering` entities (assigning a course to a teacher for a semester).
- **`Teachers.tsx`**: CRUD for `Teacher` entities.
- **`Students.tsx`**: CRUD for `Student` entities.
- **`Staff.tsx`**: CRUD for `User` records with the staff role.
- **`Enrollments.tsx`**: CRUD for `Enrollment` (linking students to offerings).
- **`AttendanceMgmt.tsx`**: Global attendance view and management.
- **`PendingApprovals.tsx`**: Lists users with `status="pending"`. Admin can approve or reject them here.
- **`Permissions.tsx`**: Displays users and their granular permissions array. *Currently read-only because backend dynamic permission patching is pending.*

### Student Pages (located in `src/pages/student/`)

- **`StudentDashboard.tsx`**: Fetches the authenticated user's `student_id` to load their specific `Student` record, active enrollments, and attendance statistics.
- **`Courses.tsx`**: Displays the courses the specific student is enrolled in.
- **`Attendance.tsx`**: Displays the specific student's attendance history.
- **`Profile.tsx`**: Displays the student's personal details.

### Teacher Pages (located in `src/pages/teacher/`)

- **`TeacherDashboard.tsx`**: Uses `user.teacher_id` to load the teacher's profile and count their assigned course offerings and students.
- **`Courses.tsx`**: Lists the `CourseOffering`s assigned specifically to this teacher's ID.
- **`Students.tsx`**: Lists students enrolled in any of the teacher's offerings.
- **`Attendance.tsx`**: Interface for the teacher to mark attendance specifically for their course offerings.

### Staff Pages (located in `src/pages/staff/`)

- **`StaffDashboard.tsx`**: Currently a placeholder page stating that staff features will be implemented in future phases. Functionality for Staff is highly limited at present.

---

## 4. Routing Architecture

Routing is strictly enforced in `App.tsx` using a custom `ProtectedRoute` wrapper.

| Route | Page Component | Allowed Roles | Authentication Required | Purpose |
|------|------|------|------|------|
| `/` | `Login` | Any (Public) | No | User login |
| `/register` | `Register` | Any (Public) | No | Account creation |
| `/pending-approval`| `PendingApproval` | Any (Public) | No | Wait screen for new users |
| `/admin` | `AdminDashboard` | `admin` | Yes | Admin overview |
| `/admin/*` | `Students`, `Teachers`, etc.| `admin` | Yes | Admin entity management |
| `/student` | `StudentDashboard` | `student` | Yes | Student overview |
| `/student/*` | `Courses`, `Attendance`, etc.| `student` | Yes | Student features |
| `/teacher` | `TeacherDashboard` | `teacher` | Yes | Teacher overview |
| `/teacher/*` | `Courses`, `Students`, etc.| `teacher` | Yes | Teacher features |
| `/staff` | `StaffDashboard` | `staff` | Yes | Staff overview |

**Route Guard Behavior:**
- If an unauthenticated user visits a protected route, they are redirected to `/` (Login).
- If a user manually tries to access another role's route (e.g., a student typing `/admin`), the `ProtectedRoute` intercepts them and forcefully redirects them to their designated dashboard (`/student`).
- Unknown routes (`*`) fallback to `/`.

*(Historical Context: Previous iterations of the sidebar redirected users to login if they clicked restricted links. This was solved by fixing the `ProtectedRoute` logic and strictly filtering the Sidebar navigation links based on role).*

---

## 5. Authentication Flow

1. **Submission:** User enters email and password on `/`.
2. **API Call:** Frontend sends `POST /api/users/login/` via `auth.ts`.
3. **Response:** Backend validates and returns the User object alongside `access` and `refresh` JWT tokens.
4. **Storage:** Tokens and serialized User object are stored in `localStorage`.
5. **Redirection:** Frontend reads `user.role` and redirects to the correct dashboard (`/admin`, `/student`, etc.).
6. **Subsequent Requests:** `api.ts` extracts the `access` token from `localStorage` and appends it to the headers (`Authorization: Bearer <token>`).
7. **Logout:** Clears `localStorage` and redirects to `/`. Attempting a `POST /api/users/logout/` with the refresh token to blacklist it on the backend.

*Note: Token refresh logic on 401 Unauthorized responses is not currently implemented in the frontend interceptor.*

---

## 6. User Registration and Approval Flow

**Public Registration:**
Only `student`, `teacher`, and `staff` roles can be selected on the public registration page. Admins cannot be publicly registered.

**The Flow:**
1. User submits details on `/register`.
2. Backend creates a `User` record with `status: "pending"`.
3. Frontend redirects the user to `/pending-approval`.
4. Admin logs in and navigates to `/admin/approvals`.
5. Admin reviews the pending user and clicks "Approve" (Triggers `PATCH /api/users/<id>/approve/`).
6. The user's status changes to `approved` in the backend.
7. The user can now successfully log in.

---

## 7. Role System

The system relies on four distinct roles with the following frontend capabilities (enforced by UI restrictions and protected routes):

| Feature | Admin | Teacher | Student | Staff |
|--------|-------|---------|---------|-------|
| View Students | Yes | Yes (Own) | No | No |
| Add/Edit/Delete Students | Yes | No | No | No |
| Manage Departments | Yes | No | No | No |
| Manage Courses & Offerings | Yes | No | No | No |
| Manage Enrollments | Yes | No | No | No |
| Mark Attendance | Yes | Yes (Own) | No | No |
| View Attendance | Yes | Yes (Own) | Yes (Own) | No |
| Manage Approvals | Yes | No | No | No |
| View Permissions | Yes | No | No | No |

---

## 8. Dynamic Permission System

The architecture supports dynamic, granular permissions to complement standard roles.

**Architecture Goal:**
While roles define broad access (Admin = full access, Student = read-only own data), the dynamic permission system allows the backend to return an array of specific permissions (e.g., `["students.view", "surveys.create"]`).

**Frontend Implementation:**
- `src/hooks/usePermissions.ts` reads the `permissions` array from the current user.
- Admins automatically return `true` for all checks.
- Other roles evaluate `hasPermission(permissionString)`.
- Reusable functions like `canRead(resource)`, `canCreate(resource)`, `canUpdate(resource)`, `canDelete(resource)` are exported.
- The `EntityTable` component conditionally renders "Edit" and "Delete" buttons based on these checks.

**Security Distinction:**
Frontend permission checks improve UX (hiding buttons you can't use). **Backend permission checks provide actual security.** Hiding a button does not prevent a user from manually sending an HTTP request. The Django backend remains authoritative.

---

## 9. Complete Entity Architecture

The frontend consumes the following entity models provided by the backend:

**Entity Definitions:**
- **User:** The base authentication record. Has a role, status, and permissions.
- **Student:** A student profile. *Connected one-to-one with a User via `student_id`.*
- **Teacher:** A teacher profile. *Connected one-to-one with a User via `teacher_id`.*
- **Department:** Academic groupings (e.g., Computer Science).
- **Course:** An academic subject (e.g., Intro to Programming).
- **CourseOffering:** A specific instantiation of a Course, assigned to a specific Teacher, for a specific Semester/Year.
- **Enrollment:** The link placing a Student inside a specific CourseOffering.
- **Attendance:** A record marking a specific Enrollment as Present/Absent/Late on a specific Date.

**Relationship Map (Frontend Perspective):**
```text
User 
 ├── Student (via user.student_id)
 └── Teacher (via user.teacher_id)

Department
 ├── Teachers (foreign key)
 └── Courses (foreign key)

Course
 └── CourseOffering (foreign key)

CourseOffering
 ├── Teacher (foreign key)
 └── Enrollments (foreign key)

Enrollment
 ├── Student (foreign key)
 └── Attendance (foreign key)
```

---

## 10. API Integration Documentation

All API logic lives in `src/services/`.

| Frontend Function | HTTP Method | Endpoint | Purpose |
|------------------|-------------|----------|---------|
| `loginUser` | `POST` | `/users/login/` | Authenticate and get JWT |
| `registerUser` | `POST` | `/users/register/` | Create pending account |
| `logoutUser` | `POST` | `/users/logout/` | Blacklist refresh token |
| `getUsers` | `GET` | `/users/` | List all users |
| `getPendingUsers`| `GET` | `/users/pending/` | List users awaiting approval |
| `approveUser` | `PATCH` | `/users/<id>/approve/`| Approve a pending user |
| `rejectUser` | `PATCH` | `/users/<id>/reject/` | Reject a pending user |

**Entity CRUD (Generated by `createCrudService` in `entities.ts`):**

Each of the following services exposes `getAll`, `getById`, `create`, `update`, `remove`:
- `studentService` -> `/students/`
- `teacherService` -> `/teachers/`
- `departmentService` -> `/departments/`
- `courseService` -> `/courses/`
- `offeringService` -> `/course_offerings/`
- `enrollmentService` -> `/enrollments/`
- `attendanceService` -> `/attendance/`

*All endpoints except `/users/login/` and `/users/register/` require Authentication.*

---

## 11. Admin Workflow

The Admin is the system controller with full CRUD access.

- **User Approval:** Admin navigates to `/admin/approvals`, views pending registrations, and approves them.
- **Master Data Management:** Admin can create and modify `Departments`, `Courses`, `Teachers`, and `Students`.
- **Academic Scheduling:** Admin creates `CourseOfferings` (linking a Course to a Teacher for a semester).
- **Enrollments:** Admin explicitly creates `Enrollments` linking Students to CourseOfferings.
- **Permissions:** Admin views the role and granular permission assignment on the `Permissions` page.

---

## 12. Student Workflow

1. Student registers publicly.
2. Admin approves.
3. Student logs in.
4. Lands on `StudentDashboard`. The system identifies the student profile using `user.student_id`.
5. **My Courses:** Student navigates to `/student/courses` to view offerings tied to their enrollments.
6. **Attendance:** Student navigates to `/student/attendance` to view their personal presence records.
7. **Profile:** Read-only view of their personal details.
*(Note: Self-enrollment logic is not currently implemented. Admins must enroll students).*

---

## 13. Teacher Workflow

1. Teacher registers publicly.
2. Admin approves.
3. Teacher logs in.
4. Lands on `TeacherDashboard`. The system identifies the teacher profile using `user.teacher_id`.
5. **My Classes:** Teacher navigates to `/teacher/courses` to view `CourseOfferings` assigned specifically to them.
6. **Students:** Teacher navigates to `/teacher/students` to see the roster across all their active offerings.
7. **Attendance:** Teacher marks attendance for specific enrollments on specific dates.

---

## 14. Staff Workflow

- **Currently Implemented:** Basic role-based routing and an empty `StaffDashboard`.
- **Not Yet Implemented:** All specific staff domain functionality (e.g., HR tools, generalized reporting, communications).

---

## 15. Shared Components

- **`EntityTable` (`EntityTable.tsx`):**
  - **Purpose:** Centralizes table styling, data mapping, and permission-aware action buttons.
  - **Props:** `data`, `columns`, `resourceName` (used for permission checks), `onEdit`, `onDelete`, `onView`.
  - **Behavior:** If `onEdit` is passed and `usePermissions().canUpdate(resourceName)` is true, the Edit button appears.

- **`Modal` (`Modal.tsx`):**
  - **Purpose:** Simple overlay for forms. Relies on conditional rendering via an `isOpen` prop.

- **`ConfirmDialog` (`ConfirmDialog.tsx`):**
  - **Purpose:** Intercepts dangerous actions. Used across all Admin pages before issuing a `DELETE` API call.

- **`DashboardLayout` (`DashboardLayout.tsx`):**
  - **Purpose:** Ensures visual consistency. Embeds `Sidebar` and `Navbar`.

- **`Sidebar` (`Sidebar.tsx`):**
  - **Purpose:** Generates navigation links dynamically based on the current user's role.

---

## 16. State and Data Flow

Data flows linearly from the API to React component state.

**Example Flow (Loading Students in Admin):**
1. `Students.tsx` mounts.
2. `useEffect` fires, setting `loading` state to `true`.
3. Calls `getStudents()` (from `entities.ts`).
4. Promise resolves with data -> sets `students` array state.
5. Sets `loading` state to `false`.
6. Data is passed down to `EntityTable` as props.

**State Management Choice:**
The application strictly uses local React State (`useState`, `useEffect`). No global state management libraries (Redux, Zustand) are used because the data is localized to individual pages and auth state is handled via LocalStorage.

---

## 17. Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

- The `VITE_` prefix is strictly required by Vite to expose the variable to the frontend code.
- If the file is modified, the Vite dev server must be restarted manually.

---

## 18. Installation and Running

**Prerequisites:**
- Node.js (v18+)
- npm
- The Django Backend server must be running and accessible at the URL defined in `.env`.

**Steps:**
```bash
# Install dependencies
npm install

# Create environment file
echo "VITE_API_BASE_URL=http://127.0.0.1:8000" > .env

# Run development server
npm run dev
```

The frontend will start at `http://localhost:5173`. CORS must be configured on the backend to accept requests from this origin.

---

## 19. Development Commands

- `npm run dev`: Starts the Vite development server with Hot Module Replacement (HMR).
- `npm run build`: Compiles TypeScript and builds the optimized production bundle using Vite.
- `npx tsc --noEmit`: Runs the TypeScript compiler in dry-run mode to check for type errors across the entire codebase without emitting JS files.
- `npm run lint`: Runs ESLint to check for code quality and formatting issues.

---

## 20. Current Database / Backend Assumptions

The frontend makes the following strict assumptions about the backend architecture:
- **Authentication:** JWT is used via `/users/login/`.
- **One-to-One User Profiles:** A `User` record contains `student_id` and `teacher_id` integers if a linked profile exists. The frontend no longer attempts to match users to profiles using email strings.
- **RESTful Endpoints:** Endpoints end with trailing slashes (e.g., `/students/`) and accept standard JSON.
- **Permissions:** The backend enforces permissions securely.

---

## 21. Important Architectural Decisions

- **Removal of Mock Data:** The frontend contains absolutely zero mock data logic. It is entirely dependent on the live Django API. This ensures development strictly mirrors production realities.
- **Centralized API Services:** No component is allowed to use `fetch()` directly. All HTTP logic lives in `services/`. This allows easy global changes (like swapping out token logic or changing headers).
- **TypeScript Interfaces:** Explicit types in `types/user.ts` prevent runtime errors and define the contract between frontend and backend.
- **Permission Hook:** Centralizing RBAC into `usePermissions` prevents massive `if (user.role === 'admin')` statements scattered across 50 components.

---

## 22. Known Limitations / Not Yet Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Token Refresh | Not Implemented | `api.ts` does not intercept 401s to use the refresh token automatically. |
| Pagination | Not Implemented | `EntityTable` expects the full dataset. |
| Admin Dynamic Permissions | Partial | UI is built, but `Permissions.tsx` is read-only because the backend lacks a `PATCH /users/` endpoint for permissions. |
| Student Self-Enrollment | Not Implemented | Admin must manually link Students to CourseOfferings. |
| Staff Functionality | Not Implemented | Only an empty placeholder dashboard exists. |
| Profile Editing | Not Implemented | Profiles are currently read-only for students and teachers. |

---

## 23. Future Development Guide

**How to Add a New Feature Safely (e.g., "Surveys"):**

1. **Backend First:** Ensure the backend exposes `/api/surveys/` and handles permissions.
2. **Types:** Add the `Survey` interface to `src/types/user.ts`.
3. **Permissions:** Add `"surveys.view"`, `"surveys.create"` to the `Permission` type union.
4. **Service:** Add `export const surveyService = createCrudService<Survey>("/surveys");` to `src/services/entities.ts`.
5. **Page Component:** Create `src/pages/admin/Surveys.tsx`. Use `EntityTable` to display data and `Modal` for forms.
6. **Routing:** Add the protected route in `App.tsx`.
7. **Sidebar:** Add the navigation link in `Sidebar.tsx`.

By following this pattern, the architecture expands predictably without requiring rewrites.

---

## 24. For Developers and AI Agents

**READ THIS BEFORE MODIFYING THE CODEBASE:**

1. **Understand the Service Layer:** Never write `fetch` inside a React component. Always add functions to `api.ts`, `auth.ts`, or `entities.ts`.
2. **Understand the Types:** If the backend API response changes, update `src/types/user.ts` FIRST.
3. **Do Not Reintroduce Mock Data:** Development must happen against a local instance of the Django backend.
4. **Do Not Bypass Permissions:** Always use `usePermissions()` in the UI to hide restricted actions. Do not duplicate logic.
5. **Rely on IDs, Not Strings:** Use `user.student_id` to link an auth user to a student profile. Do not use email matching.
6. **Reuse Shared Components:** If you need a table, use `EntityTable`. Do not build a custom HTML `<table>` unless absolutely necessary.
7. **Check Backend Expectations:** Do not assume the backend accepts a payload without verifying it. 
8. **Validation:** After making changes, always run `npx tsc --noEmit` and `npm run build` to ensure type safety and successful compilation.
