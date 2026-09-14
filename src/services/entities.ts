import{apiRequest}from"./api";
import{getAccessToken}from"./auth";
import type{Student,Teacher,Department,Course,CourseOffering,Enrollment,Attendance,RemarkTeacherListItem,RemarkStudentListItem,Section,StudentListItem,SectionListItem,TeacherListItem,CourseListItem,EnrollmentListItem,CourseOfferingListItem,CourseOfferingReference,CourseOfferingTeacherListItem,CourseOfferingAttendanceListItem,AttendanceListItem,AttendanceStatus,AttendanceRosterItem,StudentAttendanceListItem,TeacherAttendanceListItem,DepartmentReference,SectionReference,TeacherReference,CourseReference,StudentReference,StudentProfile,StudentSummary,StudentEnrollmentListItem,EnrollmentReference,EnrollmentTeacherListItem,TeacherDashboardSummary,TeacherProfile,AssignmentTeacherListItem,AssignmentTeacherDetail,AssignmentCourseSummary,AssignmentStudentListItem,MySubmissionStatus,SubmissionRosterItem,AiAssistantResponse,AssignmentEvaluation,AssignmentEvaluationReviewRequest}from"../types/user";

function authHeaders(signal?:AbortSignal){
  const token=getAccessToken();
  return{method:"GET"as const,token:token||undefined,signal};
}

export interface PaginatedResponse<T>{
  total_count:number;
  current_page:number;
  page_size:number;
  total_pages:number;
  results:T[];
}

function createCrudService<T extends{id:number}>(base:string){
  return{
    getList:(page:number=1,pageSize:number=10,signal?:AbortSignal,search?:string,ordering?:string):Promise<PaginatedResponse<T>>=>{
      const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
      if(search&&search.trim())params.set("search",search.trim());
      if(ordering)params.set("ordering",ordering);
      return apiRequest<PaginatedResponse<T>>(`${base}/?${params.toString()}`,authHeaders(signal));
    },

    getAll:(signal?:AbortSignal):Promise<T[]>=>
      apiRequest<PaginatedResponse<T>>(`${base}/?page=1&page_size=10`,authHeaders(signal))
        .then(response=>response.results||[]),

    getById:(id:number,signal?:AbortSignal):Promise<T>=>
      apiRequest<T>(`${base}/${id}/`,authHeaders(signal)),

    create:(data:Partial<T>):Promise<T>=>{
      const token=getAccessToken();
      return apiRequest<T>(`${base}/`,{
        method:"POST",
        token:token||undefined,
        body:JSON.stringify(data)
      });
    },

    update:(id:number,data:Partial<T>):Promise<T>=>{
      const token=getAccessToken();
      return apiRequest<T>(`${base}/${id}/`,{
        method:"PATCH",
        token:token||undefined,
        body:JSON.stringify(data)
      });
    },

    remove:(id:number):Promise<void>=>{
      const token=getAccessToken();
      return apiRequest<void>(`${base}/${id}/`,{
        method:"DELETE",
        token:token||undefined
      });
    }
  };
}

export const studentService=createCrudService<Student>("/students");

// Students LIST endpoint returns a narrower projection (StudentListItem, with
// department/section already resolved to {id, name}) than the Student entity
// used by studentService's getById/create/update/remove.
export const getStudentList=(page:number=1,pageSize:number=10,signal?:AbortSignal,search?:string,departmentId?:number,ordering?:string):Promise<PaginatedResponse<StudentListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(search&&search.trim())params.set("search",search.trim());
  if(departmentId!==undefined)params.set("department",String(departmentId));
  if(ordering)params.set("ordering",ordering);
  return apiRequest<PaginatedResponse<StudentListItem>>(`/students/?${params.toString()}`,authHeaders(signal));
};
export const getTeacherList=(page:number=1,pageSize:number=10,signal?:AbortSignal,search?:string,departmentId?:number,ordering?:string):Promise<PaginatedResponse<TeacherListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(search&&search.trim())params.set("search",search.trim());
  if(departmentId!==undefined)params.set("department",String(departmentId));
  if(ordering)params.set("ordering",ordering);
  return apiRequest<PaginatedResponse<TeacherListItem>>(`/teachers/?${params.toString()}`,authHeaders(signal));
};
export const teacherService=createCrudService<Teacher>("/teachers");
export const departmentService=createCrudService<Department>("/departments");
export const sectionService=createCrudService<Section>("/sections");

