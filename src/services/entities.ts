import { apiRequest } from "./api";
import { getAccessToken } from "./auth";
import type {
  Student, Teacher, Department, Course,
  CourseOffering, Enrollment, Attendance,
} from "../types/user";

// ── Helper ───────────────────────────────────────────────────────────────────
function authHeaders() {
  const token = getAccessToken();
  return { method: "GET" as const, token: token || undefined };
}

// ── Generic CRUD factory ─────────────────────────────────────────────────────
function createCrudService<T extends { id: number }>(base: string) {
  return {
    getAll: (): Promise<T[]> =>
      apiRequest<T[]>(`${base}/`, authHeaders()),

    getById: (id: number): Promise<T> =>
      apiRequest<T>(`${base}/${id}/`, authHeaders()),

    create: (data: Partial<T>): Promise<T> => {
      const token = getAccessToken();
      return apiRequest<T>(`${base}/`, {
        method: "POST",
        token: token || undefined,
        body: JSON.stringify(data),
      });
    },

    update: (id: number, data: Partial<T>): Promise<T> => {
      const token = getAccessToken();
      return apiRequest<T>(`${base}/${id}/`, {
        method: "PATCH",
        token: token || undefined,
        body: JSON.stringify(data),
      });
    },

    remove: (id: number): Promise<void> => {
      const token = getAccessToken();
      return apiRequest<void>(`${base}/${id}/`, {
        method: "DELETE",
        token: token || undefined,
      }).catch((err) => {
        // 204 No Content returns null body which may throw in json parse
        if (err?.message?.includes("Something went wrong")) return;
        throw err;
      });
    },
  };
}

// ── Entity Services ──────────────────────────────────────────────────────────

export const studentService    = createCrudService<Student>("/students");
export const teacherService    = createCrudService<Teacher>("/teachers");
export const departmentService = createCrudService<Department>("/departments");
export const courseService     = createCrudService<Course>("/courses");
export const offeringService   = createCrudService<CourseOffering>("/course_offerings");
export const enrollmentService = createCrudService<Enrollment>("/enrollments");
export const attendanceService = createCrudService<Attendance>("/attendance");

// ── Convenience Re-exports (used by existing pages) ──────────────────────────
export const getStudents    = studentService.getAll;
export const getTeachers    = teacherService.getAll;
export const getDepartments = departmentService.getAll;
export const getCourses     = courseService.getAll;
