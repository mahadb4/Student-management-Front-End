import { useEffect, useState } from "react";
import { getCurrentUser } from "../../services/auth";
import { getMyTeacherProfile, getMyCourseOfferings, getEnrollmentList, getMyTeacherAttendance, attendanceService, invalidateMeCache } from "../../services/entities";
import { Modal } from "../../components/common/Modal";
import type { Teacher, CourseOfferingListItem, EnrollmentListItem, AttendanceListItem, AttendanceStatus, Attendance } from "../../types/user";

export default function TeacherAttendance() {
  const user = getCurrentUser();
  const [teacher, setTeacher] = useState<Teacher | null>(null);

  const [offerings, setOfferings] = useState<CourseOfferingListItem[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentListItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceListItem[]>([]);

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

    getMyTeacherProfile().then(myTeacher => {
      setTeacher(myTeacher);

      // enrollments/ is already server-scoped to this teacher's own offerings.
      Promise.all([
        getMyCourseOfferings(1, 500),
        getEnrollmentList(1, 500),
        getMyTeacherAttendance(1, 500),
      ]).then(([o, e, a]) => {
        setOfferings(o.results);
        setEnrollments(e.results);
        setAttendance(a.results);

        if (o.results.length > 0 && !courseFilter) {
          setCourseFilter(o.results[0].id.toString());
        }
      }).finally(() => setLoading(false));
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      invalidateMeCache("teacher-attendance:1:500");
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to save attendance.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAttendance = attendance.filter(a => {
    if (!courseFilter) return true;
    return a.enrollment && enrollments.find(e => e.id === a.enrollment!.id)?.course_offering.id.toString() === courseFilter;
  });

  filteredAttendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getCourseInfo = (offering: CourseOfferingListItem) =>
    `${offering.course?.name || "Unknown Course"} - ${offering.section?.name || "No Section"}`;

  const courseEnrollments = enrollments.filter(e => e.course_offering.id.toString() === courseFilter);

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
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary" disabled={!courseFilter || courseEnrollments.length === 0}>
          + Mark Attendance
        </button>
      </div>

      {!teacher ? (
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
                      <td>{a.enrollment ? a.enrollment.student.name : "Unknown"}</td>
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

          <Modal isOpen={isModalOpen} title="Mark Attendance" onClose={() => setIsModalOpen(false)}>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Student</label>
                <select required className="form-control" value={formData.enrollment} onChange={(e) => setFormData({...formData, enrollment: Number(e.target.value)})}>
                  <option value="">-- Select Student --</option>
                  {courseEnrollments.map(e => (
                    <option key={e.id} value={e.id}>{e.student.name}</option>
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