// ── Reference (dropdown/foreign-key selection) endpoints ────────────────────
// Return only {id, name[, ...]} — the minimal shape a <select>/scrollable
// dropdown needs — using the same paginated envelope as the LIST endpoints
// (page_size defaults to 10, matching backend default_page_size). These exist
// alongside (not instead of) the LIST endpoints above, whose fuller field set
// is still required by each resource's own management page.
export const getDepartmentReference=(page:number=1,pageSize:number=10,signal?:AbortSignal,search?:string):Promise<PaginatedResponse<DepartmentReference>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(search&&search.trim())params.set("search",search.trim());
  return apiRequest<PaginatedResponse<DepartmentReference>>(`/departments/reference/?${params.toString()}`,authHeaders(signal));
};

export const getSectionReference=(departmentId?:number,page:number=1,pageSize:number=10,signal?:AbortSignal,semesterNumber?:number,academicYear?:number):Promise<PaginatedResponse<SectionReference>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(departmentId!==undefined)params.set("department_id",String(departmentId));
  if(semesterNumber!==undefined)params.set("semester_number",String(semesterNumber));
  if(academicYear!==undefined)params.set("academic_year",String(academicYear));
  return apiRequest<PaginatedResponse<SectionReference>>(`/sections/reference/?${params.toString()}`,authHeaders(signal));
};

export const getTeacherReference=(page:number=1,pageSize:number=10,signal?:AbortSignal,departmentId?:number):Promise<PaginatedResponse<TeacherReference>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(departmentId!==undefined)params.set("department_id",String(departmentId));
  return apiRequest<PaginatedResponse<TeacherReference>>(`/teachers/reference/?${params.toString()}`,authHeaders(signal));
};

export const getCourseReference=(page:number=1,pageSize:number=10,signal?:AbortSignal,departmentId?:number,semesterNumber?:number):Promise<PaginatedResponse<CourseReference>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(departmentId!==undefined)params.set("department_id",String(departmentId));
  if(semesterNumber!==undefined)params.set("semester_number",String(semesterNumber));
  return apiRequest<PaginatedResponse<CourseReference>>(`/courses/reference/?${params.toString()}`,authHeaders(signal));
};

export const getCourseOfferingReference=(page:number=1,pageSize:number=10,signal?:AbortSignal,search?:string,teacherId?:number):Promise<PaginatedResponse<CourseOfferingReference>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(search&&search.trim())params.set("search",search.trim());
  if(teacherId!==undefined)params.set("teacher_id",String(teacherId));
  return apiRequest<PaginatedResponse<CourseOfferingReference>>(`/course_offerings/reference/?${params.toString()}`,authHeaders(signal));
};

export const getStudentReference=(page:number=1,pageSize:number=10,signal?:AbortSignal):Promise<PaginatedResponse<StudentReference>>=>
  apiRequest<PaginatedResponse<StudentReference>>(`/students/reference/?page=${page}&page_size=${pageSize}`,authHeaders(signal));

// Sections LIST endpoint returns a narrower projection (SectionListItem, with
// department already resolved to {id, name}) than the Section entity used by
// sectionService's getById/create/update/remove.
export const getSectionList=(page:number=1,pageSize:number=10,signal?:AbortSignal,search?:string,ordering?:string):Promise<PaginatedResponse<SectionListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(search&&search.trim())params.set("search",search.trim());
  if(ordering)params.set("ordering",ordering);
  return apiRequest<PaginatedResponse<SectionListItem>>(`/sections/?${params.toString()}`,authHeaders(signal));
};
export const courseService=createCrudService<Course>("/courses");

// Courses LIST endpoint returns a narrower projection (CourseListItem, with
// department/teacher already resolved) than the Course entity used by
// courseService's getById/create/update/remove.
export const getCourseList=(page:number=1,pageSize:number=10,signal?:AbortSignal,search?:string,ordering?:string):Promise<PaginatedResponse<CourseListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(search&&search.trim())params.set("search",search.trim());
  if(ordering)params.set("ordering",ordering);
  return apiRequest<PaginatedResponse<CourseListItem>>(`/courses/?${params.toString()}`,authHeaders(signal));
};
export const offeringService=createCrudService<CourseOffering>("/course_offerings");

