import { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getCurrentUser } from "../../services/auth";
import { getMyEnrollmentsReference, getMyStudentAttendance } from "../../services/entities";
import type { EnrollmentReference, StudentAttendanceListItem } from "../../types/user";

export default function StudentAttendance() {
  const user = getCurrentUser();
  const [searchParams] = useSearchParams();
  const courseOfferingParam = searchParams.get("course_offering");
  const courseOfferingId = courseOfferingParam ? Number(courseOfferingParam) : undefined;

  const [enrollments, setEnrollments] = useState<EnrollmentReference[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [attendance, setAttendance] = useState<StudentAttendanceListItem[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const [attendancePage, setAttendancePage] = useState(1);
  const [attendanceTotalPages, setAttendanceTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Close custom dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Fetch all enrolled courses ONCE on mount
  useEffect(() => {
    if (!user) {
      setEnrollmentsLoading(false);
      return;
    }

    (async () => {
      let page = 1;
      let all: EnrollmentReference[] = [];
      while (true) {
        const res = await getMyEnrollmentsReference(page, 10);
        all = all.concat(res.results);
        if (res.current_page >= res.total_pages) break;
        page += 1;
      }
      return all;
    })()
      .then(res => {
        setEnrollments(res);
        // Pre-select first course if none is selected yet and not navigated via URL param
        if (res.length > 0 && courseOfferingId === undefined) {
          setSelectedEnrollmentId(prev => prev || res[0].id.toString());
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setEnrollmentsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAttendanceForSelection = () => {
    if (courseOfferingId === undefined && !selectedEnrollmentId) {
      setAttendance([]);
      return;
    }

    setAttendanceLoading(true);
    const enrollmentIdFilter = courseOfferingId === undefined && selectedEnrollmentId
      ? Number(selectedEnrollmentId)
      : undefined;

    getMyStudentAttendance(1, 10, courseOfferingId, enrollmentIdFilter)
      .then(a => {
        setAttendance(a.results);
        setAttendancePage(a.current_page);
        setAttendanceTotalPages(a.total_pages);
      })
      .catch(() => setNotFound(true))
      .finally(() => setAttendanceLoading(false));
  };

  useEffect(() => {
    loadAttendanceForSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseOfferingId, selectedEnrollmentId]);

  const loadMoreAttendance = () => {
    if (loadingMore || attendancePage >= attendanceTotalPages) return;
    setLoadingMore(true);
    const nextPage = attendancePage + 1;
    const enrollmentIdFilter = courseOfferingId === undefined && selectedEnrollmentId
      ? Number(selectedEnrollmentId)
      : undefined;

    getMyStudentAttendance(nextPage, 10, courseOfferingId, enrollmentIdFilter).then(a => {
      setAttendance(prev => [...prev, ...a.results]);
      setAttendancePage(a.current_page);
      setAttendanceTotalPages(a.total_pages);
    }).finally(() => setLoadingMore(false));
  };

  const selectedEnrollment = enrollments.find(e => e.id.toString() === selectedEnrollmentId);
  const hasSelection = courseOfferingId !== undefined || selectedEnrollmentId !== "";

  const sortedAttendance = [...attendance].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const total = sortedAttendance.length;
  const presentCount = sortedAttendance.filter(a => a.status === "PRESENT").length;
  const lateCount = sortedAttendance.filter(a => a.status === "LATE").length;
  const absentCount = sortedAttendance.filter(a => a.status === "ABSENT").length;
  const rate = total > 0 ? Math.round(((presentCount + lateCount) / total) * 100) : null;

  function formatAttendanceDate(dateStr: string) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, monthIndex, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    return dateStr;
  }

  if (enrollmentsLoading) {
    return <><div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-secondary)" }}>Loading attendance...</div></>;
  }

  return (
    <>
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <h2>{courseOfferingId ? `${attendance[0]?.course_code || "Course"} - Attendance` : "Attendance Records"}</h2>
        <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--color-text-secondary)" }}>
          {courseOfferingId ? (
            <>Attendance record for this course. <Link to="/student/attendance">Choose a different course</Link></>
          ) : (
            "Select an enrolled course to inspect your presence, attendance rate, and session history"
          )}
        </p>
      </div>

      {notFound ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          Student record not found.
        </div>
      ) : (
        <>
          {/* Course Selection Control Bar */}
          <div
            className="content-card"
            style={{
              marginBottom: "20px",
              padding: "16px 20px",
              boxShadow: "var(--shadow-sm)",
              position: "relative",
              zIndex: 50,
              overflow: "visible",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            {courseOfferingId === undefined ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", position: "relative" }} ref={dropdownRef}>
                <label style={{ fontWeight: 700, fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-secondary)" }}>
                  Select Enrolled Course
                </label>

                {/* Custom Styled Dropdown Trigger */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(prev => !prev)}
                  aria-haspopup="listbox"
                  aria-expanded={isDropdownOpen}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "14px",
                    minWidth: "320px",
                    maxWidth: "440px",
                    padding: "9px 14px",
                    backgroundColor: "#ffffff",
                    border: isDropdownOpen ? "1.5px solid var(--color-primary)" : "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: isDropdownOpen ? "0 0 0 3px rgba(37, 99, 235, 0.12)" : "var(--shadow-sm)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    textAlign: "left",
                    userSelect: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      backgroundColor: "var(--color-primary-light)",
                      color: "var(--color-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                    </div>

                    {selectedEnrollment ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                        <span style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.88rem", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                          {selectedEnrollment.course_name}
                        </span>
                        <span className="teacher-class-code-tag" style={{ flexShrink: 0, fontSize: "0.72rem" }}>
                          {selectedEnrollment.course_code}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
                        Select a course...
                      </span>
                    )}
                  </div>

                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      color: "var(--color-text-secondary)",
                      transition: "transform 0.2s ease",
                      transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                      flexShrink: 0,
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Custom Floating Popover Menu */}
                {isDropdownOpen && (
                  <div
                    role="listbox"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      left: 0,
                      width: "100%",
                      minWidth: "340px",
                      maxWidth: "460px",
                      backgroundColor: "#ffffff",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-md)",
                      boxShadow: "0 12px 28px -4px rgba(0, 0, 0, 0.16), 0 6px 12px -2px rgba(0, 0, 0, 0.08)",
                      zIndex: 1000,
                      maxHeight: "340px",
                      overflowY: "auto",
                      padding: "6px",
                    }}
                  >
                    {enrollments.length === 0 ? (
                      <div style={{ padding: "14px", textAlign: "center", color: "var(--color-text-secondary)", fontSize: "0.86rem" }}>
                        No enrolled courses available
                      </div>
                    ) : (
                      enrollments.map(e => {
                        const isSelected = selectedEnrollmentId === e.id.toString();
                        return (
                          <div
                            key={e.id}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setSelectedEnrollmentId(e.id.toString());
                              setIsDropdownOpen(false);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "9px 12px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              backgroundColor: isSelected ? "var(--color-primary-light)" : "transparent",
                              transition: "background-color 0.12s ease",
                            }}
                            onMouseEnter={evt => {
                              if (!isSelected) evt.currentTarget.style.backgroundColor = "#f8fafc";
                            }}
                            onMouseLeave={evt => {
                              if (!isSelected) evt.currentTarget.style.backgroundColor = "transparent";
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                              <span
                                style={{
                                  fontWeight: isSelected ? 700 : 500,
                                  color: isSelected ? "var(--color-primary)" : "var(--color-text-primary)",
                                  fontSize: "0.86rem",
                                  whiteSpace: "nowrap",
                                  textOverflow: "ellipsis",
                                  overflow: "hidden",
                                }}
                              >
                                {e.course_name}
                              </span>
                              <span className="teacher-class-code-tag" style={{ fontSize: "0.72rem", flexShrink: 0 }}>
                                {e.course_code}
                              </span>
                            </div>
                            {isSelected && (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: "8px" }}>
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label style={{ fontWeight: 700, fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-secondary)" }}>
                  Current Course
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                  <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--color-text-primary)" }}>
                    {attendance[0]?.course_code || "Course"}
                  </span>
                  <span className="teacher-class-code-tag">Enrolled</span>
                </div>
              </div>
            )}

            {/* Course Details Pill */}
            {selectedEnrollment && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <span className="badge" style={{ backgroundColor: "#f8fafc", color: "var(--color-text-secondary)", border: "1px solid #e2e8f0", padding: "6px 12px", fontSize: "0.78rem" }}>
                  Term: <strong style={{ color: "var(--color-text-primary)" }}>{selectedEnrollment.semester || "FALL"} {selectedEnrollment.academic_year || "2026"}</strong>
                </span>
                <span className="badge" style={{ backgroundColor: "#f8fafc", color: "var(--color-text-secondary)", border: "1px solid #e2e8f0", padding: "6px 12px", fontSize: "0.78rem" }}>
                  Section: <strong style={{ color: "var(--color-text-primary)" }}>{selectedEnrollment.section_name || "D"}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Integrated KPI Summary Strip */}
          {hasSelection && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              {/* Attendance Rate */}
              <div
                className="content-card"
                style={{
                  padding: "16px 18px",
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  borderLeft: `4px solid ${rate !== null && rate >= 80 ? "#10b981" : rate !== null && rate >= 65 ? "#f59e0b" : "#ef4444"}`,
                }}
              >
                <span style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-text-secondary)" }}>
                  Attendance Rate
                </span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <span style={{
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    color: rate !== null && rate >= 80 ? "#059669" : rate !== null && rate >= 65 ? "#d97706" : "#dc2626",
                  }}>
                    {rate !== null ? `${rate}%` : "—"}
                  </span>
                  {rate !== null && (
                    <span style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      backgroundColor: rate >= 80 ? "#ecfdf5" : rate >= 65 ? "#fffbeb" : "#fef2f2",
                      color: rate >= 80 ? "#059669" : rate >= 65 ? "#d97706" : "#dc2626",
                    }}>
                      {rate >= 80 ? "Good" : rate >= 65 ? "Average" : "Low"}
                    </span>
                  )}
                </div>
              </div>

              {/* Present */}
              <div
                className="content-card"
                style={{
                  padding: "16px 18px",
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  borderLeft: "4px solid #10b981",
                }}
              >
                <span style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#059669" }}>
                  Present
                </span>
                <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#059669" }}>
                  {presentCount}
                </span>
              </div>

              {/* Late */}
              <div
                className="content-card"
                style={{
                  padding: "16px 18px",
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  borderLeft: "4px solid #f59e0b",
                }}
              >
                <span style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#d97706" }}>
                  Late
                </span>
                <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#d97706" }}>
                  {lateCount}
                </span>
              </div>

              {/* Absent */}
              <div
                className="content-card"
                style={{
                  padding: "16px 18px",
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  borderLeft: "4px solid #ef4444",
                }}
              >
                <span style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#dc2626" }}>
                  Absent
                </span>
                <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#dc2626" }}>
                  {absentCount}
                </span>
              </div>

              {/* Total Sessions */}
              <div
                className="content-card"
                style={{
                  padding: "16px 18px",
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  borderLeft: "4px solid #64748b",
                }}
              >
                <span style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-text-secondary)" }}>
                  Total Sessions
                </span>
                <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-text-primary)" }}>
                  {total}
                </span>
              </div>
            </div>
          )}

          {/* Table / Empty State */}
          {!hasSelection ? (
            <div className="content-card" style={{ padding: "48px 24px", textAlign: "center", boxShadow: "var(--shadow-sm)" }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "var(--color-primary-light)",
                color: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <h3 style={{ margin: "0 0 6px 0", fontSize: "1.05rem", fontWeight: 700 }}>No Course Selected</h3>
              <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--color-text-secondary)", maxWidth: "420px", marginInline: "auto" }}>
                Select an enrolled course from the dropdown above to view your attendance history and rates.
              </p>
            </div>
          ) : attendanceLoading ? (
            <div className="content-card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-secondary)", boxShadow: "var(--shadow-sm)" }}>
              <span style={{ fontSize: "0.88rem" }}>Loading attendance history...</span>
            </div>
          ) : (
            <div className="content-card" style={{ boxShadow: "var(--shadow-sm)" }}>
              {/* Card Header with Legend */}
              <div style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Session History</h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                    {total} session{total === 1 ? "" : "s"} recorded for {selectedEnrollment?.course_name || "this course"}
                  </p>
                </div>

                {/* Status Key */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "0.78rem" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "var(--color-text-secondary)" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981" }} />
                    <strong style={{ color: "var(--color-text-primary)" }}>Present</strong>
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "var(--color-text-secondary)" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#f59e0b" }} />
                    <strong style={{ color: "var(--color-text-primary)" }}>Late</strong>
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "var(--color-text-secondary)" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#ef4444" }} />
                    <strong style={{ color: "var(--color-text-primary)" }}>Absent</strong>
                  </span>
                </div>
              </div>

              <div className="table-responsive">
                <table className="data-table table-compact" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                  <colgroup>
                    <col style={{ width: "25%", minWidth: "180px" }} />
                    <col style={{ width: "35%", minWidth: "220px" }} />
                    <col style={{ width: "20%", minWidth: "140px" }} />
                    <col style={{ width: "20%", minWidth: "140px" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={{ padding: "12px 20px" }}>Date</th>
                      <th style={{ padding: "12px 20px" }}>Course</th>
                      <th style={{ textAlign: "center", padding: "12px 20px" }}>Status</th>
                      <th style={{ padding: "12px 20px" }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: "40px 20px", color: "var(--color-text-secondary)" }}>
                          No attendance sessions recorded for this course yet.
                        </td>
                      </tr>
                    ) : (
                      sortedAttendance.map(a => (
                        <tr key={a.id}>
                          <td style={{ padding: "14px 20px", fontWeight: 600, color: "var(--color-text-primary)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                              {formatAttendanceDate(a.date)}
                            </div>
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.875rem" }}>
                                {selectedEnrollment?.course_name || "Course"}
                              </span>
                              <span className="teacher-class-code-tag" style={{ fontSize: "0.72rem" }}>
                                {a.enrollment_id ? a.course_code : "Unknown"}
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: "center", padding: "14px 20px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "4px 12px",
                                borderRadius: "12px",
                                fontSize: "0.76rem",
                                fontWeight: 700,
                                backgroundColor:
                                  a.status === "PRESENT" ? "rgba(16, 185, 129, 0.12)" :
                                  a.status === "ABSENT" ? "rgba(239, 68, 68, 0.12)" : "rgba(245, 158, 11, 0.12)",
                                color:
                                  a.status === "PRESENT" ? "#059669" :
                                  a.status === "ABSENT" ? "#dc2626" : "#d97706",
                                border: `1px solid ${
                                  a.status === "PRESENT" ? "rgba(16, 185, 129, 0.25)" :
                                  a.status === "ABSENT" ? "rgba(239, 68, 68, 0.25)" : "rgba(245, 158, 11, 0.25)"
                                }`,
                              }}
                            >
                              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "currentColor" }} />
                              {a.status}
                            </span>
                          </td>
                          <td style={{ padding: "14px 20px", color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>
                            {a.remarks ? (
                              <span style={{ color: "var(--color-text-primary)" }}>{a.remarks}</span>
                            ) : (
                              <span style={{ opacity: 0.35 }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {attendancePage < attendanceTotalPages && (
                <div style={{ textAlign: "center", padding: "16px 20px", borderTop: "1px solid var(--color-border)" }}>
                  <button className="btn btn-secondary btn-sm" onClick={loadMoreAttendance} disabled={loadingMore} style={{ padding: "8px 18px", fontWeight: 600 }}>
                    {loadingMore ? "Loading..." : "Load More Records"}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
