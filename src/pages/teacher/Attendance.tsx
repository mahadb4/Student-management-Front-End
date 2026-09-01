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
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h2>Attendance</h2>
          <p>Mark and view attendance for your classes</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary" disabled={!courseFilter || rosterLoading || classRoster.length === 0}>
          + Mark Attendance
        </button>
      </div>

      {notFound ? (
        <div className="content-card" style={{ padding: "24px", color: "var(--color-danger)" }}>
          Teacher record not found.
        </div>
      ) : (
        <>
          <div className="content-card" style={{ marginBottom: "24px", padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <label style={{ fontWeight: 500 }}>Select Class:</label>
              <select className="form-control" value={courseFilter} onChange={e => setCourseFilter(e.target.value)} style={{ maxWidth: "300px" }}>
                <option value="">-- Choose Class --</option>
                {offerings.map(o => (
                  <option key={o.id} value={o.id}>{getCourseInfo(o)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-responsive content-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Student Name</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "24px" }}>No attendance records found for this class.</td>
                  </tr>
                ) : (
                  filteredAttendance.map(a => (
                    <tr key={a.id}>
                      <td><strong>{a.date}</strong></td>
                      <td>{a.enrollment_id ? a.student_name : "Unknown"}</td>
                      <td>
                        <span className={`badge ${
                          a.status === 'PRESENT' ? 'badge-success' :
                          a.status === 'ABSENT' ? 'badge-danger' : 'badge-warning'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td>{a.remarks || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {attendancePage < attendanceTotalPages && (
            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <button className="btn btn-outline" onClick={loadMoreAttendance} disabled={loadingMoreAttendance}>
                {loadingMoreAttendance ? "Loading..." : "Load More"}
              </button>
            </div>
          )}

          <Modal isOpen={isModalOpen} title="Mark Attendance" onClose={() => setIsModalOpen(false)}>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Student</label>
                <select required className="form-control" value={formData.enrollment} onChange={(e) => setFormData({...formData, enrollment: Number(e.target.value)})}>
                  <option value="">-- Select Student --</option>
                  {classRoster.map(e => (
                    <option key={e.enrollment_id} value={e.enrollment_id}>{e.student_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input required type="date" max={today} className="form-control" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select required className="form-control" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as AttendanceStatus})}>
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LATE">Late</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Remarks</label>
                <input className="form-control" value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </>
  );
}