// Course Offerings LIST endpoint returns a narrower projection (CourseOfferingListItem, with
// course/teacher/section already resolved to nested objects) than the CourseOffering entity
// used by offeringService's getById/create/update/remove.
export const getCourseOfferingList=(page:number=1,pageSize:number=10,signal?:AbortSignal,search?:string,sectionId?:number,activeOnly?:boolean,ordering?:string):Promise<PaginatedResponse<CourseOfferingListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(search&&search.trim())params.set("search",search.trim());
  if(sectionId!==undefined)params.set("section_id",String(sectionId));
  if(activeOnly)params.set("active_only","true");
  if(ordering)params.set("ordering",ordering);
  return apiRequest<PaginatedResponse<CourseOfferingListItem>>(`/course_offerings/?${params.toString()}`,authHeaders(signal));
};
export const enrollmentService=createCrudService<Enrollment>("/enrollments");

// Enrollments LIST endpoint returns a narrower projection (EnrollmentListItem, with
// student/course_offering already resolved) than the Enrollment entity used by
// enrollmentService's getById/create/update/remove.
export const getEnrollmentList=(page:number=1,pageSize:number=10,signal?:AbortSignal,search?:string,ordering?:string,courseOfferingId?:number):Promise<PaginatedResponse<EnrollmentListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(search&&search.trim())params.set("search",search.trim());
  if(ordering)params.set("ordering",ordering);
  if(courseOfferingId!==undefined)params.set("course_offering_id",String(courseOfferingId));
  return apiRequest<PaginatedResponse<EnrollmentListItem>>(`/enrollments/?${params.toString()}`,authHeaders(signal));
};
export const attendanceService=createCrudService<Attendance>("/attendance");

// Attendance LIST endpoint returns a narrower projection (AttendanceListItem, with
// enrollment already resolved to {id, student, course}) than the Attendance entity
// used by attendanceService's getById/create/update/remove.
// Admin Attendance page filters (department -> teacher -> course_offering -> date)
// are applied server-side/ORM - see attendance_api.py's _apply_admin_filters.
export interface AttendanceFilters{
  departmentId?:number;
  teacherId?:number;
  courseOfferingId?:number;
  sectionId?:number;
  studentId?:number;
  date?:string;
}

export const getAttendanceList=(page:number=1,pageSize:number=10,signal?:AbortSignal,filters?:AttendanceFilters):Promise<PaginatedResponse<AttendanceListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(filters?.departmentId!==undefined)params.set("department_id",String(filters.departmentId));
  if(filters?.teacherId!==undefined)params.set("teacher_id",String(filters.teacherId));
  if(filters?.courseOfferingId!==undefined)params.set("course_offering_id",String(filters.courseOfferingId));
  if(filters?.sectionId!==undefined)params.set("section_id",String(filters.sectionId));
  if(filters?.studentId!==undefined)params.set("student_id",String(filters.studentId));
  if(filters?.date)params.set("date",filters.date);
  return apiRequest<PaginatedResponse<AttendanceListItem>>(`/attendance/?${params.toString()}`,authHeaders(signal));
};

export interface AttendanceBulkRecord{
  enrollment_id:number;
  status:AttendanceStatus;
  remarks?:string;
}

export interface AttendanceBulkCreatedItem{
  id:number;
  enrollment_id:number;
  date:string;
  status:AttendanceStatus;
  remarks:string;
}

// One class + one date = one HTTP request - see attendance_api.attendance_bulk_api.
// Used by the Teacher Attendance register's Save button instead of one
// POST /attendance/ per student.
export const createAttendanceBulk=(courseOfferingId:number,date:string,records:AttendanceBulkRecord[]):Promise<{created:AttendanceBulkCreatedItem[]}>=>{
  const token=getAccessToken();
  return apiRequest<{created:AttendanceBulkCreatedItem[]}>("/attendance/bulk/",{
    method:"POST",
    token:token||undefined,
    body:JSON.stringify({course_offering_id:courseOfferingId,date,records})
  });
};

// create/update/remove on /remarks/ are teacher-only server-side (see
// remark_api._get_teacher_or_error), so RemarkTeacherListItem - the shape
// the backend actually returns to a teacher - covers all three.
export const remarkService=createCrudService<RemarkTeacherListItem>("/remarks");

