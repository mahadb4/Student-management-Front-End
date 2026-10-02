import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser } from "../../services/auth";
import { getMyEnrollments, getCourseOfferingReference, enrollInCourseOffering, invalidateMeCache } from "../../services/entities";
import { Avatar } from "../../components/common/Avatar";
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

  // Available Offerings is a separate, on-demand fetch - not needed just to
  // view My Enrollments, so it's only triggered the first time that tab is
  // actually opened (see the activeTab effect below), not on initial mount.
  const [offeringsLoaded, setOfferingsLoaded] = useState(false);
  const [loadingOfferings, setLoadingOfferings] = useState(false);

  const loadEnrollments = async () => {
    setLoading(true);
    try {
      // /students/me/courses/ returns every enrollment regardless of status
      // (active + dropped), so a student with more than one page's worth can
      // have an ACTIVE course sitting on page 2+ - fetching only page 1 (as
      // this used to) silently drops it from "My Courses". Loop through every
      // page, same pattern as fetchFullClassRoster on the Teacher side.
      let page = 1;
      let all: StudentEnrollmentListItem[] = [];
      while (true) {
        const res = await getMyEnrollments(page, 10);
        all = all.concat(res.results);
        if (res.current_page >= res.total_pages) break;
        page += 1;
      }
      // "My Courses" means courses the student is currently taking, so a
      // DROPPED enrollment (e.g. the stale-duplicate side of a teacher
      // reassignment) must not still render as a course card here.
      setEnrollments(all.filter(x => x.status === "ACTIVE"));
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const loadOfferings = () => {
    setLoadingOfferings(true);
    getCourseOfferingReference(1, 10).then(o => {
      setOfferings(o.results.filter(x => x.is_active));
      setOfferingsPage(o.current_page);
      setOfferingsTotalPages(o.total_pages);
      setOfferingsLoaded(true);
    }).finally(() => setLoadingOfferings(false));
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
    loadEnrollments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "available" && !offeringsLoaded && !loadingOfferings) {
      loadOfferings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleEnroll = async (offeringId: number) => {
    setEnrolling(offeringId);
    try {
      await enrollInCourseOffering(offeringId);
      invalidateMeCache("enrollments:1:10");
      loadEnrollments();
      // Drop the just-enrolled offering from the already-loaded Available
      // Offerings list locally - the server already excludes it on the next
      // real fetch, this just keeps the current page's list correct without
      // an extra request.
      setOfferings(prev => prev.filter(o => o.id !== offeringId));
      setActiveTab("my-courses");
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to enroll in course.");
    } finally {
      setEnrolling(null);
    }
  };

  // Already-enrolled offerings are excluded server-side (see
  // course_offering_service.py's _exclude_already_enrolled), so `offerings`
  // is already the correct "available to enroll in" set - no client-side
  // cross-referencing against `enrollments` needed.
  const availableOfferings = offerings;

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
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <h2>My Courses</h2>
        <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--color-text-secondary)" }}>
          Manage your enrolled subjects and browse available semester offerings
        </p>
      </div>

      {/* Segmented Tab Bar */}
      <div style={{
        display: "inline-flex",
        backgroundColor: "var(--color-surface-hover)",
        borderRadius: "var(--radius-md)",
        padding: "4px",
        gap: "4px",
        marginBottom: "24px",
        border: "1px solid var(--color-border)"
      }}>
        <button
          type="button"
          onClick={() => setActiveTab("my-courses")}
          style={{
            border: "none",
            cursor: "pointer",
            padding: "8px 18px",
            borderRadius: "6px",
            fontSize: "0.85rem",
            fontWeight: 600,
            transition: "all 0.15s ease",
            backgroundColor: activeTab === "my-courses" ? "var(--color-surface)" : "transparent",
            color: activeTab === "my-courses" ? "var(--color-primary)" : "var(--color-text-secondary)",
            boxShadow: activeTab === "my-courses" ? "var(--shadow-sm)" : "none",
          }}
        >
          My Enrollments ({enrollments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("available")}
          style={{
            border: "none",
            cursor: "pointer",
            padding: "8px 18px",
            borderRadius: "6px",
            fontSize: "0.85rem",
            fontWeight: 600,
            transition: "all 0.15s ease",
            backgroundColor: activeTab === "available" ? "var(--color-surface)" : "transparent",
            color: activeTab === "available" ? "var(--color-primary)" : "var(--color-text-secondary)",
            boxShadow: activeTab === "available" ? "var(--shadow-sm)" : "none",
          }}
        >
          Available Offerings{offeringsLoaded ? ` (${availableOfferings.length})` : ""}
        </button>
      </div>

      {activeTab === "my-courses" && (
        <div className="teacher-classes-grid">
          {enrollments.length === 0 ? (
            <div className="content-card" style={{ padding: "40px", textAlign: "center", gridColumn: "1 / -1" }}>
              <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>You are not enrolled in any courses yet.</p>
            </div>
          ) : (
            enrollments.map(enrollment => (
              <div key={enrollment.id} className="teacher-class-card">
                {/* Header: Title + Code on Left, Status Badge on Right (never collides) */}
                <div className="teacher-class-header">
                  <div className="teacher-class-title-group" style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="teacher-class-title" style={{ fontSize: "1.15rem", fontWeight: 700, lineHeight: 1.35 }}>
                      {enrollment.course_name}
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "2px" }}>
                      <span className="teacher-class-code-tag">
                        {enrollment.course_code}
                      </span>
                      <span style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                        Section: <strong style={{ color: "var(--color-text-primary)" }}>{enrollment.section_name || "D"}</strong>
                      </span>
                    </div>
                  </div>
                  <span className="badge badge-success" style={{ flexShrink: 0, padding: "4px 10px", fontSize: "0.72rem", fontWeight: 700 }}>
                    {enrollment.status}
                  </span>
                </div>

                {/* Details Box */}
                <div className="teacher-class-details">
                  <div className="teacher-class-detail-item">
                    <span className="teacher-class-detail-label">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      Instructor
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <Avatar src={enrollment.profile_picture_url} name={enrollment.teacher_name || "TBA"} size={22} />
                      <span className="teacher-class-detail-val">{enrollment.teacher_name || "TBA"}</span>
                    </div>
                  </div>

                  <div className="teacher-class-detail-item">
                    <span className="teacher-class-detail-label">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      Semester
                    </span>
                    <span className="teacher-class-detail-val">{enrollment.semester} {enrollment.academic_year}</span>
                  </div>
                </div>

                {/* Footer with Quick Action Links */}
                <div className="teacher-class-footer" style={{ justifyContent: "space-between" }}>
                  <Link
                    to={`/student/assignments?course_offering=${enrollment.course_offering_id}`}
                    className="btn btn-sm btn-primary"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      padding: "6px 14px",
                      textDecoration: "none",
                      boxShadow: "0 2px 6px rgba(37, 99, 235, 0.22)",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    Assignments
                  </Link>

                  <Link
                    to={`/student/attendance?course_offering=${enrollment.course_offering_id}`}
                    className="btn btn-sm btn-secondary"
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", padding: "6px 12px", textDecoration: "none" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 11l3 3L22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    Attendance
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "available" && !offeringsLoaded && (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-secondary)" }}>Loading available offerings...</div>
      )}

      {activeTab === "available" && offeringsLoaded && (
        <>
          <div className="table-responsive content-card" style={{ boxShadow: "var(--shadow-sm)" }}>
            <table className="data-table table-compact" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ padding: "12px 20px" }}>Course Code</th>
                  <th style={{ padding: "12px 20px" }}>Course Name</th>
                  <th style={{ padding: "12px 20px" }}>Instructor</th>
                  <th style={{ padding: "12px 20px" }}>Term</th>
                  <th style={{ padding: "12px 20px" }}>Section</th>
                  <th style={{ textAlign: "right", padding: "12px 20px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {availableOfferings.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "32px 20px", color: "var(--color-text-secondary)" }}>
                      No courses currently available for enrollment.
                    </td>
                  </tr>
                ) : (
                  availableOfferings.map(offering => {
                    const isEnrolling = enrolling === offering.id;

                    return (
                      <tr key={offering.id}>
                        <td style={{ padding: "12px 20px" }}>
                          <span className="teacher-class-code-tag">
                            {offering.course_code || "---"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 20px", fontWeight: 600, color: "var(--color-text-primary)" }}>
                          {offering.course_name || "Unknown"}
                        </td>
                        <td style={{ padding: "12px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Avatar name={offering.teacher_name || "TBA"} size={22} />
                            <span>{offering.teacher_name || "TBA"}</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 20px", color: "var(--color-text-secondary)" }}>
                          {offering.semester} {offering.academic_year}
                        </td>
                        <td style={{ padding: "12px 20px" }}>
                          <span className="badge" style={{ backgroundColor: "var(--color-surface-hover)", color: "var(--color-text-strong)", fontWeight: 600 }}>
                            {offering.section_name || "No Section"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", padding: "12px 20px" }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleEnroll(offering.id)}
                            disabled={isEnrolling}
                            style={{ padding: "6px 14px", fontWeight: 600 }}
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
            <div style={{ textAlign: "center", marginTop: "20px" }}>
              <button className="btn btn-secondary btn-sm" onClick={loadMoreOfferings} disabled={loadingMoreOfferings}>
                {loadingMoreOfferings ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
