import { useEffect, useState } from "react";
import { getCurrentUser } from "../../services/auth";
import { getCourseOfferingReference, getMyTeacherStudents, getMyTeacherAttendance, attendanceService, invalidateMeCache } from "../../services/entities";
import { Modal } from "../../components/common/Modal";
import type { CourseOfferingReference, EnrollmentTeacherListItem, TeacherAttendanceListItem, AttendanceStatus, Attendance } from "../../types/user";

// Marking attendance must offer every student in the selected class, not
// just whichever page of the teacher's cross-class enrollment list happens
// to be loaded - so the full roster for one specific class is fetched here
// page by page (still page_size=10 per request, never a large single call).
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

export default function TeacherAttendance() {
  const user = getCurrentUser();

  const [offerings, setOfferings] = useState<CourseOfferingReference[]>([]);
  const [classRoster, setClassRoster] = useState<EnrollmentTeacherListItem[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [attendance, setAttendance] = useState<TeacherAttendanceListItem[]>([]);

  const [attendancePage, setAttendancePage] = useState(1);
  const [attendanceTotalPages, setAttendanceTotalPages] = useState(1);
  const [loadingMoreAttendance, setLoadingMoreAttendance] = useState(false);

  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    enrollment: "" as number | "",
    date: new Date().toISOString().split('T')[0],
    status: "PRESENT" as AttendanceStatus,
    remarks: ""
  });

  const loadData = () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // course_offerings/reference/ is already scoped by apply_data_scope to
    // this teacher's own offerings.
    Promise.all([
      getCourseOfferingReference(1, 10),
      getMyTeacherAttendance(1, 10),
    ]).then(([o, a]) => {
      setOfferings(o.results);
      setAttendance(a.results);
      setAttendancePage(a.current_page);
      setAttendanceTotalPages(a.total_pages);

      if (o.results.length > 0 && !courseFilter) {
        setCourseFilter(o.results[0].id.toString());
      }
    }).catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!courseFilter) {
      setClassRoster([]);
      return;
    }

    setRosterLoading(true);
    fetchFullClassRoster(Number(courseFilter))
      .then(setClassRoster)
      .finally(() => setRosterLoading(false));
  }, [courseFilter]);

  const loadMoreAttendance = () => {
    if (loadingMoreAttendance || attendancePage >= attendanceTotalPages) return;
    setLoadingMoreAttendance(true);
    const nextPage = attendancePage + 1;

    getMyTeacherAttendance(nextPage, 10).then(a => {
      setAttendance(prev => [...prev, ...a.results]);
      setAttendancePage(a.current_page);
      setAttendanceTotalPages(a.total_pages);
    }).finally(() => setLoadingMoreAttendance(false));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { enrollment, ...rest } = formData;
      await attendanceService.create({
        ...rest,
        enrollment_id: Number(enrollment),
      } as unknown as Partial<Attendance>);
      invalidateMeCache("teacher-attendance:1:10");
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to save attendance.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // classRoster is already scoped to the selected class (course_offering_id
  // filter applied server-side), so matching against it directly filters
  // attendance rows down to this class.
  const filteredAttendance = attendance.filter(a =>
    a.enrollment_id !== null && classRoster.some(e => e.enrollment_id === a.enrollment_id)
  );

  filteredAttendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getCourseInfo = (offering: CourseOfferingReference) =>
    `${offering.course_name || "Unknown Course"} - ${offering.section_name || "No Section"}`;

  if (loading) {
    return <><div style={{ padding: "40px", textAlign: "center" }}>Loading...</div></>;
  }

  return (
    <>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
        <div>
          <h2>Attendance</h2>
          <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--color-text-secondary)" }}>
            Mark and view attendance for your classes
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          disabled={!courseFilter || rosterLoading || classRoster.length === 0}
          style={{ fontWeight: 600, padding: "9px 18px", boxShadow: "0 2px 6px rgba(30, 58, 138, 0.25)", gap: "6px" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Mark Attendance
        </button>
      </div>

      {notFound ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          Teacher record not found.
        </div>
      ) : (
        <>
          <div className="content-card" style={{ marginBottom: "18px", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1 1 300px", maxWidth: "440px" }}>
              <label style={{ fontWeight: 600, fontSize: "0.84rem", color: "var(--color-text-secondary)", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                Select Class:
              </label>
              <select
                className="form-control"
                value={courseFilter}
                onChange={e => setCourseFilter(e.target.value)}
                style={{ fontWeight: 500, backgroundColor: "#ffffff", padding: "7px 10px", fontSize: "0.84rem" }}
              >
                <option value="">-- Choose Class --</option>
                {offerings.map(o => (
                  <option key={o.id} value={o.id}>{getCourseInfo(o)}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="badge" style={{ backgroundColor: "var(--color-primary-light)", color: "var(--color-primary)", fontWeight: 700, padding: "5px 12px", fontSize: "0.78rem" }}>
                {filteredAttendance.length} Attendance {filteredAttendance.length === 1 ? "Record" : "Records"}
              </span>
            </div>
          </div>

          <div className="table-responsive content-card" style={{ boxShadow: "var(--shadow-sm)" }}>
            <table className="data-table table-compact" style={{ minWidth: "720px" }}>
              <colgroup>
                <col style={{ width: "22%" }} />
                <col style={{ width: "34%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "26%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Student Name</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "32px 20px", color: "var(--color-text-secondary)" }}>
                      {courseFilter ? "No attendance records found for this class." : "Please select a class above to view attendance records."}
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map(a => (
                    <tr key={a.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-text-primary)", fontSize: "0.84rem" }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, flexShrink: 0 }}>
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          <span style={{ fontWeight: 600 }}>
                            {new Date(a.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{
                            width: "26px",
                            height: "26px",
                            borderRadius: "50%",
                            backgroundColor: "var(--color-primary-light)",
                            color: "var(--color-primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            flexShrink: 0
                          }}>
                            {(a.student_name || "S").charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.875rem" }}>
                            {a.enrollment_id ? a.student_name : "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`badge ${
                          a.status === 'PRESENT' ? 'badge-success' :
                          a.status === 'ABSENT' ? 'badge-danger' : 'badge-warning'
                        }`} style={{ padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700 }}>
                          {a.status}
                        </span>
                      </td>
                      <td>
                        {a.remarks ? (
                          <span style={{ fontSize: "0.84rem", color: "var(--color-text-primary)" }}>{a.remarks}</span>
                        ) : (
                          <span style={{ color: "var(--color-text-secondary)", fontSize: "0.84rem", opacity: 0.6 }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {attendancePage < attendanceTotalPages && (
            <div style={{ textAlign: "center", marginTop: "20px" }}>
              <button className="btn btn-secondary" onClick={loadMoreAttendance} disabled={loadingMoreAttendance} style={{ minWidth: "140px" }}>
                {loadingMoreAttendance ? "Loading..." : "Load More Records"}
              </button>
            </div>
          )}

          <Modal isOpen={isModalOpen} title="Mark Attendance" onClose={() => setIsModalOpen(false)}>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: "0.82rem" }}>Student</label>
                <select required className="form-control" value={formData.enrollment} onChange={(e) => setFormData({...formData, enrollment: Number(e.target.value)})}>
                  <option value="">-- Select Student --</option>
                  {classRoster.map(e => (
                    <option key={e.enrollment_id} value={e.enrollment_id}>{e.student_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: "0.82rem" }}>Date</label>
                <input required type="date" max={today} className="form-control" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: "0.82rem" }}>Status</label>
                <select required className="form-control" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as AttendanceStatus})}>
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LATE">Late</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: "0.82rem" }}>Remarks (optional)</label>
                <input className="form-control" placeholder="Optional notes (e.g. Excused with medical leave)" value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting} style={{ minWidth: "90px" }}>
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </>
  );
}
