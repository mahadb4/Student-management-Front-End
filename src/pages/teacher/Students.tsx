import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { getCurrentUser } from "../../services/auth";
import { teacherService, offeringService, enrollmentService, studentService, courseService } from "../../services/entities";
import type { Teacher, CourseOffering, Course, Enrollment, Student } from "../../types/user";

export default function TeacherStudents() {
  const user = getCurrentUser();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState("all");

  useEffect(() => {
    if (!user || !user.teacher_id) {
      setLoading(false);
      return;
    }
    
    teacherService.getById(user.teacher_id).then(myTeacher => {
      setTeacher(myTeacher);
      
      Promise.all([
        offeringService.getAll(),
        courseService.getAll(),
        enrollmentService.getAll(),
        studentService.getAll()
      ]).then(([o, c, e, s]) => {
        const myOfferings = o.filter(x => x.teacher === myTeacher.id);
        setOfferings(myOfferings);
        setCourses(c);
        
        const myOfferingIds = myOfferings.map(x => x.id);
        const myEnrollments = e.filter(x => myOfferingIds.includes(x.course_offering));
        setEnrollments(myEnrollments);
        
        const myStudentIds = [...new Set(myEnrollments.map(x => x.student))];
        setStudents(s.filter(x => myStudentIds.includes(x.id)));
        
      }).finally(() => setLoading(false));
    }).catch(console.error);
  }, [user]);

  const filteredEnrollments = useMemo(() => {
    return courseFilter === "all" 
      ? enrollments 
      : enrollments.filter(e => e.course_offering.toString() === courseFilter);
  }, [enrollments, courseFilter]);

  const getCourseInfo = (offeringId: number) => {
    const o = offerings.find(x => x.id === offeringId);
    if (!o) return "Unknown";
    const c = courses.find(x => x.id === o.course);
    return c ? `${c.name} (${c.code}) - Sec ${o.section}` : "Unknown Course";
  };

  if (loading) {
    return <DashboardLayout title="My Students"><div style={{ padding: "40px", textAlign: "center" }}>Loading students...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout title="My Students">
      <div className="page-header">
        <h2>My Students</h2>
        <p>Students enrolled in your classes</p>
      </div>

      {!teacher ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          Teacher record not found.
        </div>
      ) : (
        <>
          <div className="content-card" style={{ marginBottom: "24px", padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <label style={{ fontWeight: 500 }}>Filter by Class:</label>
              <select className="form-control" value={courseFilter} onChange={e => setCourseFilter(e.target.value)} style={{ maxWidth: "300px" }}>
                <option value="all">All Classes</option>
                {offerings.map(o => (
                  <option key={o.id} value={o.id}>{getCourseInfo(o.id)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-responsive content-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Email</th>
                  <th>Class</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEnrollments.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "24px" }}>No students found for this selection.</td>
                  </tr>
                ) : (
                  filteredEnrollments.map(e => {
                    const student = students.find(s => s.id === e.student);
                    return (
                      <tr key={e.id}>
                        <td><strong>{student ? `${student.first_name} ${student.last_name}` : "Unknown"}</strong></td>
                        <td>{student ? student.student_email : "---"}</td>
                        <td>{getCourseInfo(e.course_offering)}</td>
                        <td>
                          <span className={`badge ${
                            e.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'
                          }`}>
                            {e.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
