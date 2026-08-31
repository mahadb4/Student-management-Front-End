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
// projection than Student, with department/section resolved to flat
// id/name fields (no nested object for a single extra field) via the
// backend's StudentListDTO.
export interface StudentListItem {
  id: number;
  name: string;
  student_email: string;
  is_active: boolean;
  department_id: number | null;
  department_name: string | null;
  section_id: number | null;
  section_name: string | null;
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
// resolved to flat id/name fields via the backend's SectionListDTO.
export interface SectionListItem {
  id: number;
  name: string;
  semester_number: number;
  academic_year: number;
  is_active: boolean;
  department_id: number | null;
  department_name: string | null;
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
// projection than Teacher, with department resolved to flat id/name fields
// via the backend's TeacherListDTO.
export interface TeacherListItem {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  designation: string;
  department_id: number | null;
  department_name: string | null;
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

// Shape returned by the Departments REFERENCE endpoint (GET /departments/reference/):
// only what a foreign-key dropdown needs, via the backend's DepartmentReferenceDTO.
export interface DepartmentReference {
  id: number;
  name: string;
}

// Shape returned by the Sections REFERENCE endpoint (GET /sections/reference/):
// department filtering happens server-side via ?department_id=, so the
// response itself doesn't need to repeat it — via the backend's
// SectionReferenceDTO.
export interface SectionReference {
  id: number;
  name: string;
}

// Shape returned by the Teachers REFERENCE endpoint (GET /teachers/reference/),
// via the backend's TeacherReferenceDTO.
export interface TeacherReference {
  id: number;
  name: string;
}

// Shape returned by the Courses REFERENCE endpoint (GET /courses/reference/),
// via the backend's CourseReferenceDTO.
export interface CourseReference {
  id: number;
  name: string;
  code: string;
}

// Shape returned by the Students REFERENCE endpoint (GET /students/reference/),
// via the backend's StudentReferenceDTO.
export interface StudentReference {
  id: number;
  name: string;
  student_email: string;
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
// projection than Course, with department/teacher resolved to display names
// only — no raw ids, since editing re-fetches the full Course detail record
// instead of using the list item's ids — via the backend's CourseListDTO.
export interface CourseListItem {
  id: number;
  code: string;
  name: string;
  credits: number;
  department_name: string | null;
  teacher_name: string | null;
}

export type Semester = "FALL" | "SPRING" | "SUMMER";

export interface CourseOfferingListItem {
  id: number;
  semester: Semester;
  academic_year: number;
  is_active: boolean;
  course: { id: number; name: string; code: string } | null;
  teacher: { id: number; name: string } | null;
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
  student: { id: number; name: string; student_email: string };
  course_offering: {
    id: number;
    semester: Semester;
    academic_year: number;
    course: { name: string; code: string };
    section: { name: string } | null;
  };
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

// Shape returned by the Attendance LIST endpoint (GET /attendance/): a narrower
// projection than Attendance, with enrollment/student/course resolved to flat
// id/name fields via the backend's AttendanceListDTO.
export interface AttendanceListItem {
  id: number;
  date: string;
  status: AttendanceStatus;
  remarks: string;
  enrollment_id: number | null;
  student_id: number | null;
  student_name: string | null;
  course_id: number | null;
  course_code: string | null;
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