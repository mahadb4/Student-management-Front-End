import{apiRequest}from"./api";
import{getAccessToken}from"./auth";
import type{Student,Teacher,Department,Course,CourseOffering,Enrollment,Attendance,Section,StudentListItem,SectionListItem,TeacherListItem,CourseListItem,EnrollmentListItem,CourseOfferingListItem,CourseOfferingReference,CourseOfferingTeacherListItem,AttendanceListItem,StudentAttendanceListItem,TeacherAttendanceListItem,DepartmentReference,SectionReference,TeacherReference,CourseReference,StudentReference,StudentProfile,StudentSummary,StudentEnrollmentListItem,EnrollmentReference,EnrollmentTeacherListItem,TeacherDashboardSummary,TeacherProfile}from"../types/user";

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
    getList:(page:number=1,pageSize:number=10,signal?:AbortSignal,search?:string):Promise<PaginatedResponse<T>>=>{
      const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
      if(search&&search.trim())params.set("search",search.trim());
      return apiRequest<PaginatedResponse<T>>(`${base}/?${params.toString()}`,authHeaders(signal));
    },

    getAll:(signal?:AbortSignal):Promise<T[]>=>
      apiRequest<PaginatedResponse<T>>(`${base}/?page=1&page_size=500`,authHeaders(signal))
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
export const getStudentList=(page:number=1,pageSize:number=10,signal?:AbortSignal,search?:string):Promise<PaginatedResponse<StudentListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(search&&search.trim())params.set("search",search.trim());
  return apiRequest<PaginatedResponse<StudentListItem>>(`/students/?${params.toString()}`,authHeaders(signal));
};
export const getTeacherList=(page:number=1,pageSize:number=10,signal?:AbortSignal,search?:string):Promise<PaginatedResponse<TeacherListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(search&&search.trim())params.set("search",search.trim());
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
export const getDepartmentReference=(page:number=1,pageSize:number=10,signal?:AbortSignal):Promise<PaginatedResponse<DepartmentReference>>=>
  apiRequest<PaginatedResponse<DepartmentReference>>(`/departments/reference/?page=${page}&page_size=${pageSize}`,authHeaders(signal));

export const getSectionReference=(departmentId?:number,page:number=1,pageSize:number=10,signal?:AbortSignal):Promise<PaginatedResponse<SectionReference>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(departmentId!==undefined)params.set("department_id",String(departmentId));
  return apiRequest<PaginatedResponse<SectionReference>>(`/sections/reference/?${params.toString()}`,authHeaders(signal));
};

export const getTeacherReference=(page:number=1,pageSize:number=10,signal?:AbortSignal,departmentId?:number):Promise<PaginatedResponse<TeacherReference>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(departmentId!==undefined)params.set("department_id",String(departmentId));
  return apiRequest<PaginatedResponse<TeacherReference>>(`/teachers/reference/?${params.toString()}`,authHeaders(signal));
};

export const getCourseReference=(page:number=1,pageSize:number=10,signal?:AbortSignal,departmentId?:number):Promise<PaginatedResponse<CourseReference>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(departmentId!==undefined)params.set("department_id",String(departmentId));
  return apiRequest<PaginatedResponse<CourseReference>>(`/courses/reference/?${params.toString()}`,authHeaders(signal));
};

export const getCourseOfferingReference=(page:number=1,pageSize:number=10,signal?:AbortSignal,search?:string):Promise<PaginatedResponse<CourseOfferingReference>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(search&&search.trim())params.set("search",search.trim());
  return apiRequest<PaginatedResponse<CourseOfferingReference>>(`/course_offerings/reference/?${params.toString()}`,authHeaders(signal));
};

export const getStudentReference=(page:number=1,pageSize:number=10,signal?:AbortSignal):Promise<PaginatedResponse<StudentReference>>=>
  apiRequest<PaginatedResponse<StudentReference>>(`/students/reference/?page=${page}&page_size=${pageSize}`,authHeaders(signal));

// Sections LIST endpoint returns a narrower projection (SectionListItem, with
// department already resolved to {id, name}) than the Section entity used by
// sectionService's getById/create/update/remove.
export const getSectionList=(page:number=1,pageSize:number=10,signal?:AbortSignal,search?:string):Promise<PaginatedResponse<SectionListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(search&&search.trim())params.set("search",search.trim());
  return apiRequest<PaginatedResponse<SectionListItem>>(`/sections/?${params.toString()}`,authHeaders(signal));
};
export const courseService=createCrudService<Course>("/courses");