// Used by the Students page's Remarks modal: that modal already knows which
// student/class it's showing (the row it was opened from), so this returns
// the narrower teacher-facing shape - see remark_api.serialize_remark_for_teacher.
export const getRemarksForStudentInOffering=(studentId:number,courseOfferingId:number,page:number=1,pageSize:number=50,signal?:AbortSignal):Promise<PaginatedResponse<RemarkTeacherListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize),student:String(studentId),course_offering:String(courseOfferingId)});
  return apiRequest<PaginatedResponse<RemarkTeacherListItem>>(`/remarks/?${params.toString()}`,authHeaders(signal));
};

// GET /remarks/ is already scoped server-side to the authenticated student's
// own STUDENT_VISIBLE remarks (see remarks/authorization.py) - no separate
// "me" endpoint needed, unlike Attendance. Aggregates across classes, so
// this gets the richer student-facing shape with course/teacher names - see
// remark_api.serialize_remark_for_student.
export const getMyRemarks=(page:number=1,pageSize:number=10,signal?:AbortSignal):Promise<PaginatedResponse<RemarkStudentListItem>>=>
  apiRequest<PaginatedResponse<RemarkStudentListItem>>(`/remarks/?page=${page}&page_size=${pageSize}`,authHeaders(signal));

export const getStudents=studentService.getAll;
export const getTeachers=teacherService.getAll;
export const getDepartments=departmentService.getAll;
export const getCourses=courseService.getAll;

export interface AdminSummary{
  total_students:number;
  total_teachers:number;
  total_departments:number;
  total_courses:number;
  total_course_offerings:number;
  total_enrollments:number;
}

export const dashboardService={
  getAdminSummary:(signal?:AbortSignal):Promise<AdminSummary>=>
    apiRequest<AdminSummary>("/dashboard/admin-summary/",authHeaders(signal))
};

// ── Authenticated "me" endpoints ────────────────────────────────────────────
// Resolve the caller's own Student/Teacher data server-side from request.user
// - never a full-collection fetch filtered client-side to find "myself".
// Each call performs a fresh authenticated request; no client-side caching.

export function invalidateMeCache(_key?:string){
  // No-op: retained so existing call sites (post-mutation refresh, logout)
  // continue to compile without change. There is no cache to invalidate.
}

export const getMyStudentProfile=():Promise<StudentProfile>=>
  apiRequest<StudentProfile>("/students/me/",authHeaders());

// Partial update of only the caller's own personally-provided fields
// (date_of_birth/gender/address/parents_phone_number) - the backend
// whitelists to exactly these regardless of what else is sent, so
// department/section/enrollment/status can never be touched here.
export const updateMyStudentProfile=(data:Partial<Pick<StudentProfile,"date_of_birth"|"gender"|"address"|"parents_phone_number">>):Promise<{message:string}>=>{
  const token=getAccessToken();
  return apiRequest<{message:string}>("/students/me/",{
    method:"PATCH",
    token:token||undefined,
    body:JSON.stringify(data)
  });
};

export const getMyStudentSummary=():Promise<StudentSummary>=>
  apiRequest<StudentSummary>("/students/me/summary/",authHeaders());

export const getMyEnrollments=(page:number=1,pageSize:number=10):Promise<PaginatedResponse<StudentEnrollmentListItem>>=>
  apiRequest<PaginatedResponse<StudentEnrollmentListItem>>(`/students/me/courses/?page=${page}&page_size=${pageSize}`,authHeaders());

// Student self-enrollment: the backend derives "student" from the
// authenticated request.user's own student_profile - the frontend never
// needs to know/send the student's own id, unlike enrollmentService.create()
// (the generic Admin enrollment endpoint, which does require an explicit
// student id since Admin can enroll any student).
export const enrollInCourseOffering=(courseOfferingId:number):Promise<StudentEnrollmentListItem>=>{
  const token=getAccessToken();
  return apiRequest<StudentEnrollmentListItem>("/students/me/courses/",{
    method:"POST",
    token:token||undefined,
    body:JSON.stringify({course_offering:courseOfferingId,status:"ACTIVE"})
  });
};

