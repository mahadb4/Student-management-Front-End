import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "../../services/auth";
import { getMyCourseOfferingsForAttendance, getMyTeacherAttendanceRoster, getMyTeacherAttendance, createAttendanceBulk, invalidateMeCache } from "../../services/entities";
import { Avatar } from "../../components/common/Avatar";
import { useToast } from "../../context/ToastContext";
import type { CourseOfferingAttendanceListItem, AttendanceRosterItem, TeacherAttendanceListItem, AttendanceStatus } from "../../types/user";

// Reuses the same /teachers/me/courses/ endpoint the My Classes page calls,
// via its ?view=attendance projection (id/course_name/section_name only -
// no course_code/semester/academic_year/is_active/enrolled_students_count,
// none of which this dropdown renders) instead of a separate
// /course_offerings/reference/ request or the fuller My-Classes shape.
// Looped across pages (same reasoning as the roster below) so a teacher with
// more classes than one page still sees all of them, never a "Load More".
const CLASS_PAGE_SIZE = 50;

async function fetchAllTeacherCourseOfferings(): Promise<CourseOfferingAttendanceListItem[]> {
  let page = 1;
  let all: CourseOfferingAttendanceListItem[] = [];

  while (true) {
    const res = await getMyCourseOfferingsForAttendance(page, CLASS_PAGE_SIZE);
    all = all.concat(res.results);
    if (res.current_page >= res.total_pages) break;
    page += 1;
  }

  return all;
}

// Attendance is mandatory for every ACTIVE enrolled student - the register
// must never let one hide behind an un-loaded page. getMyTeacherAttendanceRoster
// (the ?view=attendance projection - just enrollment_id/student_name/
// profile_picture_url, none of the email/status fields this page never uses)
// is still paginated server-side (ACTIVE-only - see teacher_api.my_students_api),
// but this loads every page automatically so the teacher is never required to
// scroll/"Load More" just to discover the rest of the class. page_size=50
// (rather than the general-browsing default of 10) keeps this to one request
// for most classes and only a couple for a large one.
const ROSTER_PAGE_SIZE = 50;

async function fetchFullClassRoster(courseOfferingId: number): Promise<AttendanceRosterItem[]> {
  let page = 1;
  let all: AttendanceRosterItem[] = [];

  while (true) {
    const res = await getMyTeacherAttendanceRoster(page, ROSTER_PAGE_SIZE, courseOfferingId);
    all = all.concat(res.results);
    if (res.current_page >= res.total_pages) break;
    page += 1;
  }

  return all;
}

// /teachers/me/attendance/ has no date filter, so the full history for the
// selected class is fetched once (paginated) and the register's columns and
// per-student rates are derived from it client-side - no backend changes needed.
async function fetchFullClassAttendance(courseOfferingId: number): Promise<TeacherAttendanceListItem[]> {
  let page = 1;
  let all: TeacherAttendanceListItem[] = [];

  while (true) {
    const res = await getMyTeacherAttendance(page, ROSTER_PAGE_SIZE, courseOfferingId);
    all = all.concat(res.results);
    if (res.current_page >= res.total_pages) break;
    page += 1;
  }

  return all;
}

const STATUS_LABEL: Record<AttendanceStatus, string> = { PRESENT: "Present", LATE: "Late", ABSENT: "Absent" };

// Local calendar date, NOT toISOString() - that is UTC, so east of Greenwich
// it reports yesterday after midnight local time. The backend validates
// against its own local date.today(), so a UTC-derived "today" would both
// default the picker to the wrong day and make the input's max block today.
function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatDateShort(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, monthIndex, day);
    return dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return dateStr;
}

