import { useEffect, useState } from "react";
import { getCurrentUser } from "../../services/auth";
import { getMyStudentProfile, getMyEnrollments, getCourseOfferingList, enrollmentService, invalidateMeCache } from "../../services/entities";
import type { Student, EnrollmentListItem, CourseOfferingListItem } from "../../types/user";

export default function StudentCourses() {
  const user = getCurrentUser();
  const [student, setStudent] = useState<Student | null>(null);

  const [enrollments, setEnrollments] = useState<EnrollmentListItem[]>([]);
  // Every active offering (already carries course/teacher/section nested) - used
  // both to list available offerings and to resolve a teacher name for "my courses"
  // (EnrollmentListItem's course_offering doesn't include teacher, this list does).
  const [offerings, setOfferings] = useState<CourseOfferingListItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"my-courses" | "available">("my-courses");
  const [enrolling, setEnrolling] = useState<number | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getMyEnrollments(1, 500),
      getCourseOfferingList(1, 500),
    ]).then(([e, o]) => {
      setEnrollments(e.results);
      setOfferings(o.results.filter(x => x.is_active));
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    getMyStudentProfile().then(setStudent).catch(() => {});
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnroll = async (offeringId: number) => {
    if (!student) return;
    setEnrolling(offeringId);
    try {
      await enrollmentService.create({
        student: student.id,
        course_offering: offeringId,
        status: "ACTIVE"
      });
      invalidateMeCache("enrollments:1:500");
      loadData();
      setActiveTab("my-courses");
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to enroll in course.");
    } finally {
      setEnrolling(null);
    }
  };

  const enrolledOfferingIds = enrollments.map(e => e.course_offering.id);
  const availableOfferings = offerings.filter(o => !enrolledOfferingIds.includes(o.id));
  const teacherByOffering = (offeringId: number) => offerings.find(o => o.id === offeringId)?.teacher;

  if (loading) {
    return (
      <>
        <div style={{ padding: "40px", textAlign: "center" }}>Loading courses...</div>
      </>
    );
  }

  if (!student) {
    return (
      <>
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          Student record not found.
        </div>
      </>
    );
  }

  return (
    <>
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
              const co = enrollment.course_offering;
              const teacher = teacherByOffering(co.id);

              return (
                <div key={enrollment.id} className="stat-card" style={{ position: "relative" }}>
                  <div style={{ position: "absolute", top: "20px", right: "20px" }}>
                    <span className="badge badge-success">{enrollment.status}</span>
                  </div>
                  <h3 style={{ margin: "0 0 8px 0" }}>{co.course.name}</h3>
                  <p style={{ margin: "0 0 16px 0", color: "var(--color-primary)", fontWeight: 600 }}>{co.course.code}</p>

                  <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div><strong>Teacher:</strong> {teacher ? teacher.name : "TBA"}</div>
                    <div><strong>Semester:</strong> {co.semester} {co.academic_year}</div>
                    <div><strong>Section:</strong> {co.section?.name || "No Section"}</div>
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
                  const isEnrolling = enrolling === offering.id;

                  return (
                    <tr key={offering.id}>
                      <td><strong>{offering.course?.code || "---"}</strong></td>
                      <td>{offering.course?.name || "Unknown"}</td>
                      <td>{offering.teacher ? offering.teacher.name : "TBA"}</td>
                      <td>{offering.semester} {offering.academic_year}</td>
                      <td>{offering.section?.name || "No Section"}</td>
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
    </>
  );
}