export const getMyEnrollmentsReference=(page:number=1,pageSize:number=10):Promise<PaginatedResponse<EnrollmentReference>>=>
  apiRequest<PaginatedResponse<EnrollmentReference>>(`/students/me/courses/reference/?page=${page}&page_size=${pageSize}`,authHeaders());

// Optional courseOfferingId scopes it down to one course (My Courses' per-card
// "Attendance" link), mirroring getMyTeacherAttendance's same ?course_offering_id=.
// Optional enrollmentId scopes it the same way but keyed by enrollment id -
// used by the Student Attendance page's own course-picker dropdown, whose
// option values are enrollment ids (matching getMyEnrollmentsReference).
export const getMyStudentAttendance=(page:number=1,pageSize:number=10,courseOfferingId?:number,enrollmentId?:number):Promise<PaginatedResponse<StudentAttendanceListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(courseOfferingId!==undefined)params.set("course_offering_id",String(courseOfferingId));
  if(enrollmentId!==undefined)params.set("enrollment_id",String(enrollmentId));
  return apiRequest<PaginatedResponse<StudentAttendanceListItem>>(`/students/me/attendance/?${params.toString()}`,authHeaders());
};

export const getMyTeacherProfile=():Promise<TeacherProfile>=>
  apiRequest<TeacherProfile>("/teachers/me/",authHeaders());

// Partial update of only the caller's own personally-provided fields
// (phone_number/date_of_birth/gender/address/qualification - none of which
// TeacherProfile's read shape carries, since that DTO is display-only). The
// backend whitelists to exactly these regardless of what else is sent, so
// employee_id/department/designation/date_of_joining/salary/status can
// never be touched here.
export interface TeacherProfileUpdate{
  phone_number?:string;
  date_of_birth?:string;
  gender?:string;
  address?:string;
  qualification?:string;
}

export const updateMyTeacherProfile=(data:TeacherProfileUpdate):Promise<{message:string}>=>{
  const token=getAccessToken();
  return apiRequest<{message:string}>("/teachers/me/",{
    method:"PATCH",
    token:token||undefined,
    body:JSON.stringify(data)
  });
};

export const getMyTeacherDashboard=():Promise<TeacherDashboardSummary>=>
  apiRequest<TeacherDashboardSummary>("/teachers/me/dashboard/",authHeaders());

export const getMyCourseOfferings=(page:number=1,pageSize:number=10):Promise<PaginatedResponse<CourseOfferingTeacherListItem>>=>
  apiRequest<PaginatedResponse<CourseOfferingTeacherListItem>>(`/teachers/me/courses/?page=${page}&page_size=${pageSize}`,authHeaders());

// Narrower ?view=attendance projection of the same /teachers/me/courses/
// endpoint above - used only by the Attendance register's class dropdown,
// which never needs course_code/semester/academic_year/is_active/
// enrolled_students_count.
export const getMyCourseOfferingsForAttendance=(page:number=1,pageSize:number=10):Promise<PaginatedResponse<CourseOfferingAttendanceListItem>>=>
  apiRequest<PaginatedResponse<CourseOfferingAttendanceListItem>>(`/teachers/me/courses/?view=attendance&page=${page}&page_size=${pageSize}`,authHeaders());

export const getMyTeacherStudents=(page:number=1,pageSize:number=10,courseOfferingId?:number):Promise<PaginatedResponse<EnrollmentTeacherListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(courseOfferingId!==undefined)params.set("course_offering_id",String(courseOfferingId));
  return apiRequest<PaginatedResponse<EnrollmentTeacherListItem>>(`/teachers/me/students/?${params.toString()}`,authHeaders());
};

// Narrower ?view=attendance projection of the same /teachers/me/students/
// endpoint above - used only by the Attendance register, which never needs
// email/enrollment-status, just who to mark and their avatar.
export const getMyTeacherAttendanceRoster=(page:number=1,pageSize:number=10,courseOfferingId?:number):Promise<PaginatedResponse<AttendanceRosterItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize),view:"attendance"});
  if(courseOfferingId!==undefined)params.set("course_offering_id",String(courseOfferingId));
  return apiRequest<PaginatedResponse<AttendanceRosterItem>>(`/teachers/me/students/?${params.toString()}`,authHeaders());
};