export default function TeacherAttendance() {
  const user = getCurrentUser();
  const { showToast } = useToast();

  const [offerings, setOfferings] = useState<CourseOfferingAttendanceListItem[]>([]);
  const [courseFilter, setCourseFilter] = useState("");

  const [classRoster, setClassRoster] = useState<AttendanceRosterItem[]>([]);
  const [attendance, setAttendance] = useState<TeacherAttendanceListItem[]>([]);

  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [classDataLoading, setClassDataLoading] = useState(false);

  const [date, setDate] = useState(todayIso());
  // undefined = genuinely unmarked - never defaulted to PRESENT. A saved
  // record's real status, or an explicit teacher click (including Mark All
  // Present), is the only way an entry gets a value here.
  const [statusByEnrollment, setStatusByEnrollment] = useState<Record<number, AttendanceStatus | undefined>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Load the teacher's classes once, then default to the first one.
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchAllTeacherCourseOfferings()
      .then(results => {
        setOfferings(results);
        if (results.length > 0) {
          setCourseFilter(results[0].id.toString());
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadClassData = () => {
    if (!courseFilter) return;
    setClassDataLoading(true);
    Promise.all([
      fetchFullClassRoster(Number(courseFilter)),
      fetchFullClassAttendance(Number(courseFilter)),
    ])
      .then(([roster, attendanceRecords]) => {
        setClassRoster(roster);
        setAttendance(attendanceRecords);
      })
      .catch(() => setNotFound(true))
      .finally(() => {
        setClassDataLoading(false);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadClassData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseFilter]);

  // Seed the selected date's column from whatever is actually saved -
  // nothing is defaulted. A student with no saved record for this date stays
  // undefined (genuinely unmarked) until the teacher explicitly clicks a status.
  useEffect(() => {
    const forDate = new Map(
      attendance.filter(a => a.date === date && a.enrollment_id !== null).map(a => [a.enrollment_id as number, a.status])
    );
    const next: Record<number, AttendanceStatus | undefined> = {};
    for (const student of classRoster) {
      next[student.enrollment_id] = forDate.get(student.enrollment_id);
    }
    setStatusByEnrollment(next);
  }, [date, classRoster, attendance]);

  // The selected date already has at least one saved attendance record for
  // this class - it's history now, not an open marking session. Source of
  // truth is the existing `attendance` array (from the existing API), not a
  // new endpoint - see attendance_service's unique_enrollment_date constraint,
  // which is exactly what already prevents a second record for the same
  // student+date+offering.
  const dateHasSavedRecords = useMemo(
    () => attendance.some(a => a.date === date),
    [attendance, date],
  );

  const getCourseInfo = (offering: CourseOfferingAttendanceListItem) =>
    `${offering.course_name || "Unknown Course"} - ${offering.section_name || "No Section"}`;

  const handleMarkAllPresent = () => {
    // Still an explicit teacher action (a deliberate click), not a silent
    // default - only available while the date is an open marking session.
    setStatusByEnrollment(prev => {
      const next = { ...prev };
      for (const student of classRoster) next[student.enrollment_id] = "PRESENT";
      return next;
    });
  };

  // Every student in classRoster must have an explicit status before Save is
  // allowed - this is what blocks a partially-marked session from being saved.
  const unmarkedCount = useMemo(
    () => classRoster.filter(s => !statusByEnrollment[s.enrollment_id]).length,
    [classRoster, statusByEnrollment],
  );

  const canSave = !dateHasSavedRecords && classRoster.length > 0 && unmarkedCount === 0;

  const handleSave = async () => {
    if (isSaving || !canSave) return;
    setIsSaving(true);
    try {
      // dateHasSavedRecords is false here (canSave requires it) - every
      // enrolled student is genuinely new for this date. ONE request for the
      // whole class (POST /attendance/bulk/), not one POST per student - see
      // attendance_service.create_bulk, which validates and writes the
      // complete roster as a single atomic transaction server-side.
      const records = classRoster.map(student => ({
        enrollment_id: student.enrollment_id,
        status: statusByEnrollment[student.enrollment_id] as AttendanceStatus,
      }));

      const { created } = await createAttendanceBulk(Number(courseFilter), date, records);

      // Only the fields TeacherAttendanceListItem actually carries now - the
      // student's name/avatar already live in classRoster, keyed by the same
      // enrollment_id, so there's no need to echo them back here too.
      const newRecords: TeacherAttendanceListItem[] = created.map(record => ({
        id: record.id,
        date: record.date,
        status: record.status,
        enrollment_id: record.enrollment_id,
      }));

      // Appending these records (no refetch) is what flips dateHasSavedRecords
      // to true for this date on the next render - the marking column
      // disappears and this date becomes just another read-only history
      // column, with no forced "advance to next day" or reload of anything else.
      setAttendance(prev => [...prev, ...newRecords]);

      invalidateMeCache("teacher-attendance:1:10");
      showToast(
        `Attendance saved for ${formatDateShort(date)} (${newRecords.length} ${newRecords.length === 1 ? "record" : "records"}).`,
        "success"
      );
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Failed to save attendance.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Every saved date is a uniform, read-only history column - including the
  // currently selected `date` once it has records. There is no separate
  // "unlock and re-edit" path any more: a saved record can only be changed by
  // a Request Correction flow (tracked separately), never directly from here.
  const historyDates = useMemo(() => {
    const dates = Array.from(new Set(attendance.map(a => a.date)));
    dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return dates.slice(-7);
  }, [attendance]);

  // The marking column (editable P/L/A buttons) only exists while the
  // selected date has no saved records at all - i.e. a genuinely open,
  // not-yet-saved session.
  const showMarkingColumn = !dateHasSavedRecords;

  const historyByStudent = useMemo(() => {
    const map = new Map<number, Map<string, AttendanceStatus>>();
    for (const a of attendance) {
      if (a.enrollment_id === null) continue;
      if (!map.has(a.enrollment_id)) map.set(a.enrollment_id, new Map());
      map.get(a.enrollment_id)!.set(a.date, a.status);
    }
    return map;
  }, [attendance]);

  // Simple attendance rate over whatever history has actually loaded (including
  // the selected date once saved) - clean percentage badge.
  const rateByStudent = useMemo(() => {
    const rates = new Map<number, number>();
    for (const [enrollmentId, byDate] of historyByStudent.entries()) {
      const total = byDate.size;
      if (total === 0) continue;
      const present = Array.from(byDate.values()).filter(s => s === "PRESENT" || s === "LATE").length;
      rates.set(enrollmentId, Math.round((present / total) * 100));
    }
    return rates;
  }, [historyByStudent]);

  // Compact summary for the selected date, computed from the editable column.
  const daySummary = useMemo(() => {
    const counts = { PRESENT: 0, LATE: 0, ABSENT: 0 } as Record<AttendanceStatus, number>;
    for (const student of classRoster) {
      const status = statusByEnrollment[student.enrollment_id];
      if (status) counts[status] += 1;
    }
    return counts;
  }, [classRoster, statusByEnrollment]);

  if (loading) {
    return <><div style={{ padding: "40px", textAlign: "center" }}>Loading...</div></>;
  }

  return (
    <>
      <div className="page-header" style={{ marginBottom: "16px" }}>
        <h2>Attendance</h2>
        <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--color-text-secondary)" }}>
          Mark and manage attendance for your classes
        </p>
      </div>

      {notFound ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          Teacher record not found.
        </div>
      ) : (
        <>
          {/* Aligned control + save toolbar */}
          <div
            className="content-card"
            style={{
              position: "sticky",
              top: 0,
              zIndex: 5,
              marginBottom: "18px",
              padding: "16px 20px",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              gap: "20px",
              flexWrap: "wrap",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label style={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-text-secondary)" }}>
                  Class
                </label>
                <select
                  className="form-control"
                  value={courseFilter}
                  onChange={e => setCourseFilter(e.target.value)}
                  style={{ fontWeight: 500, backgroundColor: "var(--color-surface)", padding: "7px 12px", fontSize: "0.86rem", minWidth: "220px" }}
                >
                  {offerings.length === 0 && <option value="">-- No Classes --</option>}
                  {offerings.map(o => (
                    <option key={o.id} value={o.id}>{getCourseInfo(o)}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label style={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-text-secondary)" }}>
                  Date
                </label>
                <input
                  type="date"
                  max={todayIso()}
                  className="form-control"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  style={{ padding: "7px 12px", fontSize: "0.86rem", backgroundColor: "var(--color-surface)" }}
                />
              </div>

              {classRoster.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  <label style={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-text-secondary)" }}>
                    Session Summary
                  </label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", minHeight: "36px" }}>
                    <span className="badge" style={{ backgroundColor: "var(--color-surface-hover)", color: "var(--color-text-strong)", fontWeight: 500, padding: "5px 12px", fontSize: "0.78rem" }}>
                      <strong style={{ fontWeight: 600 }}>{classRoster.length}</strong> Students
                    </span>
                    <span className="badge badge-success" style={{ padding: "5px 12px", fontSize: "0.78rem", fontWeight: 500 }}>
                      <strong style={{ fontWeight: 600 }}>{daySummary.PRESENT}</strong> Present
                    </span>
                    <span className="badge badge-warning" style={{ padding: "5px 12px", fontSize: "0.78rem", fontWeight: 500 }}>
                      <strong style={{ fontWeight: 600 }}>{daySummary.LATE}</strong> Late
                    </span>
                    <span className="badge badge-danger" style={{ padding: "5px 12px", fontSize: "0.78rem", fontWeight: 500 }}>
                      <strong style={{ fontWeight: 600 }}>{daySummary.ABSENT}</strong> Absent
                    </span>
                  </div>
                </div>
              )}
            </div>

            {showMarkingColumn && (
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleMarkAllPresent}
                  disabled={isSaving || classRoster.length === 0}
                  style={{ padding: "8px 14px", fontWeight: 600, fontSize: "0.84rem" }}
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleSave}
                  disabled={isSaving || !canSave}
                  title={unmarkedCount > 0 ? "Please mark attendance for all students before saving." : undefined}
                  style={{ minWidth: "160px", padding: "8px 16px", fontWeight: 600, fontSize: "0.84rem" }}
                >
                  {isSaving ? "Saving..." : "Save Attendance"}
                </button>
              </div>
            )}

            {!showMarkingColumn && classRoster.length > 0 && (
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "6px",
                backgroundColor: "var(--color-success-bg)",
                border: "1px solid var(--color-success-border)",
                fontSize: "0.8rem",
                color: "var(--color-success-text)",
                fontWeight: 600,
              }}>
                ✓ Attendance already recorded for {formatDateShort(date)}
              </div>
            )}

            {showMarkingColumn && unmarkedCount > 0 && (
              <div style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "6px",
                backgroundColor: "var(--color-danger-bg)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                fontSize: "0.8rem",
                color: "var(--color-danger-text)",
              }}>
                <span style={{ fontWeight: 700 }}>⚠</span>
                <span>Please mark attendance for all students before saving.</span>
              </div>
            )}
          </div>

          {/* Attendance Register Card */}
          <div className="content-card" style={{ boxShadow: "var(--shadow-sm)" }}>
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
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Attendance Register</h3>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                  {classRoster.length} students enrolled
                </p>
              </div>

              {/* Status Legend */}
              <div style={{ display: "flex", alignItems: "center", gap: "20px", fontSize: "0.82rem" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--color-text-secondary)", fontWeight: 500 }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--color-success)" }} />
                  Present
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--color-text-secondary)", fontWeight: 500 }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--color-warning)" }} />
                  Late
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--color-text-secondary)", fontWeight: 500 }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--color-danger)" }} />
                  Absent
                </span>
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table table-compact" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <colgroup>
                  <col style={{ width: "26%", minWidth: "200px" }} />
                  <col style={{ width: "14%", minWidth: "120px" }} />
                  {historyDates.map(d => (
                    <col key={d} style={{ minWidth: "105px" }} />
                  ))}
                  {showMarkingColumn && <col style={{ width: "210px", minWidth: "180px" }} />}
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "12px 20px" }}>Student</th>
                    <th style={{ textAlign: "center", padding: "12px 10px" }}>Attendance Rate</th>
                    {historyDates.map(d => (
                      <th key={d} style={{ textAlign: "center", padding: "12px 10px", fontSize: "0.8rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>
                        {formatDateShort(d)}
                      </th>
                    ))}
                    {showMarkingColumn && (
                      <th
                        style={{
                          textAlign: "center",
                          padding: "10px 14px",
                          backgroundColor: "var(--color-surface-muted)",
                          borderLeft: "1px solid var(--color-border)",
                          borderRight: "1px solid var(--color-border)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                          <span style={{ fontWeight: 700, color: "var(--color-text-primary)", fontSize: "0.84rem" }}>
                            {formatDateShort(date)}
                          </span>
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            backgroundColor: "var(--color-primary-light)",
                            color: "var(--color-primary)",
                            fontSize: "0.68rem",
                            fontWeight: 600,
                          }}>
                            Marking
                          </span>
                        </div>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {classDataLoading ? (
                    <tr>
                      <td colSpan={historyDates.length + 2 + (showMarkingColumn ? 1 : 0)} style={{ textAlign: "center", padding: "36px 20px", color: "var(--color-text-secondary)" }}>
                        Loading class roster...
                      </td>
                    </tr>
                  ) : classRoster.length === 0 ? (
                    <tr>
                      <td colSpan={historyDates.length + 2 + (showMarkingColumn ? 1 : 0)} style={{ textAlign: "center", padding: "36px 20px", color: "var(--color-text-secondary)" }}>
                        {courseFilter ? "No students enrolled in this class." : "Please select a class above."}
                      </td>
                    </tr>
                  ) : (
                    classRoster.map(student => {
                      const rate = rateByStudent.get(student.enrollment_id);
                      const currentStatus = statusByEnrollment[student.enrollment_id];

                      let rateBg = "var(--color-success-bg)";
                      let rateColor = "var(--color-success-text)";
                      let rateBorder = "var(--color-success-border)";
                      if (rate !== undefined) {
                        if (rate < 65) {
                          rateBg = "var(--color-danger-bg)";
                          rateColor = "var(--color-danger-text)";
                          rateBorder = "var(--color-danger-border)";
                        } else if (rate < 80) {
                          rateBg = "var(--color-warning-bg)";
                          rateColor = "var(--color-warning-text)";
                          rateBorder = "var(--color-warning-border)";
                        }
                      }

                      return (
                        <tr key={student.enrollment_id}>
                          <td style={{ textAlign: "left", padding: "12px 20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <Avatar src={student.profile_picture_url} name={student.student_name || "S"} size={30} />
                              <span style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.875rem", whiteSpace: "nowrap" }}>
                                {student.student_name}
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: "center", padding: "12px 10px" }}>
                            {rate === undefined ? (
                              <span style={{ color: "var(--color-text-secondary)", fontSize: "0.84rem", opacity: 0.5 }}>—</span>
                            ) : (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "6px",
                                  padding: "3px 10px",
                                  borderRadius: "6px",
                                  fontSize: "0.8rem",
                                  fontWeight: 600,
                                  backgroundColor: rateBg,
                                  color: rateColor,
                                  border: `1px solid ${rateBorder}`,
                                  minWidth: "58px",
                                }}
                              >
                                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: rateColor, flexShrink: 0 }} />
                                {rate}%
                              </span>
                            )}
                          </td>
                          {historyDates.map(d => {
                            const histStatus = historyByStudent.get(student.enrollment_id)?.get(d);
                            if (!histStatus) {
                              return (
                                <td key={d} style={{ textAlign: "center", padding: "12px 8px" }}>
                                  <span style={{ color: "var(--color-text-secondary)", opacity: 0.35 }}>—</span>
                                </td>
                              );
                            }

                            const badgeColors = {
                              PRESENT: { bg: "var(--color-success-bg)", color: "var(--color-success-text)", border: "var(--color-success-border)", dot: "var(--color-success)" },
                              LATE: { bg: "var(--color-warning-bg)", color: "var(--color-warning-text)", border: "var(--color-warning-border)", dot: "var(--color-warning)" },
                              ABSENT: { bg: "var(--color-danger-bg)", color: "var(--color-danger-text)", border: "var(--color-danger-border)", dot: "var(--color-danger)" },
                            }[histStatus];

                            return (
                              <td key={d} style={{ textAlign: "center", padding: "12px 8px" }}>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "5px",
                                    padding: "2px 8px",
                                    borderRadius: "6px",
                                    fontSize: "0.76rem",
                                    fontWeight: 500,
                                    backgroundColor: badgeColors.bg,
                                    color: badgeColors.color,
                                    border: `1px solid ${badgeColors.border}`,
                                  }}
                                >
                                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: badgeColors.dot }} />
                                  {STATUS_LABEL[histStatus]}
                                </span>
                              </td>
                            );
                          })}
                          {showMarkingColumn && (
                            <td
                              style={{
                                textAlign: "center",
                                padding: "8px 14px",
                                backgroundColor: "var(--color-surface-muted)",
                                borderLeft: "1px solid var(--color-border)",
                                borderRight: "1px solid var(--color-border)",
                              }}
                            >
                              {/* No locked/read-only branch here any more - this
                                  column only renders while showMarkingColumn is
                                  true (a genuinely open, unsaved session), so it
                                  is always the live picker. currentStatus is
                                  undefined until the teacher explicitly clicks
                                  one - none of the three buttons is highlighted
                                  in that state, which is the point: no default. */}
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  backgroundColor: "var(--color-surface)",
                                  borderRadius: "6px",
                                  padding: "2px",
                                  border: currentStatus ? "1px solid var(--color-border)" : "1px solid var(--color-danger-border)",
                                  gap: "2px",
                                }}
                              >
                                {(["PRESENT", "LATE", "ABSENT"] as AttendanceStatus[]).map(statusKey => {
                                  const isActive = currentStatus === statusKey;
                                  const activeStyles = {
                                    PRESENT: { bg: "var(--color-success)", color: "var(--color-on-primary)", shadow: "0 1px 3px rgba(16, 185, 129, 0.35)" },
                                    LATE: { bg: "var(--color-warning)", color: "var(--color-on-primary)", shadow: "0 1px 3px rgba(245, 158, 11, 0.35)" },
                                    ABSENT: { bg: "var(--color-danger)", color: "var(--color-on-primary)", shadow: "0 1px 3px rgba(239, 68, 68, 0.35)" },
                                  }[statusKey];

                                  return (
                                    <button
                                      key={statusKey}
                                      type="button"
                                      onClick={() => {
                                        setStatusByEnrollment(prev => ({ ...prev, [student.enrollment_id]: statusKey }));
                                      }}
                                      style={{
                                        border: "none",
                                        cursor: "pointer",
                                        padding: "3px 8px",
                                        borderRadius: "4px",
                                        fontSize: "0.74rem",
                                        fontWeight: 600,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        transition: "all 0.15s ease",
                                        backgroundColor: isActive ? activeStyles.bg : "transparent",
                                        color: isActive ? activeStyles.color : "var(--color-text-secondary)",
                                        boxShadow: isActive ? activeStyles.shadow : "none",
                                      }}
                                      title={`Mark ${STATUS_LABEL[statusKey]}`}
                                    >
                                      {STATUS_LABEL[statusKey]}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
