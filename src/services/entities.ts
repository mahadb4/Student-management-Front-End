import{apiRequest}from"./api";
import{getAccessToken}from"./auth";
import type{Student,Teacher,Department,Course,CourseOffering,Enrollment,Attendance,Section,StudentListItem,SectionListItem,TeacherListItem,CourseListItem,EnrollmentListItem,CourseOfferingListItem,AttendanceListItem}from"../types/user";

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
    getList:(page:number=1,pageSize:number=50,signal?:AbortSignal,search?:string):Promise<PaginatedResponse<T>>=>{
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
export const getStudentList=(page:number=1,pageSize:number=50,signal?:AbortSignal,search?:string):Promise<PaginatedResponse<StudentListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(search&&search.trim())params.set("search",search.trim());
  return apiRequest<PaginatedResponse<StudentListItem>>(`/students/?${params.toString()}`,authHeaders(signal));
};
export const getTeacherList=(page:number=1,pageSize:number=50,signal?:AbortSignal,search?:string):Promise<PaginatedResponse<TeacherListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(search&&search.trim())params.set("search",search.trim());
  return apiRequest<PaginatedResponse<TeacherListItem>>(`/teachers/?${params.toString()}`,authHeaders(signal));
};
export const teacherService=createCrudService<Teacher>("/teachers");
export const departmentService=createCrudService<Department>("/departments");
export const sectionService=createCrudService<Section>("/sections");

// Sections LIST endpoint returns a narrower projection (SectionListItem, with
// department already resolved to {id, name}) than the Section entity used by
// sectionService's getById/create/update/remove.
export const getSectionList=(page:number=1,pageSize:number=50,signal?:AbortSignal,search?:string):Promise<PaginatedResponse<SectionListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(search&&search.trim())params.set("search",search.trim());
  return apiRequest<PaginatedResponse<SectionListItem>>(`/sections/?${params.toString()}`,authHeaders(signal));
};
export const courseService=createCrudService<Course>("/courses");

// Courses LIST endpoint returns a narrower projection (CourseListItem, with
// department/teacher already resolved) than the Course entity used by
// courseService's getById/create/update/remove.
export const getCourseList=(page:number=1,pageSize:number=50,signal?:AbortSignal,search?:string):Promise<PaginatedResponse<CourseListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(search&&search.trim())params.set("search",search.trim());
  return apiRequest<PaginatedResponse<CourseListItem>>(`/courses/?${params.toString()}`,authHeaders(signal));
};
export const offeringService=createCrudService<CourseOffering>("/course_offerings");

// Course Offerings LIST endpoint returns a narrower projection (CourseOfferingListItem, with
// course/teacher/section already resolved to nested objects) than the CourseOffering entity
// used by offeringService's getById/create/update/remove.
export const getCourseOfferingList=(page:number=1,pageSize:number=50,signal?:AbortSignal,search?:string):Promise<PaginatedResponse<CourseOfferingListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(search&&search.trim())params.set("search",search.trim());
  return apiRequest<PaginatedResponse<CourseOfferingListItem>>(`/course_offerings/?${params.toString()}`,authHeaders(signal));
};
export const enrollmentService=createCrudService<Enrollment>("/enrollments");

// Enrollments LIST endpoint returns a narrower projection (EnrollmentListItem, with
// student/course_offering already resolved) than the Enrollment entity used by
// enrollmentService's getById/create/update/remove.
export const getEnrollmentList=(page:number=1,pageSize:number=50,signal?:AbortSignal,search?:string):Promise<PaginatedResponse<EnrollmentListItem>>=>{
  const params=new URLSearchParams({page:String(page),page_size:String(pageSize)});
  if(search&&search.trim())params.set("search",search.trim());
  return apiRequest<PaginatedResponse<EnrollmentListItem>>(`/enrollments/?${params.toString()}`,authHeaders(signal));
};
export const attendanceService=createCrudService<Attendance>("/attendance");

// Attendance LIST endpoint returns a narrower projection (AttendanceListItem, with
// enrollment already resolved to {id, student, course}) than the Attendance entity
// used by attendanceService's getById/create/update/remove.
export const getAttendanceList=(page:number=1,pageSize:number=50,signal?:AbortSignal):Promise<PaginatedResponse<AttendanceListItem>>=>
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
//
// Dashboard/Profile/Courses/Attendance all mount independently as the user
// navigates the sidebar, and each needs overlapping "me" data (profile,
// enrollments, ...). Without sharing, every navigation re-fetches it from
// scratch. meCache holds one in-flight/resolved promise per key so a second
// page asking for the same data within the same session reuses it instead of
// firing another request. Cleared on logout and after mutations that would
// make a cached entry stale.
const meCache=new Map<string,Promise<unknown>>();

function cachedMeRequest<T>(key:string,fetcher:()=>Promise<T>):Promise<T>{
  if(!meCache.has(key)){
    meCache.set(key,fetcher().catch(err=>{meCache.delete(key);throw err;}));
  }
  return meCache.get(key) as Promise<T>;
}

export function invalidateMeCache(key?:string){
  if(key)meCache.delete(key);
  else meCache.clear();
}

export const getMyStudentProfile=():Promise<Student>=>
  cachedMeRequest("student-profile",()=>apiRequest<Student>("/students/me/",authHeaders()));

export const getMyEnrollments=(page:number=1,pageSize:number=500):Promise<PaginatedResponse<EnrollmentListItem>>=>
  cachedMeRequest(`enrollments:${page}:${pageSize}`,()=>
    apiRequest<PaginatedResponse<EnrollmentListItem>>(`/students/me/courses/?page=${page}&page_size=${pageSize}`,authHeaders()));

export const getMyStudentAttendance=(page:number=1,pageSize:number=500):Promise<PaginatedResponse<AttendanceListItem>>=>
  cachedMeRequest(`student-attendance:${page}:${pageSize}`,()=>
    apiRequest<PaginatedResponse<AttendanceListItem>>(`/students/me/attendance/?page=${page}&page_size=${pageSize}`,authHeaders()));

export const getMyTeacherProfile=():Promise<Teacher>=>
  cachedMeRequest("teacher-profile",()=>apiRequest<Teacher>("/teachers/me/",authHeaders()));

export const getMyCourseOfferings=(page:number=1,pageSize:number=500):Promise<PaginatedResponse<CourseOfferingListItem>>=>
  cachedMeRequest(`course-offerings:${page}:${pageSize}`,()=>
    apiRequest<PaginatedResponse<CourseOfferingListItem>>(`/teachers/me/courses/?page=${page}&page_size=${pageSize}`,authHeaders()));

export const getMyTeacherStudents=(page:number=1,pageSize:number=500):Promise<PaginatedResponse<StudentListItem>>=>
  cachedMeRequest(`teacher-students:${page}:${pageSize}`,()=>
    apiRequest<PaginatedResponse<StudentListItem>>(`/teachers/me/students/?page=${page}&page_size=${pageSize}`,authHeaders()));

export const getMyTeacherAttendance=(page:number=1,pageSize:number=500):Promise<PaginatedResponse<AttendanceListItem>>=>
  cachedMeRequest(`teacher-attendance:${page}:${pageSize}`,()=>
    apiRequest<PaginatedResponse<AttendanceListItem>>(`/teachers/me/attendance/?page=${page}&page_size=${pageSize}`,authHeaders()));