// Courses LIST endpoint returns a narrower projection (CourseListItem, with
// department/teacher already resolved) than the Course entity used by
// courseService's getById/create/update/remove.
export const getCourseList=(page:number=1,pageSize:number=10,signal?:AbortSignal,search?:string):Promise<PaginatedResponse<CourseListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(search&&search.trim())params.set("search",search.trim());
  return apiRequest<PaginatedResponse<CourseListItem>>(`/courses/?${params.toString()}`,authHeaders(signal));
};
export const offeringService=createCrudService<CourseOffering>("/course_offerings");

// Course Offerings LIST endpoint returns a narrower projection (CourseOfferingListItem, with
// course/teacher/section already resolved to nested objects) than the CourseOffering entity
// used by offeringService's getById/create/update/remove.
export const getCourseOfferingList=(page:number=1,pageSize:number=10,signal?:AbortSignal,search?:string,sectionId?:number):Promise<PaginatedResponse<CourseOfferingListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(search&&search.trim())params.set("search",search.trim());
  if(sectionId!==undefined)params.set("section_id",String(sectionId));
  return apiRequest<PaginatedResponse<CourseOfferingListItem>>(`/course_offerings/?${params.toString()}`,authHeaders(signal));
};
export const enrollmentService=createCrudService<Enrollment>("/enrollments");

// Enrollments LIST endpoint returns a narrower projection (EnrollmentListItem, with
// student/course_offering already resolved) than the Enrollment entity used by
// enrollmentService's getById/create/update/remove.
export const getEnrollmentList=(page:number=1,pageSize:number=10,signal?:AbortSignal,search?:string):Promise<PaginatedResponse<EnrollmentListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(search&&search.trim())params.set("search",search.trim());
  return apiRequest<PaginatedResponse<EnrollmentListItem>>(`/enrollments/?${params.toString()}`,authHeaders(signal));
};
export const attendanceService=createCrudService<Attendance>("/attendance");

// Attendance LIST endpoint returns a narrower projection (AttendanceListItem, with
// enrollment already resolved to {id, student, course}) than the Attendance entity
// used by attendanceService's getById/create/update/remove.
export const getAttendanceList=(page:number=1,pageSize:number=10,signal?:AbortSignal):Promise<PaginatedResponse<AttendanceListItem>>=>
  apiRequest<PaginatedResponse<AttendanceListItem>>(`/attendance/?page=${page}&page_size=${pageSize}`,authHeaders(signal));

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

export const getMyStudentAttendance=(page:number=1,pageSize:number=10):Promise<PaginatedResponse<StudentAttendanceListItem>>=>
  apiRequest<PaginatedResponse<StudentAttendanceListItem>>(`/students/me/attendance/?page=${page}&page_size=${pageSize}`,authHeaders());

export const getMyTeacherProfile=():Promise<TeacherProfile>=>
  apiRequest<TeacherProfile>("/teachers/me/",authHeaders());

export const getMyTeacherDashboard=():Promise<TeacherDashboardSummary>=>
  apiRequest<TeacherDashboardSummary>("/teachers/me/dashboard/",authHeaders());

export const getMyCourseOfferings=(page:number=1,pageSize:number=10):Promise<PaginatedResponse<CourseOfferingTeacherListItem>>=>
  apiRequest<PaginatedResponse<CourseOfferingTeacherListItem>>(`/teachers/me/courses/?page=${page}&page_size=${pageSize}`,authHeaders());

export const getMyTeacherStudents=(page:number=1,pageSize:number=10,courseOfferingId?:number):Promise<PaginatedResponse<EnrollmentTeacherListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(courseOfferingId!==undefined)params.set("course_offering_id",String(courseOfferingId));
  return apiRequest<PaginatedResponse<EnrollmentTeacherListItem>>(`/teachers/me/students/?${params.toString()}`,authHeaders());
};

export const getMyTeacherAttendance=(page:number=1,pageSize:number=10):Promise<PaginatedResponse<TeacherAttendanceListItem>>=>
  apiRequest<PaginatedResponse<TeacherAttendanceListItem>>(`/teachers/me/attendance/?page=${page}&page_size=${pageSize}`,authHeaders());