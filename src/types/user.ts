export type UserRole = "admin" | "student" | "teacher" | "staff";

export type Permission =
  | "students.view" | "students.create" | "students.update" | "students.delete"
  | "teachers.view" | "teachers.create" | "teachers.update" | "teachers.delete"
  | "staff.view" | "staff.create" | "staff.update" | "staff.delete"
  | "departments.view" | "departments.create" | "departments.update" | "departments.delete"
  | "courses.view" | "courses.create" | "courses.update" | "courses.delete"
  | "course_offerings.view" | "course_offerings.create" | "course_offerings.update" | "course_offerings.delete"
  | "enrollments.view" | "enrollments.create" | "enrollments.update" | "enrollments.delete"
  | "attendance.view" | "attendance.create" | "attendance.update" | "attendance.delete"
  | "surveys.view" | "surveys.submit"
  | "permissions.manage";

export type UserStatus = "pending" | "approved" | "rejected";

export interface User {
  id: number | string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  permissions: Permission[];
  student_id?: number;
  teacher_id?: number;
}

// ── Domain Entities ──────────────────────────────────────────────────────────

export interface Student {
  id: number;
  first_name: string;
  last_name: string;
  student_email: string;
  parents_phone_number: string;
  date_of_birth: string;
  gender: string;
  address: string;
  student_group: string;
  department: number | null;
  teacher: number | null;
  date_of_enrollment: string;
  is_active: boolean;
}

export interface Teacher {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
  email: string;
  phone_number: string;
  department: number | null;
  designation: string;
  qualification: string;
  gender: string;
  date_of_birth: string;
  date_of_joining: string;
  salary: string;
  address: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: number;
  name: string;
  code: string;
  description: string;
  credits: number;
  department: number | null;
  teacher: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type Semester = "FALL" | "SPRING" | "SUMMER";

export interface CourseOffering {
  id: number;
  course: number;
  teacher: number;
  semester: Semester;
  academic_year: number;
  section: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type EnrollmentStatus = "ACTIVE" | "DROPPED" | "COMPLETED";

export interface Enrollment {
  id: number;
  student: number;
  course_offering: number;
  status: EnrollmentStatus;
  enrolled_at: string;
  updated_at: string;
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

export interface Attendance {
  id: number;
  enrollment: number;
  date: string;
  status: AttendanceStatus;
  remarks: string;
  created_at: string;
  updated_at: string;
}