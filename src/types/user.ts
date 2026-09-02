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

// Shape returned by GET /students/me/: the authenticated Student's own
// profile, with department/section already resolved to display names
// server-side (no separate lookup needed) via the backend's
// serialize_student_profile. Distinct from Student (used by the Admin
// studentService CRUD against /students/<id>/, which still returns raw ids).
export interface StudentProfile {
  id: number;
  first_name: string;
  last_name: string;
  student_email: string;
  parents_phone_number: string;
  date_of_birth: string;
  gender: string;
  address: string;
  department_name: string | null;
  section_name: string | null;
  date_of_enrollment: string;
}

// Shape returned by GET /students/me/summary/: only the counts and recent
// records the Student Dashboard renders, via the backend's my_summary_api.
export interface StudentSummary {
  active_enrollments_count: number;
  present_count: number;
  absent_count: number;
  recent_attendance: { id: number; date: string; status: AttendanceStatus }[];
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

// Shape returned by GET /teachers/me/: the authenticated Teacher's own
// profile - no salary/address/gender/date_of_birth/qualification/phone_number/
// created_at/updated_at/is_active, none of which any Teacher page renders,
// via the backend's serialize_teacher_profile. Distinct from Teacher (used by
// Admin's teacherService CRUD against /teachers/<id>/, which still returns
// the full record).
export interface TeacherProfile {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
  email: string;
  department_name: string | null;
  designation: string;
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
  semester_number: number | null;
  department_name: string | null;
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
  semester_number: number | null;
  department_id: number | null;
  department_name: string | null;
}

// Shape returned by the Students REFERENCE endpoint (GET /students/reference/),
// via the backend's StudentReferenceDTO.
export interface StudentReference {
  id: number;
  name: string;
  student_email: string;
  section_id: number | null;
}

export interface Course {
  id: number;
  name: string;
  code: string;
  description: string;
  credits: number;
  semester_number: number | null;
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
  semester_number: number | null;
  department_name: string | null;
  teacher_name: string | null;
}

export type Semester = "FALL" | "SPRING" | "SUMMER";

export interface CourseOfferingListItem {
  id: number;
  semester: Semester;
  academic_year: number;
  is_active: boolean;
  course_id: number | null;
  course_name: string | null;
  course_code: string | null;
  teacher_id: number | null;
  teacher_name: string | null;
  section_id: number | null;
  section_name: string | null;
}

// Shape returned by the Course Offerings REFERENCE endpoint (GET
// /course_offerings/reference/): a read-only projection - no raw
// course/teacher/section ids, since consumers here (Student/Teacher browse
// and lookup screens) never edit an offering - via the backend's
// CourseOfferingReferenceDTO. Distinct from CourseOfferingListItem, which
// Admin's edit form still needs raw ids from.
export interface CourseOfferingReference {
  id: number;
  semester: Semester;
  academic_year: number;
  is_active: boolean;
  course_name: string | null;
  course_code: string | null;
  teacher_name: string | null;
  section_name: string | null;
}

// Shape returned by GET /teachers/me/courses/ ("My Classes"): the
// authenticated Teacher's own offerings - no teacher_name (it's their own)
// and no raw ids, plus enrolled_students_count computed server-side (a
// distinct-active-enrollment count) instead of the frontend downloading
// every enrollment row just to count them - via the backend's
// CourseOfferingMapper.to_teacher_list_dto.
export interface CourseOfferingTeacherListItem {
  id: number;
  course_name: string | null;
  course_code: string | null;
  semester: Semester;
  academic_year: number;
  section_name: string | null;
  is_active: boolean;
  enrolled_students_count: number;
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

// Shape returned by GET /students/me/courses/reference/: the minimal
// projection the Student Attendance course filter dropdown needs - id is the
// enrollment id (the dropdown's option value, matched against attendance
// rows' enrollment_id), course_code/course_name make up the label. Via the
// backend's EnrollmentMapper.to_reference_dto.
export interface EnrollmentReference {
  id: number;
  course_code: string;
  course_name: string;
}

export type EnrollmentStatus = "ACTIVE" | "DROPPED" | "COMPLETED";

// Shape returned by GET /students/me/courses/: a narrower projection than
// EnrollmentListItem, dropping student_id/student_name/student_email
// (redundant echoes of the caller's own identity) and adding teacher_name
// (resolved server-side from the enrollment's own course_offering) so the
// Student My Courses UI never needs a separate course_offerings fetch just
// to show who teaches an enrolled course - via the backend's
// EnrollmentMapper.to_student_list_dto.
export interface StudentEnrollmentListItem {
  id: number;
  status: EnrollmentStatus;
  course_offering_id: number;
  semester: Semester;
  academic_year: number;
  course_name: string;
  course_code: string;
  teacher_name: string | null;
  section_name: string | null;
}

// Shape returned by GET /teachers/me/students/: one row per enrollment in
// the authenticated Teacher's own classes. No teacher identity (it's their
// own), no raw student id (student_email is a sufficient identifier for the
// table); course_offering_id is kept because the Students/Attendance class
// filter dropdown needs it to match rows against - via the backend's
// EnrollmentMapper.to_teacher_list_dto.
export interface EnrollmentTeacherListItem {
  enrollment_id: number;
  course_offering_id: number;
  student_name: string;
  student_email: string;
  course_name: string;
  course_code: string;
  section_name: string | null;
  status: EnrollmentStatus;
}

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
  student_id: number;
  student_name: string;
  student_email: string;
  course_offering_id: number;
  semester: Semester;
  academic_year: number;
  course_name: string;
  course_code: string;
  section_name: string | null;
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

// Shape returned by GET /students/me/attendance/: a narrower projection than
// AttendanceListItem, dropping student_id/student_name/course_id since those
// are redundant echoes of the caller's own identity - via the backend's
// AttendanceMapper.to_student_list_dto.
export interface StudentAttendanceListItem {
  id: number;
  date: string;
  status: AttendanceStatus;
  remarks: string;
  enrollment_id: number | null;
  course_code: string | null;
}

// Shape returned by GET /teachers/me/attendance/: a narrower projection than
// AttendanceListItem, dropping student_id/course_id (unused by the
// Attendance table) - enrollment_id is kept for the class filter, and
// student_name identifies whose row it is - via the backend's
// AttendanceMapper.to_teacher_list_dto.
export interface TeacherAttendanceListItem {
  id: number;
  date: string;
  status: AttendanceStatus;
  remarks: string;
  enrollment_id: number | null;
  student_name: string | null;
}

// Shape returned by GET /teachers/me/dashboard/: only the counts the Teacher
// Dashboard renders - via the backend's my_dashboard_api.
export interface TeacherDashboardSummary {
  active_classes: number;
  total_students: number;
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