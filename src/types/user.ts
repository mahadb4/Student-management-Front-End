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
  department: number | null;
  section: number | null;
  date_of_enrollment: string;
  is_active: boolean;
}

// Shape returned by the Students LIST endpoint (GET /students/): a narrower
// projection than Student, with department/section already resolved to
// {id, name} via the backend's StudentListDTO — no separate lookup needed.
export interface StudentListItem {
  id: number;
  first_name: string;
  last_name: string;
  student_email: string;
  is_active: boolean;
  department: { id: number; name: string } | null;
  section: { id: number; name: string } | null;
}

export interface Section {
  id: number;
  name: string;
  department: number;
  semester_number: number;
  academic_year: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Shape returned by the Sections LIST endpoint (GET /sections/): department
// already resolved to {id, name} via the backend's SectionListDTO.
export interface SectionListItem {
  id: number;
  name: string;
  semester_number: number;
  academic_year: number;
  is_active: boolean;
  department: { id: number; name: string } | null;
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

// Shape returned by the Teachers LIST endpoint (GET /teachers/): a narrower
// projection than Teacher, with department already resolved to {id, name}
// via the backend's TeacherListDTO — no separate lookup needed.
export interface TeacherListItem {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  designation: string;
  department: { id: number; name: string } | null;
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

// Shape returned by the Courses LIST endpoint (GET /courses/): a narrower
// projection than Course, with department/teacher already resolved to
// {id, name}/{id, first_name, last_name} via the backend's CourseListDTO.
export interface CourseListItem {
  id: number;
  code: string;
  name: string;
  credits: number;
  department: { id: number; name: string } | null;
  teacher: { id: number; first_name: string; last_name: string } | null;
}

export type Semester = "FALL" | "SPRING" | "SUMMER";

export interface CourseOfferingListItem {
  id: number;
  semester: Semester;
  academic_year: number;
  is_active: boolean;
  course: { id: number; name: string; code: string } | null;
  teacher: { id: number; first_name: string; last_name: string } | null;
  section: { id: number; name: string } | null;
}

export interface CourseOffering {
  id: number;
  course: number;
  teacher: number;
  semester: Semester;
  academic_year: number;
  section: number | null;
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

// Shape returned by the Enrollments LIST endpoint (GET /enrollments/): a narrower
// projection than Enrollment, with student/course_offering already resolved via
// the backend's EnrollmentListDTO — no separate lookup needed.
export interface EnrollmentListItem {
  id: number;
  status: EnrollmentStatus;
  student: { id: number; first_name: string; last_name: string; student_email: string };
  course_offering: {
    id: number;
    semester: Semester;
    academic_year: number;
    course: { id: number; name: string; code: string };
    section: { id: number; name: string } | null;
  };
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

// Shape returned by the Attendance LIST endpoint (GET /attendance/): a narrower
// projection than Attendance, with enrollment already resolved to nested
// student/course info via the backend's AttendanceListDTO.
export interface AttendanceListItem {
  id: number;
  date: string;
  status: AttendanceStatus;
  remarks: string;
  enrollment: {
    id: number;
    student: { id: number; first_name: string; last_name: string };
    course: { id: number; code: string };
  } | null;
}

export interface Attendance {
  id: number;
  enrollment: number;
  date: string;
  status: AttendanceStatus;
  remarks: string;
  created_at: string;
  updated_at: string;
}