import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { getCurrentUser } from "../../services/auth";
import { studentService, enrollmentService, offeringService, courseService, teacherService } from "../../services/entities";
import type { Student, Enrollment, CourseOffering, Course, Teacher } from "../../types/user";

export default function StudentCourses() {
  const user = getCurrentUser();
  const [student, setStudent] = useState<Student | null>(null);
  
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"my-courses" | "available">("my-courses");
  const [enrolling, setEnrolling] = useState<number | null>(null);

  useEffect(() => {
    if (!user || !user.student_id) return;
    
    studentService.getById(user.student_id).then(myStudent => {
      setStudent(myStudent);
      
      Promise.all([
        enrollmentService.getAll(),
        offeringService.getAll(),
        courseService.getAll(),
        teacherService.getAll()
      ]).then(([e, o, c, t]) => {
        setEnrollments(e.filter(x => x.student === myStudent.id));
        setOfferings(o.filter(x => x.is_active));
        setCourses(c);
        setTeachers(t);
      }).finally(() => setLoading(false));
    }).catch(console.error);
  }, [user]);

  const loadData = () => {
    if (!student) return;
    Promise.all([
      enrollmentService.getAll(),
      offeringService.getAll(),
      courseService.getAll(),
      teacherService.getAll()
    ]).then(([e, o, c, t]) => {
      setEnrollments(e.filter(x => x.student === student.id));
      setOfferings(o.filter(x => x.is_active));
      setCourses(c);
      setTeachers(t);
    });
  };

  const handleEnroll = async (offeringId: number) => {
    if (!student) return;
    setEnrolling(offeringId);
    try {
      await enrollmentService.create({
        student: student.id,
        course_offering: offeringId,
        status: "ACTIVE"
      });
      loadData();
      setActiveTab("my-courses");
    } catch (error) {
      console.error(error);
      alert("Failed to enroll in course.");
    } finally {
      setEnrolling(null);
    }
  };

  const enrolledOfferingIds = enrollments.map(e => e.course_offering);
  const availableOfferings = offerings.filter(o => !enrolledOfferingIds.includes(o.id));

  const getCourseInfo = (offering: CourseOffering) => {
    const c = courses.find(x => x.id === offering.course);
    const t = teachers.find(x => x.id === offering.teacher);
    return {
      courseName: c ? c.name : "Unknown",
      courseCode: c ? c.code : "---",
      credits: c ? c.credits : 0,
      teacherName: t ? `${t.first_name} ${t.last_name}` : "TBA",
    };
  };

  if (loading) {
    return (
      <DashboardLayout title="My Courses">
        <div style={{ padding: "40px", textAlign: "center" }}>Loading courses...</div>
      </DashboardLayout>
    );
  }

  if (!student) {
    return (
      <DashboardLayout title="My Courses">
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          Student record not found.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Courses & Enrollment">
      <div className="page-header">
        <h2>Course Enrollment</h2>
        <p>Manage your classes for the current semester</p>
      </div>

      <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
        <button 
          className={`btn ${activeTab === 'my-courses' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab("my-courses")}
        >
          My Enrollments ({enrollments.length})
        </button>
        <button 
          className={`btn ${activeTab === 'available' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab("available")}
        >
          Available Offerings ({availableOfferings.length})
        </button>
      </div>

      {activeTab === "my-courses" && (
        <div className="dashboard-grid">
          {enrollments.length === 0 ? (
            <p style={{ color: "var(--color-text-secondary)" }}>You are not enrolled in any courses yet.</p>
          ) : (
            enrollments.map(enrollment => {
              const offering = offerings.find(o => o.id === enrollment.course_offering);
              if (!offering) return null;
              const info = getCourseInfo(offering);
              
              return (
                <div key={enrollment.id} className="stat-card" style={{ position: "relative" }}>
                  <div style={{ position: "absolute", top: "20px", right: "20px" }}>
                    <span className="badge badge-success">{enrollment.status}</span>
                  </div>
                  <h3 style={{ margin: "0 0 8px 0" }}>{info.courseName}</h3>
                  <p style={{ margin: "0 0 16px 0", color: "var(--color-primary)", fontWeight: 600 }}>{info.courseCode}</p>
                  
                  <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div><strong>Teacher:</strong> {info.teacherName}</div>
                    <div><strong>Semester:</strong> {offering.semester} {offering.academic_year}</div>
                    <div><strong>Section:</strong> {offering.section}</div>
                    <div><strong>Credits:</strong> {info.credits}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "available" && (
        <div className="table-responsive content-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Course Name</th>
                <th>Teacher</th>
                <th>Term</th>
                <th>Section</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {availableOfferings.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "24px" }}>No courses available for enrollment.</td>
                </tr>
              ) : (
                availableOfferings.map(offering => {
                  const info = getCourseInfo(offering);
                  const isEnrolling = enrolling === offering.id;
                  
                  return (
                    <tr key={offering.id}>
                      <td><strong>{info.courseCode}</strong></td>
                      <td>{info.courseName}</td>
                      <td>{info.teacherName}</td>
                      <td>{offering.semester} {offering.academic_year}</td>
                      <td>{offering.section}</td>
                      <td>
                        <button 
                          className="btn btn-primary" 
                          onClick={() => handleEnroll(offering.id)}
                          disabled={isEnrolling}
                        >
                          {isEnrolling ? "Enrolling..." : "Enroll"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
