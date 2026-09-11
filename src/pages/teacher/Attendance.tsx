import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "../../services/auth";
import { getCourseOfferingReference, getMyTeacherStudents, getMyTeacherAttendance, attendanceService, invalidateMeCache } from "../../services/entities";
import { useToast } from "../../context/ToastContext";
import type { CourseOfferingReference, EnrollmentTeacherListItem, TeacherAttendanceListItem, AttendanceStatus } from "../../types/user";

// The register needs every student in the selected class (even ones with no
// attendance record yet), so the full roster is fetched page by page (still
// page_size=10 per request) whenever the selected class changes.
async function fetchFullClassRoster(courseOfferingId: number): Promise<EnrollmentTeacherListItem[]> {
  let page = 1;
  let all: EnrollmentTeacherListItem[] = [];

  while (true) {
    const res = await getMyTeacherStudents(page, 10, courseOfferingId);
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
    const res = await getMyTeacherAttendance(page, 10, courseOfferingId);
    all = all.concat(res.results);
    if (res.current_page >= res.total_pages) break;
    page += 1;
  }

  return all;
}

const STATUS_LABEL: Record<AttendanceStatus, string> = { PRESENT: "Present", LATE: "Late", ABSENT: "Absent" };
const STATUS_ABBR: Record<AttendanceStatus, string> = { PRESENT: "P", LATE: "L", ABSENT: "A" };

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

