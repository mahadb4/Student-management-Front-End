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
  // Student-only: true once onboarding created the Student record but an
  // admin hasn't yet confirmed Department/Section. Drives the redirect to
  // the "Application Under Review" page instead of the dashboard.
  academic_review_pending?: boolean;
}

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
  // True only once an admin has explicitly confirmed this student's
  // academic placement (Department + Section) - see the Admin Edit Student
  // form's "Confirm Academic Placement" control.
  placement_confirmed: boolean;
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
  profile_picture_url: string | null;
}

// Shape returned by GET /students/me/identity/: the Navbar-only projection of
// StudentProfile above, fetched once per session by the shared DashboardLayout
// shell on every student-facing page (not just Profile) - deliberately far
// narrower than StudentProfile since the navbar never renders
// parents_phone_number/date_of_birth/gender/address/etc.
export interface StudentIdentity {
  name: string;
  profile_picture_url: string | null;
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
  department_name: string | null;
  section_name: string | null;
  placement_confirmed: boolean;
  profile_picture_url: string | null;
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
// resolved to a display name only via the backend's SectionListDTO - no
// department_id (Edit fetches the full Section detail record instead).
export interface SectionListItem {
  id: number;
  name: string;
  semester_number: number;
  academic_year: number;
  is_active: boolean;
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
// profile - no salary/created_at/updated_at/is_active, none of which any
// Teacher page renders, via the backend's serialize_teacher_profile.
// `name` is already the joined "First Last" string (the Profile page only
// ever renders one name, never first/last separately) - not split into
// first_name/last_name like Teacher (used by Admin's teacherService CRUD
// against /teachers/<id>/, whose edit form needs them as two separate
// inputs). phone_number/date_of_birth/gender/address/qualification are
// included so the Profile page's own edit form can pre-fill current values.
export interface TeacherProfile {
  id: number;
  name: string;
  employee_id: string;
  email: string;
  phone_number: string;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  qualification: string;
  department_name: string | null;
  designation: string;
  profile_picture_url: string | null;
}

// Shape returned by GET /teachers/me/identity/: the Navbar-only projection of
// TeacherProfile above, fetched once per session by the shared DashboardLayout
// shell on every teacher-facing page (not just Profile) - deliberately far
// narrower than TeacherProfile since the navbar never renders employee_id/
// email/phone_number/etc.
export interface TeacherIdentity {
  name: string;
  profile_picture_url: string | null;
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
  department_name: string | null;
  profile_picture_url: string | null;
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

// No course_id/teacher_id/section_id - Edit fetches the full CourseOffering
// detail record instead of populating the form off the list row.
export interface CourseOfferingListItem {
  id: number;
  semester: Semester;
  academic_year: number;
  is_active: boolean;
  course_name: string | null;
  course_code: string | null;
  teacher_name: string | null;
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

// Shape returned by GET /teachers/me/courses/?view=attendance: a narrower
// projection of CourseOfferingTeacherListItem for the Attendance register's
// class dropdown only, which never needs course_code/semester/academic_year/
// is_active/enrolled_students_count - via the backend's
// CourseOfferingMapper.to_attendance_list_dto.
export interface CourseOfferingAttendanceListItem {
  id: number;
  course_name: string | null;
  section_name: string | null;
}

// Shape returned by GET /teachers/me/courses/?view=dashboard: a narrower
// projection of CourseOfferingTeacherListItem for the Teacher Dashboard's
// "My Classes" table only, which never needs semester/academic_year (those
// are only shown on the full My Classes page) - via the backend's
// CourseOfferingMapper.to_dashboard_list_dto.
export interface CourseOfferingDashboardListItem {
  id: number;
  course_name: string | null;
  course_code: string | null;
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

// Shape returned by GET /students/me/courses/reference/: the projection the
// Student Attendance course filter needs - id is the enrollment id (the
// dropdown's option value, matched against attendance rows' enrollment_id),
// course_code/course_name make up the label, and semester/academic_year/
// section_name back the "Term"/"Section" chips shown once selected. Via the
// backend's EnrollmentMapper.to_reference_dto.
export interface EnrollmentReference {
  id: number;
  course_code: string;
  course_name: string;
  semester: string;
  academic_year: number;
  section_name: string | null;
}

export type EnrollmentStatus = "ACTIVE" | "DROPPED" | "COMPLETED";

// Shape returned by GET /students/me/courses/: a narrower projection than
// EnrollmentListItem, dropping student_id/student_name/student_email
// (redundant echoes of the caller's own identity) and adding teacher_name
// (resolved server-side from the enrollment's own course_offering) so the
// Student My Courses UI never needs a separate course_offerings fetch just
// to show who teaches an enrolled course - via the backend's
// EnrollmentMapper.to_student_list_dto.
// course_offering_id is carried so the My Courses page can link straight to
// this course's own Assignments/Attendance view (?course_offering=<id>)
// instead of the general student pages.
export interface StudentEnrollmentListItem {
  id: number;
  status: EnrollmentStatus;
  semester: Semester;
  academic_year: number;
  course_name: string;
  course_code: string;
  teacher_name: string | null;
  section_name: string | null;
  course_offering_id: number;
  profile_picture_url: string | null;
}

// Shape returned by GET /teachers/me/students/: one row per enrollment in
// the authenticated Teacher's own classes. No teacher identity (it's their
// own), no raw student id (student_email is a sufficient identifier for the
// table). No course/section fields either: this endpoint is always called
// with a single ?course_offering_id= (the "All Classes" option was removed),
// so every row's course/section would be identical - the caller already
// knows it, it's the id it just filtered by - via the backend's
// EnrollmentMapper.to_teacher_list_dto.
export interface EnrollmentTeacherListItem {
  enrollment_id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  status: EnrollmentStatus;
  profile_picture_url: string | null;
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
// No student_id/course_offering_id - Edit fetches the full Enrollment detail
// record instead of populating the form off the list row.
export interface EnrollmentListItem {
  id: number;
  status: EnrollmentStatus;
  student_name: string;
  student_email: string;
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
  student_name: string | null;
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

// Shape returned by GET /teachers/me/attendance/: a minimal projection - the
// Attendance register fetches the class roster separately
// (getMyTeacherAttendanceRoster) and maps each row back to a student via
// enrollment_id, so student_name/remarks are not repeated here - via the
// backend's AttendanceMapper.to_teacher_list_dto.
export interface TeacherAttendanceListItem {
  id: number;
  date: string;
  status: AttendanceStatus;
  enrollment_id: number | null;
}

// Shape returned by GET /teachers/me/students/?view=attendance: a narrower
// projection of EnrollmentTeacherListItem for the Attendance register only -
// via the backend's EnrollmentMapper.to_attendance_roster_dto.
export interface AttendanceRosterItem {
  enrollment_id: number;
  student_name: string;
  profile_picture_url: string | null;
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

export type RemarkVisibility = "PRIVATE" | "STUDENT_VISIBLE";

// Shape returned by GET/POST/PATCH /remarks/ to a TEACHER: the Remarks
// action on the Students page already knows which student/class it's
// looking at (the row it was opened from), so the response only adds what
// it doesn't already have - via the backend's serialize_remark_for_teacher.
// "teacher" is kept so the frontend can show Edit/Delete only on remarks
// this teacher wrote.
export interface RemarkTeacherListItem {
  id: number;
  teacher: number;
  remark_text: string;
  visibility: RemarkVisibility;
  created_at: string;
}

// Shape returned by GET /remarks/ to a STUDENT: aggregates remarks across
// different classes/teachers, so course/teacher are needed to tell rows
// apart - via the backend's serialize_remark_for_student. No row has a
// stable id in this projection, so list rendering keys off the row index.
export interface RemarkStudentListItem {
  date: string;
  course: string;
  teacher: string;
  remark: string;
}

export type SubmissionStatus = "SUBMITTED" | "PENDING";

// Shape returned by GET /assignments/ (list) to a TEACHER: the course/class
// context is already known (this is a course-scoped page), so just what the
// assignment table shows - via the backend's _serialize_assignment_for_teacher_list.
export interface AssignmentTeacherListItem {
  id: number;
  title: string;
  due_at: string;
  submitted_count: number;
  pending_count: number;
}

// Attached to GET /assignments/?course_offering=<id> for a TEACHER: just the
// three fields the per-class Assignments page header renders, so that page
// never has to load the whole /teachers/me/courses/ list to resolve one label.
export interface AssignmentCourseSummary {
  id: number;
  course_name: string;
  course_code: string;
  section_name: string | null;
}

// Shape returned by GET/POST/PATCH /assignments/<id>/ to a TEACHER (detail,
// create, update) - used to prefill the Edit form. No course_offering: it's
// fixed at creation and never edited - via _serialize_assignment_for_teacher_detail.
export interface AssignmentTeacherDetail {
  id: number;
  title: string;
  description: string;
  due_at: string;
  attachment_url: string | null;
}

// Shape returned by GET /assignments/ (list and detail) to a STUDENT:
// aggregates across enrolled classes, so course name/code are included, plus
// the student's own submission status resolved server-side - via
// _serialize_assignment_for_student.
export interface AssignmentStudentListItem {
  id: number;
  title: string;
  description: string;
  due_at: string;
  attachment_url: string | null;
  course_name: string;
  course_code: string;
  status: SubmissionStatus;
  submitted_at: string | null;
}

// Shape returned by GET /assignments/<id>/submission/ and the submission
// upload-confirm endpoint - a student's own submission status for one assignment.
export interface MySubmissionStatus {
  status: SubmissionStatus;
  submitted_at: string | null;
  file_url: string | null;
}

// Shape returned by GET /assignments/<id>/submissions/ to a TEACHER: one row
// per enrolled student, via assignment_submissions_api.
export interface SubmissionRosterItem {
  student_id: number;
  student_name: string;
  status: SubmissionStatus;
  submitted_at: string | null;
  file_url: string | null;
}

// Request body for POST /ai-assistant/ask/ - the student's question about
// their own academic data (teacher feedback, attendance, ...).
export interface AiAssistantRequest {
  question: string;
}

// A source backing an AI assistant answer, as returned by
// POST /ai-assistant/ask/. The backend's router (Phase 10B) picks which
// domain(s) are relevant to the question, so the sources array can mix
// types for a combined question - discriminate on `type` before reading
// domain-specific fields. remark_id is kept for potential future use
// (e.g. linking back to the Remarks page) but is not shown to the user.
export interface AiAssistantRemarkSource {
  type: "remark";
  remark_id: number;
  teacher_name: string;
  course_name: string;
  created_at: string;
}

export interface AiAssistantAttendanceSource {
  type: "attendance";
  course_name: string;
  detail: string;
}

// status is derived server-side (Phase 10C) from due_at + whether a
// Submission row exists - "submitted" never implies graded/reviewed, since
// this system has no grading concept. attachment_available is presence-only;
// the backend never sends attachment content to the assistant.
export interface AiAssistantAssignmentSource {
  type: "assignment";
  title: string;
  course_name: string;
  due_at: string;
  status: "pending" | "overdue" | "submitted";
  attachment_available: boolean;
}

// Reflects only the student's currently ACTIVE enrollments (Phase 10D) -
// DROPPED/COMPLETED are deliberately excluded from the assistant's current-
// courses context. teacher_name is always the specific offering's teacher
// (CourseOffering.teacher), not the Course template's own teacher field,
// which can differ. section_name is nullable since a CourseOffering's
// section is optional.
export interface AiAssistantCourseSource {
  type: "course";
  course_name: string;
  course_code: string;
  teacher_name: string | null;
  section_name: string | null;
}

export type AiAssistantSource =
  | AiAssistantRemarkSource
  | AiAssistantAttendanceSource
  | AiAssistantAssignmentSource
  | AiAssistantCourseSource;

// Shape returned by POST /ai-assistant/ask/ via ask_api.
export interface AiAssistantResponse {
  answer: string;
  sources: AiAssistantSource[];
}

// A separate AI capability from the Student RAG Assistant above - a
// teacher-triggered, single-document evaluation of one submission, not
// retrieval-augmented Q&A. Shape returned by both
// POST /assignments/<id>/submissions/<studentId>/ai-check/ and
// PATCH .../evaluation/ (assignments.api.ai_evaluation_api._serialize_evaluation) -
// the same shape, so both calls can update the same local state.
// suggested_score/strengths/weaknesses/ai_feedback/confidence are AI-
// generated and never written by the review endpoint; final_score/
// teacher_feedback/status are teacher-controlled and never written by the
// ai-check endpoint (which always resets status back to AI_SUGGESTED).
export type AssignmentEvaluationStatus = "AI_SUGGESTED" | "APPROVED" | "EDITED" | "REJECTED";
export type AssignmentEvaluationConfidence = "low" | "medium" | "high" | "";

export interface AssignmentEvaluation {
  id: number;
  suggested_score: number | null;
  strengths: string[];
  weaknesses: string[];
  ai_feedback: string;
  confidence: AssignmentEvaluationConfidence;
  final_score: number | null;
  teacher_feedback: string;
  status: AssignmentEvaluationStatus;
  updated_at: string;
}

// Request body for PATCH /assignments/<id>/submissions/<studentId>/evaluation/ -
// the teacher's final decision. final_score is required for APPROVED/EDITED,
// optional for REJECTED (assignment_evaluation_review_api).
export interface AssignmentEvaluationReviewRequest {
  status: "APPROVED" | "EDITED" | "REJECTED";
  final_score?: number | null;
  teacher_feedback?: string;
}