export const getMyTeacherAttendance=(page:number=1,pageSize:number=10,courseOfferingId?:number):Promise<PaginatedResponse<TeacherAttendanceListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(courseOfferingId!==undefined)params.set("course_offering_id",String(courseOfferingId));
  return apiRequest<PaginatedResponse<TeacherAttendanceListItem>>(`/teachers/me/attendance/?${params.toString()}`,authHeaders());
};

export interface ProfilePictureUploadUrlResponse{
  upload_url:string;
  key:string;
  content_type:string;
}

export interface ProfilePictureUrlResponse{
  profile_picture_url:string|null;
}

function profilePictureService(basePath:string){
  return{
    requestUploadUrl:(contentType:string):Promise<ProfilePictureUploadUrlResponse>=>{
      const token=getAccessToken();
      return apiRequest<ProfilePictureUploadUrlResponse>(`${basePath}/profile-picture-upload-url/`,{
        method:"POST",
        token:token||undefined,
        body:JSON.stringify({content_type:contentType})
      });
    },

    confirmUpload:(key:string):Promise<ProfilePictureUrlResponse>=>{
      const token=getAccessToken();
      return apiRequest<ProfilePictureUrlResponse>(`${basePath}/profile-picture-confirm/`,{
        method:"POST",
        token:token||undefined,
        body:JSON.stringify({key})
      });
    },

    remove:():Promise<void>=>{
      const token=getAccessToken();
      return apiRequest<void>(`${basePath}/profile-picture/`,{
        method:"DELETE",
        token:token||undefined
      });
    }
  };
}

export const studentProfilePictureService=profilePictureService("/students/me");
export const teacherProfilePictureService=profilePictureService("/teachers/me");

// ── Assignments ──────────────────────────────────────────────────────────────
// create/update/remove/getById on /assignments/ are teacher-only server-side
// (assignment_api._get_teacher_or_error for POST/PATCH/DELETE; GET detail as
// a teacher returns exactly AssignmentTeacherDetail), so this CRUD service is
// typed to the teacher-facing shape.
export const assignmentService=createCrudService<AssignmentTeacherDetail>("/assignments");

// Used by the teacher's per-class Assignments page - course_offering scopes
// the list to one class, matching how the page itself is course-scoped. The
// response also carries a small `course` summary (name/code/section) for that
// page's header, so it never needs a separate course-list request.
export const getTeacherAssignments=(courseOfferingId:number,page:number=1,pageSize:number=10,signal?:AbortSignal):Promise<PaginatedResponse<AssignmentTeacherListItem>&{course?:AssignmentCourseSummary}>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize),course_offering:String(courseOfferingId)});
  return apiRequest<PaginatedResponse<AssignmentTeacherListItem>&{course?:AssignmentCourseSummary}>(`/assignments/?${params.toString()}`,authHeaders(signal));
};

// GET /assignments/ is already scoped server-side to the authenticated
// student's own enrolled classes - used by the student's My Assignments page.
// Optional courseOfferingId scopes it down to one course (My Courses' per-card
// "Assignments" link), mirroring getTeacherAssignments' same ?course_offering=.
export const getMyAssignments=(page:number=1,pageSize:number=10,courseOfferingId?:number,signal?:AbortSignal):Promise<PaginatedResponse<AssignmentStudentListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(courseOfferingId!==undefined)params.set("course_offering",String(courseOfferingId));
  return apiRequest<PaginatedResponse<AssignmentStudentListItem>>(`/assignments/?${params.toString()}`,authHeaders(signal));
};

// GET /assignments/<id>/ as a student returns AssignmentStudentListItem's
// shape (same fields as the list row) - used to open one assignment's detail.
export const getStudentAssignmentDetail=(assignmentId:number):Promise<AssignmentStudentListItem>=>
  apiRequest<AssignmentStudentListItem>(`/assignments/${assignmentId}/`,authHeaders());

export interface AssignmentFileUploadUrlResponse{
  upload_url:string;
  key:string;
  content_type:string;
}

// Teacher: optional attachment on an assignment - same two-step S3 flow as
// ProfilePictureUploader (request a presigned PUT url, upload directly to
// S3, then confirm so the backend validates and records the key).
export const requestAssignmentAttachmentUploadUrl=(assignmentId:number,contentType:string):Promise<AssignmentFileUploadUrlResponse>=>{
  const token=getAccessToken();
  return apiRequest<AssignmentFileUploadUrlResponse>(`/assignments/${assignmentId}/attachment-upload-url/`,{
    method:"POST",token:token||undefined,body:JSON.stringify({content_type:contentType})
  });
};

