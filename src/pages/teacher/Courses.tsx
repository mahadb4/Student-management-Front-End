import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { getCurrentUser } from "../../services/auth";
import { teacherService, offeringService, courseService, enrollmentService } from "../../services/entities";
import type { Teacher, CourseOffering, Course, Enrollment } from "../../types/user";

export default function TeacherCourses() {
  const user = getCurrentUser();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  
  const [loading, setLoading] = useState(true);

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
        enrollmentService.getAll()
      ]).then(([o, c, e]) => {
        setOfferings(o.filter(x => x.teacher === myTeacher.id));
        setCourses(c);
        setEnrollments(e);
      }).finally(() => setLoading(false));
    }).catch(console.error);
  }, [user]);

  if (loading) {
    return <DashboardLayout title="My Classes"><div style={{ padding: "40px", textAlign: "center" }}>Loading classes...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout title="My Classes">
      <div className="page-header">
        <h2>My Classes</h2>
        <p>Courses you are currently teaching</p>
      </div>

      {!teacher ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          Teacher record not found.
        </div>
      ) : (
        <div className="dashboard-grid">
          {offerings.length === 0 ? (
            <p style={{ color: "var(--color-text-secondary)", gridColumn: "1 / -1" }}>You are not assigned to teach any classes.</p>
          ) : (
            offerings.map(offering => {
              const c = courses.find(x => x.id === offering.course);
              const offeringEnrollments = enrollments.filter(e => e.course_offering === offering.id && e.status === "ACTIVE");
              
              return (
                <div key={offering.id} className="stat-card" style={{ position: "relative" }}>
                  <div style={{ position: "absolute", top: "20px", right: "20px" }}>
                    <span className={`badge ${offering.is_active ? 'badge-success' : 'badge-warning'}`}>
                      {offering.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h3 style={{ margin: "0 0 8px 0" }}>{c ? c.name : "Unknown Course"}</h3>
                  <p style={{ margin: "0 0 16px 0", color: "var(--color-primary)", fontWeight: 600 }}>{c ? c.code : "---"}</p>
                  
                  <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div><strong>Semester:</strong> {offering.semester} {offering.academic_year}</div>
                    <div><strong>Section:</strong> {offering.section}</div>
                    <div><strong>Enrolled Students:</strong> {offeringEnrollments.length}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
