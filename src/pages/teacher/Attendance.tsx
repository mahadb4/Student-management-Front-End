import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { getCurrentUser } from "../../services/auth";
import { teacherService, offeringService, enrollmentService, studentService, courseService, attendanceService } from "../../services/entities";
import { Modal } from "../../components/common/Modal";
import type { Teacher, CourseOffering, Course, Enrollment, Student, Attendance, AttendanceStatus } from "../../types/user";

export default function TeacherAttendance() {
  const user = getCurrentUser();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    enrollment: "" as number | "", 
    date: new Date().toISOString().split('T')[0],
    status: "PRESENT" as AttendanceStatus,
    remarks: "" 
  });

  const loadData = () => {
    if (!user || !user.teacher_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    teacherService.getById(user.teacher_id).then(myTeacher => {
      setTeacher(myTeacher);
      
      Promise.all([
        offeringService.getAll(),
        courseService.getAll(),
        enrollmentService.getAll(),
        studentService.getAll(),
        attendanceService.getAll()
      ]).then(([o, c, e, s, a]) => {
        const myOfferings = o.filter(x => x.teacher === myTeacher.id);
        setOfferings(myOfferings);
        setCourses(c);
        
        if (myOfferings.length > 0 && !courseFilter) {
          setCourseFilter(myOfferings[0].id.toString());
        }
        
        const myOfferingIds = myOfferings.map(x => x.id);
        const myEnrollments = e.filter(x => myOfferingIds.includes(x.course_offering));
        setEnrollments(myEnrollments);
        
        const myStudentIds = [...new Set(myEnrollments.map(x => x.student))];
        setStudents(s.filter(x => myStudentIds.includes(x.id)));
        
        const myEnrollmentIds = myEnrollments.map(x => x.id);
        setAttendance(a.filter(x => myEnrollmentIds.includes(x.enrollment)));
        
      }).finally(() => setLoading(false));
    }).catch(console.error);
  };

  useEffect(() => {
    loadData();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await attendanceService.create({
        ...formData,
        enrollment: Number(formData.enrollment),
      });
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      alert("Failed to save attendance.");
    }
  };

  const filteredAttendance = attendance.filter(a => {
    if (!courseFilter) return true;
    const enrollment = enrollments.find(e => e.id === a.enrollment);
    return enrollment?.course_offering.toString() === courseFilter;
  });
  
  filteredAttendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getCourseInfo = (offeringId: number) => {
    const o = offerings.find(x => x.id === offeringId);
    if (!o) return "Unknown";
    const c = courses.find(x => x.id === o.course);
    return c ? `${c.name} - Sec ${o.section}` : "Unknown Course";
  };

  const getStudentInfo = (enrollmentId: number) => {
    const e = enrollments.find(x => x.id === enrollmentId);
    if (!e) return "Unknown";
    const s = students.find(x => x.id === e.student);
    return s ? `${s.first_name} ${s.last_name}` : "Unknown";
  };

  const courseEnrollments = enrollments.filter(e => e.course_offering.toString() === courseFilter);

  if (loading) {
    return <DashboardLayout title="Class Attendance"><div style={{ padding: "40px", textAlign: "center" }}>Loading...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout title="Class Attendance">
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
                  <option key={o.id} value={o.id}>{getCourseInfo(o.id)}</option>
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
                      <td>{getStudentInfo(a.enrollment)}</td>
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
                    <option key={e.id} value={e.id}>{getStudentInfo(e.id)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input required type="date" className="form-control" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
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
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </DashboardLayout>
  );
}