export const confirmAssignmentAttachment=(assignmentId:number,key:string):Promise<{attachment_url:string|null}>=>{
  const token=getAccessToken();
  return apiRequest<{attachment_url:string|null}>(`/assignments/${assignmentId}/attachment-confirm/`,{
    method:"POST",token:token||undefined,body:JSON.stringify({key})
  });
};

// Student: own submission status/upload for one assignment - same two-step
// S3 flow, scoped by assignment id (the backend derives the student from
// the authenticated request, never from the client).
export const getMySubmissionStatus=(assignmentId:number):Promise<MySubmissionStatus>=>
  apiRequest<MySubmissionStatus>(`/assignments/${assignmentId}/submission/`,authHeaders());

export const requestSubmissionUploadUrl=(assignmentId:number,contentType:string):Promise<AssignmentFileUploadUrlResponse>=>{
  const token=getAccessToken();
  return apiRequest<AssignmentFileUploadUrlResponse>(`/assignments/${assignmentId}/submission/upload-url/`,{
    method:"POST",token:token||undefined,body:JSON.stringify({content_type:contentType})
  });
};

export const confirmSubmission=(assignmentId:number,key:string):Promise<MySubmissionStatus>=>{
  const token=getAccessToken();
  return apiRequest<MySubmissionStatus>(`/assignments/${assignmentId}/submission/confirm/`,{
    method:"POST",token:token||undefined,body:JSON.stringify({key})
  });
};

// Teacher: roster of every enrolled student's submission status for one
// assignment - used by the "View Submissions" modal. Backend-paginated
// (page_size=10, project standard) rather than fetching the whole roster.
export const getAssignmentSubmissions=(assignmentId:number,page:number=1,pageSize:number=10):Promise<PaginatedResponse<SubmissionRosterItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  return apiRequest<PaginatedResponse<SubmissionRosterItem>>(`/assignments/${assignmentId}/submissions/?${params.toString()}`,authHeaders());
};

// AI Assistant: asks a question about the current user's own authorized
// teacher feedback. Identity comes entirely from the JWT (via apiRequest's
// token header) - there is deliberately no student/user id in the request
// body, since the backend never accepts one for this endpoint either.
export const askAiAssistant=(question:string,signal?:AbortSignal):Promise<AiAssistantResponse>=>{
  const token=getAccessToken();
  return apiRequest<AiAssistantResponse>("/ai-assistant/ask/",{
    method:"POST",token:token||undefined,body:JSON.stringify({question}),signal
  });
};

// ── AI Assignment Evaluation (Phase 11C) ────────────────────────────────────
// A SEPARATE AI capability from askAiAssistant above - teacher-triggered,
// single-document evaluation of one student's submission. Both calls are
// authorized server-side against the calling teacher owning the assignment
// (assignments.api.ai_evaluation_api) - no student/teacher id is ever
// inferred client-side beyond the path parameters the teacher is already
// viewing (this assignment's own submissions roster).

// Runs (or re-runs) the AI evaluation for one student's submission. Re-running
// replaces the same evaluation row server-side (update_or_create) - this
// never creates a frontend-only duplicate.
export const runAssignmentAiCheck=(assignmentId:number,studentId:number):Promise<AssignmentEvaluation>=>{
  const token=getAccessToken();
  return apiRequest<AssignmentEvaluation>(`/assignments/${assignmentId}/submissions/${studentId}/ai-check/`,{
    method:"POST",token:token||undefined
  });
};

// Teacher's final decision on an existing AI evaluation - approve/edit
// (both require an explicit final_score) or reject (score optional).
export const reviewAssignmentEvaluation=(assignmentId:number,studentId:number,review:AssignmentEvaluationReviewRequest):Promise<AssignmentEvaluation>=>{
  const token=getAccessToken();
  return apiRequest<AssignmentEvaluation>(`/assignments/${assignmentId}/submissions/${studentId}/evaluation/`,{
    method:"PATCH",token:token||undefined,body:JSON.stringify(review)
  });
};