import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { attendanceService, enrollmentService, studentService, offeringService, courseService } from "../../services/entities";
import { EntityTable } from "../../components/common/EntityTable";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import type { Attendance, Enrollment, Student, CourseOffering, Course, AttendanceStatus } from "../../types/user";

export default function AttendanceMgmt() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Attendance | null>(null);
  
  const [formData, setFormData] = useState({ 
    enrollment: "" as number | "", 
    date: new Date().toISOString().split('T')[0],
    status: "PRESENT" as AttendanceStatus,
    remarks: "" 
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      attendanceService.getAll(),
      enrollmentService.getAll(),
      studentService.getAll(),
      offeringService.getAll(),
      courseService.getAll()
    ]).then(([a, e, s, o, c]) => {
      setAttendance(a);
      setEnrollments(e);
      setStudents(s);
      setOfferings(o);
      setCourses(c);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (record?: Attendance) => {
    if (record) {
      setEditingRecord(record);
      setFormData({ 
        enrollment: record.enrollment, 
        date: record.date, 
        status: record.status,
        remarks: record.remarks || ""
      });
    } else {
      setEditingRecord(null);
      setFormData({ 
        enrollment: "", date: new Date().toISOString().split('T')[0], 
        status: "PRESENT", remarks: "" 
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        enrollment: Number(formData.enrollment),
      };
      
      if (editingRecord) {
        await attendanceService.update(editingRecord.id, payload);
      } else {
        await attendanceService.create(payload);
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      alert("Failed to save attendance.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await attendanceService.remove(deleteConfirm.id);
      setDeleteConfirm(null);
      loadData();
    } catch (error) {
      console.error(error);
      alert("Failed to delete attendance record.");
    }
  };

  const getEnrollmentDisplay = (enrollmentId: number) => {
    const e = enrollments.find(x => x.id === enrollmentId);
    if (!e) return enrollmentId.toString();
    const s = students.find(x => x.id === e.student);
    const o = offerings.find(x => x.id === e.course_offering);
    const c = o ? courses.find(x => x.id === o.course) : null;
    
    const stuName = s ? `${s.first_name} ${s.last_name}` : "Unknown Student";
    const courseName = c ? c.code : "Unknown Course";
    return `${stuName} - ${courseName}`;
  };

  return (
    <DashboardLayout title="Attendance Management">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>Attendance Records</h2>
          <p>Manage student attendance across all courses</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn btn-primary">
          + Add Record
        </button>
      </div>

      <div className="content-card">
        <EntityTable<Attendance>
          data={attendance}
          loading={loading}
          resourceName="attendance"
          columns={[
            { 
              key: "enrollment", 
              label: "Student & Course",
              render: (a) => getEnrollmentDisplay(a.enrollment)
            },
            { key: "date", label: "Date" },
            { 
              key: "status", 
              label: "Status",
              render: (a) => {
                let badgeClass = "badge-warning";
                if (a.status === "PRESENT") badgeClass = "badge-success";
                if (a.status === "ABSENT") badgeClass = "badge-danger";
                return <span className={`badge ${badgeClass}`}>{a.status}</span>;
              }
            },
            { key: "remarks", label: "Remarks" }
          ]}
          onEdit={handleOpenModal}
          onDelete={setDeleteConfirm}
        />
      </div>

      <Modal isOpen={isModalOpen} title={editingRecord ? "Edit Record" : "Add Record"} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Enrollment</label>
            <select required className="form-control" value={formData.enrollment} onChange={(e) => setFormData({...formData, enrollment: Number(e.target.value)})}>
              <option value="">-- Select Enrollment --</option>
              {enrollments.map(e => <option key={e.id} value={e.id}>{getEnrollmentDisplay(e.id)}</option>)}
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

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Record"
        message="Are you sure you want to delete this attendance record?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </DashboardLayout>
  );
}
