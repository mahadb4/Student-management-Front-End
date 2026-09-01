import { useEffect, useState } from "react";
import { getCurrentUser } from "../../services/auth";
import { getMyEnrollments, getCourseOfferingReference, enrollInCourseOffering, invalidateMeCache } from "../../services/entities";
import type { StudentEnrollmentListItem, CourseOfferingReference } from "../../types/user";

export default function StudentCourses() {
  const user = getCurrentUser();
  const [notFound, setNotFound] = useState(false);

  const [enrollments, setEnrollments] = useState<StudentEnrollmentListItem[]>([]);

  // Offerings available to enroll in - a separate, system-wide list, decoupled
  // from "My Enrollments" (which now carries its own teacher_name and no
  // longer needs a course_offerings lookup at all).
  const [offerings, setOfferings] = useState<CourseOfferingReference[]>([]);
  const [offeringsPage, setOfferingsPage] = useState(1);
  const [offeringsTotalPages, setOfferingsTotalPages] = useState(1);
  const [loadingMoreOfferings, setLoadingMoreOfferings] = useState(false);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"my-courses" | "available">("my-courses");
  const [enrolling, setEnrolling] = useState<number | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getMyEnrollments(1, 10),
      getCourseOfferingReference(1, 10),
    ]).then(([e, o]) => {
      setEnrollments(e.results);
      setOfferings(o.results.filter(x => x.is_active));
      setOfferingsPage(o.current_page);
      setOfferingsTotalPages(o.total_pages);
    }).catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  };

  const loadMoreOfferings = () => {
    if (loadingMoreOfferings || offeringsPage >= offeringsTotalPages) return;
    setLoadingMoreOfferings(true);
    const nextPage = offeringsPage + 1;

    getCourseOfferingReference(nextPage, 10).then(o => {
      setOfferings(prev => [...prev, ...o.results.filter(x => x.is_active)]);
      setOfferingsPage(o.current_page);
      setOfferingsTotalPages(o.total_pages);
    }).finally(() => setLoadingMoreOfferings(false));
  };

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnroll = async (offeringId: number) => {
    setEnrolling(offeringId);
    try {
      await enrollInCourseOffering(offeringId);
      invalidateMeCache("enrollments:1:10");
      loadData();
      setActiveTab("my-courses");
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to enroll in course.");
    } finally {
      setEnrolling(null);
    }
  };

  const enrolledOfferingIds = enrollments.map(e => e.course_offering_id);
  const availableOfferings = offerings.filter(o => !enrolledOfferingIds.includes(o.id));

  if (loading) {
    return (
      <>
        <div style={{ padding: "40px", textAlign: "center" }}>Loading courses...</div>
      </>
    );
  }

  if (notFound) {
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
            enrollments.map(enrollment => (
              <div key={enrollment.id} className="stat-card" style={{ position: "relative" }}>
                <div style={{ position: "absolute", top: "20px", right: "20px" }}>
                  <span className="badge badge-success">{enrollment.status}</span>
                </div>
                <h3 style={{ margin: "0 0 8px 0" }}>{enrollment.course_name}</h3>
                <p style={{ margin: "0 0 16px 0", color: "var(--color-primary)", fontWeight: 600 }}>{enrollment.course_code}</p>

                <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div><strong>Teacher:</strong> {enrollment.teacher_name || "TBA"}</div>
                  <div><strong>Semester:</strong> {enrollment.semester} {enrollment.academic_year}</div>
                  <div><strong>Section:</strong> {enrollment.section_name || "No Section"}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "available" && (
        <>
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
                        <td><strong>{offering.course_code || "---"}</strong></td>
                        <td>{offering.course_name || "Unknown"}</td>
                        <td>{offering.teacher_name || "TBA"}</td>
                        <td>{offering.semester} {offering.academic_year}</td>
                        <td>{offering.section_name || "No Section"}</td>
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

          {offeringsPage < offeringsTotalPages && (
            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <button className="btn btn-outline" onClick={loadMoreOfferings} disabled={loadingMoreOfferings}>
                {loadingMoreOfferings ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