function nextDayIso(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0];
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

  const [offerings, setOfferings] = useState<CourseOfferingReference[]>([]);
  const [courseFilter, setCourseFilter] = useState("");

  const [classRoster, setClassRoster] = useState<EnrollmentTeacherListItem[]>([]);
  const [attendance, setAttendance] = useState<TeacherAttendanceListItem[]>([]);

  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [classDataLoading, setClassDataLoading] = useState(false);

  const [date, setDate] = useState(todayIso());
  const [statusByEnrollment, setStatusByEnrollment] = useState<Record<number, AttendanceStatus>>({});
  const [isSaving, setIsSaving] = useState(false);
  // Once the marking column exactly matches what's saved on the server, it
  // renders locked (read-only, like a history column) instead of leaving
  // clickable buttons with no visual difference from an unsaved column -
  // that mismatch was the "looks unsaved" complaint. Unlock re-enables editing
  // (e.g. to correct a mistake) without waiting for a new date.
  const [unlocked, setUnlocked] = useState(false);
  // Students the teacher has explicitly touched (a P/L/A click, or Mark All
  // Present) for the CURRENT marking column - everyone else is still sitting
  // on the implicit "Present" default and gets flagged before Save.
  const [touchedEnrollmentIds, setTouchedEnrollmentIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setUnlocked(false);
    setTouchedEnrollmentIds(new Set());
  }, [date]);

  // Load the teacher's classes once, then default to the first one.
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    getCourseOfferingReference(1, 10)
      .then(o => {
        setOfferings(o.results);
        if (o.results.length > 0) {
          setCourseFilter(o.results[0].id.toString());
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

  // Seed the editable column for the selected date: existing records win,
  // everyone else defaults to Present so the teacher only touches exceptions.
  useEffect(() => {
    const forDate = new Map(
      attendance.filter(a => a.date === date && a.enrollment_id !== null).map(a => [a.enrollment_id as number, a.status])
    );
    const next: Record<number, AttendanceStatus> = {};
    for (const student of classRoster) {
      next[student.enrollment_id] = forDate.get(student.enrollment_id) || "PRESENT";
    }
    setStatusByEnrollment(next);
  }, [date, classRoster, attendance]);

  const getCourseInfo = (offering: CourseOfferingReference) =>
    `${offering.course_name || "Unknown Course"} - ${offering.section_name || "No Section"}`;

  const handleMarkAllPresent = () => {
    setStatusByEnrollment(prev => {
      const next = { ...prev };
      for (const student of classRoster) next[student.enrollment_id] = "PRESENT";
      return next;
    });
    setTouchedEnrollmentIds(new Set(classRoster.map(s => s.enrollment_id)));
  };

  const handleSave = async () => {
    if (isSaving || classRoster.length === 0) return;
    setIsSaving(true);
    try {
      // Existing record for the CURRENTLY SELECTED date only - never another date.
      const existingByEnrollment = new Map(
        attendance.filter(a => a.date === date && a.enrollment_id !== null).map(a => [a.enrollment_id as number, a])
      );

      // Collected here and committed to `attendance` state ONCE at the end -
      // updating it per-iteration would re-trigger the date-seeding effect
      // (which depends on `attendance`) mid-loop and reset statusByEnrollment
      // from a half-written snapshot while later students are still pending.
      const updatedRecords = new Map<number, TeacherAttendanceListItem>();
      const newRecords: TeacherAttendanceListItem[] = [];

      for (const student of classRoster) {
        const status = statusByEnrollment[student.enrollment_id];
        const existing = existingByEnrollment.get(student.enrollment_id);

        if (existing && existing.status === status) {
          continue; // unchanged - skip, no API call
        }

        if (existing) {
          const updated = await attendanceService.update(existing.id, { status });
          updatedRecords.set(existing.id, { ...existing, status: updated.status, remarks: updated.remarks });
        } else {
          const created = await attendanceService.create({ enrollment_id: student.enrollment_id, date, status, remarks: "" } as never);
          newRecords.push({
            id: created.id,
            date: created.date,
            status: created.status,
            remarks: created.remarks,
            enrollment_id: student.enrollment_id,
            student_name: student.student_name,
          });
        }
      }

      const writeCount = updatedRecords.size + newRecords.length;

      if (writeCount > 0) {
        setAttendance(prev => [
          ...prev.map(a => updatedRecords.get(a.id) || a),
          ...newRecords,
        ]);
      }

      invalidateMeCache("teacher-attendance:1:10");
      showToast(
        writeCount > 0
          ? `Attendance saved for ${formatDateShort(date)} (${writeCount} ${writeCount === 1 ? "record" : "records"}).`
          : "Attendance already up to date - nothing to save.",
        "success"
      );

      // Saved date now moves into the read-only history columns (it no
      // longer equals `date`) and the next day becomes the new, blank
      // marking column - never advancing past today. If there's no valid
      // next day yet (today was just saved), lock the current column into
      // the same read-only look instead of leaving it open for edits.
      const upcoming = nextDayIso(date);
      if (upcoming <= todayIso()) {
        setDate(upcoming);
      } else {
        setUnlocked(false);
        setTouchedEnrollmentIds(new Set());
      }
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Failed to save attendance.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Historical (read-only) columns: recorded dates other than the one being
  // edited right now, most recent last, capped so the register stays compact.
  const historyDates = useMemo(() => {
    const dates = Array.from(new Set(attendance.map(a => a.date))).filter(d => d !== date);
    dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return dates.slice(-6);
  }, [attendance, date]);

  // How many students still differ from what is stored for the selected date -
  // the same diff handleSave applies, so 0 means Save would write nothing.
  const pendingChanges = useMemo(() => {
    const stored = new Map(
      attendance.filter(a => a.date === date && a.enrollment_id !== null).map(a => [a.enrollment_id as number, a.status])
    );
    return classRoster.filter(s => stored.get(s.enrollment_id) !== statusByEnrollment[s.enrollment_id]).length;
  }, [attendance, date, classRoster, statusByEnrollment]);

  // Fully in sync with the server and not explicitly reopened for editing -
  // render as locked/read-only instead of live buttons.
  const isMarkingLocked = pendingChanges === 0 && !unlocked && classRoster.length > 0;

  // Students sitting on the implicit "Present" default for this date: no
  // saved record yet, and the teacher hasn't explicitly touched them this
  // session either. Flagged so a student never gets silently marked Present
  // just because nobody looked at their row.
  const unmarkedStudents = useMemo(() => {
    const stored = new Set(
      attendance.filter(a => a.date === date && a.enrollment_id !== null).map(a => a.enrollment_id as number)
    );
    return classRoster.filter(s => !stored.has(s.enrollment_id) && !touchedEnrollmentIds.has(s.enrollment_id));
  }, [attendance, date, classRoster, touchedEnrollmentIds]);

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
                  style={{ fontWeight: 500, backgroundColor: "#ffffff", padding: "7px 12px", fontSize: "0.86rem", minWidth: "220px" }}
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
                  style={{ padding: "7px 12px", fontSize: "0.86rem", backgroundColor: "#ffffff" }}
                />
              </div>

              {classRoster.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  <label style={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-text-secondary)" }}>
                    Session Summary
                  </label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", minHeight: "36px" }}>
                    <span className="badge" style={{ backgroundColor: "#f1f5f9", color: "#475569", fontWeight: 700, padding: "6px 12px", fontSize: "0.78rem" }}>
                      {classRoster.length} Students
                    </span>
                    <span className="badge badge-success" style={{ padding: "6px 12px", fontSize: "0.78rem", fontWeight: 700 }}>
                      {daySummary.PRESENT} Present
                    </span>
                    <span className="badge badge-warning" style={{ padding: "6px 12px", fontSize: "0.78rem", fontWeight: 700 }}>
                      {daySummary.LATE} Late
                    </span>
                    <span className="badge badge-danger" style={{ padding: "6px 12px", fontSize: "0.78rem", fontWeight: 700 }}>
                      {daySummary.ABSENT} Absent
                    </span>
                  </div>
                </div>
              )}
            </div>

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
                disabled={isSaving || classRoster.length === 0 || pendingChanges === 0}
                style={{ minWidth: "160px", padding: "8px 16px", fontWeight: 600, fontSize: "0.84rem" }}
              >
                {isSaving
                  ? "Saving..."
                  : pendingChanges === 0
                    ? "✓ All Saved"
                    : `Save Attendance (${pendingChanges})`}
              </button>
            </div>

            {unmarkedStudents.length > 0 && (
              <div style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "6px",
                backgroundColor: "#fffbeb",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                fontSize: "0.8rem",
                color: "#92400e",
              }}>
                <span style={{ fontWeight: 700 }}>⚠</span>
                <span>
                  {unmarkedStudents.length} {unmarkedStudents.length === 1 ? "student hasn't" : "students haven't"} been marked yet
                  {" "}(defaulting to Present) - please review:{" "}
                  <strong>{unmarkedStudents.map(s => s.student_name).join(", ")}</strong>
                </span>
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
              <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "0.78rem" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "var(--color-text-secondary)" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981" }} />
                  <strong style={{ color: "var(--color-text-primary)" }}>P</strong> = Present
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "var(--color-text-secondary)" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#f59e0b" }} />
                  <strong style={{ color: "var(--color-text-primary)" }}>L</strong> = Late
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "var(--color-text-secondary)" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#ef4444" }} />
                  <strong style={{ color: "var(--color-text-primary)" }}>A</strong> = Absent
                </span>
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table table-compact" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <colgroup>
                  <col style={{ minWidth: "220px" }} />
                  <col style={{ width: "130px" }} />
                  {historyDates.map(d => (
                    <col key={d} style={{ width: "76px" }} />
                  ))}
                  <col style={{ width: "160px" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "12px 20px" }}>Student</th>
                    <th style={{ textAlign: "center", padding: "12px 10px" }}>Attendance Rate</th>
                    {historyDates.map(d => (
                      <th key={d} style={{ textAlign: "center", padding: "12px 8px" }}>
                        {formatDateShort(d)}
                      </th>
                    ))}
                    <th
                      style={{
                        textAlign: "center",
                        padding: "10px 12px",
                        backgroundColor: "rgba(37, 99, 235, 0.08)",
                        borderLeft: "2px solid var(--color-primary)",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                        <span style={{ fontWeight: 700, color: "var(--color-primary)", fontSize: "0.78rem" }}>
                          {formatDateShort(date)}
                        </span>
                        {isMarkingLocked ? (
                          <button
                            type="button"
                            onClick={() => setUnlocked(true)}
                            style={{
                              border: "none",
                              background: "none",
                              cursor: "pointer",
                              padding: 0,
                              fontSize: "0.64rem",
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              color: "#059669",
                              opacity: 0.9,
                              fontWeight: 700,
                              textDecoration: "underline",
                              textUnderlineOffset: "2px",
                            }}
                          >
                            ✓ Saved · Edit
                          </button>
                        ) : (
                          <span style={{
                            fontSize: "0.64rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            color: "var(--color-primary)",
                            opacity: 0.85,
                            fontWeight: 700,
                          }}>
                            Marking
                          </span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {classDataLoading ? (
                    <tr>
                      <td colSpan={historyDates.length + 3} style={{ textAlign: "center", padding: "36px 20px", color: "var(--color-text-secondary)" }}>
                        Loading class roster...
                      </td>
                    </tr>
                  ) : classRoster.length === 0 ? (
                    <tr>
                      <td colSpan={historyDates.length + 3} style={{ textAlign: "center", padding: "36px 20px", color: "var(--color-text-secondary)" }}>
                        {courseFilter ? "No students enrolled in this class." : "Please select a class above."}
                      </td>
                    </tr>
                  ) : (
                    classRoster.map(student => {
                      const rate = rateByStudent.get(student.enrollment_id);
                      const currentStatus = statusByEnrollment[student.enrollment_id] || "PRESENT";

                      let rateBg = "rgba(16, 185, 129, 0.1)";
                      let rateColor = "#059669";
                      let rateBorder = "rgba(16, 185, 129, 0.25)";
                      if (rate !== undefined) {
                        if (rate < 65) {
                          rateBg = "rgba(239, 68, 68, 0.1)";
                          rateColor = "#dc2626";
                          rateBorder = "rgba(239, 68, 68, 0.25)";
                        } else if (rate < 80) {
                          rateBg = "rgba(245, 158, 11, 0.1)";
                          rateColor = "#d97706";
                          rateBorder = "rgba(245, 158, 11, 0.25)";
                        }
                      }

                      return (
                        <tr key={student.enrollment_id}>
                          <td style={{ textAlign: "left", padding: "10px 20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "50%",
                                backgroundColor: "var(--color-primary-light)",
                                color: "var(--color-primary)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                flexShrink: 0,
                              }}>
                                {(student.student_name || "S").charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.875rem", whiteSpace: "nowrap" }}>
                                {student.student_name}
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: "center", padding: "10px 10px" }}>
                            {rate === undefined ? (
                              <span style={{ color: "var(--color-text-secondary)", fontSize: "0.84rem", opacity: 0.5 }}>—</span>
                            ) : (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "5px",
                                  padding: "3px 9px",
                                  borderRadius: "12px",
                                  fontSize: "0.78rem",
                                  fontWeight: 700,
                                  backgroundColor: rateBg,
                                  color: rateColor,
                                  border: `1px solid ${rateBorder}`,
                                  minWidth: "56px",
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
                                <td key={d} style={{ textAlign: "center", padding: "10px 8px" }}>
                                  <span style={{ color: "var(--color-text-secondary)", opacity: 0.35 }}>—</span>
                                </td>
                              );
                            }

                            const badgeColors = {
                              PRESENT: { bg: "#ecfdf5", color: "#059669", border: "rgba(16, 185, 129, 0.3)" },
                              LATE: { bg: "#fffbeb", color: "#d97706", border: "rgba(245, 158, 11, 0.3)" },
                              ABSENT: { bg: "#fef2f2", color: "#dc2626", border: "rgba(239, 68, 68, 0.3)" },
                            }[histStatus];

                            return (
                              <td key={d} style={{ textAlign: "center", padding: "10px 8px" }}>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "50%",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    backgroundColor: badgeColors.bg,
                                    color: badgeColors.color,
                                    border: `1px solid ${badgeColors.border}`,
                                  }}
                                  title={STATUS_LABEL[histStatus]}
                                >
                                  {STATUS_ABBR[histStatus]}
                                </span>
                              </td>
                            );
                          })}
                          <td
                            style={{
                              textAlign: "center",
                              padding: "8px 12px",
                              backgroundColor: "rgba(37, 99, 235, 0.03)",
                              borderLeft: "2px solid var(--color-primary)",
                            }}
                          >
                            {isMarkingLocked ? (
                              (() => {
                                const lockedColors = {
                                  PRESENT: { bg: "#ecfdf5", color: "#059669", border: "rgba(16, 185, 129, 0.3)" },
                                  LATE: { bg: "#fffbeb", color: "#d97706", border: "rgba(245, 158, 11, 0.3)" },
                                  ABSENT: { bg: "#fef2f2", color: "#dc2626", border: "rgba(239, 68, 68, 0.3)" },
                                }[currentStatus];
                                return (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      width: "26px",
                                      height: "26px",
                                      borderRadius: "50%",
                                      fontSize: "0.75rem",
                                      fontWeight: 700,
                                      backgroundColor: lockedColors.bg,
                                      color: lockedColors.color,
                                      border: `1px solid ${lockedColors.border}`,
                                    }}
                                    title={`${STATUS_LABEL[currentStatus]} - saved`}
                                  >
                                    {STATUS_ABBR[currentStatus]}
                                  </span>
                                );
                              })()
                            ) : (
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                backgroundColor: "#f1f5f9",
                                borderRadius: "6px",
                                padding: "3px",
                                border: "1px solid var(--color-border)",
                                gap: "3px",
                              }}
                            >
                              {(["PRESENT", "LATE", "ABSENT"] as AttendanceStatus[]).map(statusKey => {
                                const isActive = currentStatus === statusKey;
                                const activeStyles = {
                                  PRESENT: { bg: "#10b981", color: "#ffffff", shadow: "0 1px 3px rgba(16, 185, 129, 0.35)" },
                                  LATE: { bg: "#f59e0b", color: "#ffffff", shadow: "0 1px 3px rgba(245, 158, 11, 0.35)" },
                                  ABSENT: { bg: "#ef4444", color: "#ffffff", shadow: "0 1px 3px rgba(239, 68, 68, 0.35)" },
                                }[statusKey];

                                return (
                                  <button
                                    key={statusKey}
                                    type="button"
                                    onClick={() => {
                                      setStatusByEnrollment(prev => ({ ...prev, [student.enrollment_id]: statusKey }));
                                      setTouchedEnrollmentIds(prev => new Set(prev).add(student.enrollment_id));
                                    }}
                                    style={{
                                      border: "none",
                                      cursor: "pointer",
                                      width: "30px",
                                      height: "26px",
                                      borderRadius: "4px",
                                      fontSize: "0.75rem",
                                      fontWeight: 700,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      transition: "all 0.15s ease",
                                      backgroundColor: isActive ? activeStyles.bg : "transparent",
                                      color: isActive ? activeStyles.color : "#64748b",
                                      boxShadow: isActive ? activeStyles.shadow : "none",
                                    }}
                                    title={`Mark ${STATUS_LABEL[statusKey]}`}
                                  >
                                    {STATUS_ABBR[statusKey]}
                                  </button>
                                );
                              })}
                            </div>
                            )}
                          </td>
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
