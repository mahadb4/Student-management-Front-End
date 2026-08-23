import { useEffect, useRef, useState } from "react";
import { attendanceService, getAttendanceList, enrollmentService, studentService, offeringService, courseService } from "../../services/entities";
import { EntityTable } from "../../components/common/EntityTable";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import type { Attendance, AttendanceListItem, Enrollment, Student, CourseOffering, Course, AttendanceStatus } from "../../types/user";

export default function AttendanceMgmt() {
  const [attendance, setAttendance] = useState<AttendanceListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Enrollments/Students/Offerings/Courses are only needed for the Add/Edit form
  // dropdown (to resolve enrollment display labels) — not for the table.
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AttendanceListItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState({ 
    enrollment: "" as number | "", 
    date: new Date().toISOString().split('T')[0],
    status: "PRESENT" as AttendanceStatus,
    remarks: "" 
  });

  const loadData = (signal?: AbortSignal) => {
    setLoading(true);
    getAttendanceList(currentPage, pageSize, signal).then(res => {
      setAttendance(res.results);
      setTotalCount(res.total_count);
    }).catch(err => {
      if (err.name === 'AbortError') return;
      console.error(err);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [currentPage]);

  // Enrollment options are only needed for the Add/Edit form — loaded lazily,
  // once, on first actual use.
  const dropdownsRequested = useRef(false);

  const loadDropdownData = () => {
    if (dropdownsRequested.current) return;
    dropdownsRequested.current = true;

    Promise.all([
      enrollmentService.getAll(),
      studentService.getAll(),
      offeringService.getAll(),
      courseService.getAll()
    ]).then(([e, s, o, c]) => {
      setEnrollments(e);
      setStudents(s);
      setOfferings(o);
      setCourses(c);
    }).catch(err => {
      console.error(err);
      dropdownsRequested.current = false;
    });
  };

  const handleOpenModal = (record?: AttendanceListItem) => {
    loadDropdownData();

    if (record) {
      setEditingRecord(record as unknown as Attendance);
      setFormData({
        enrollment: record.enrollment ? record.enrollment.id : "",
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
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { enrollment, ...rest } = formData;
      const payload = {
        ...rest,
        enrollment_id: Number(enrollment),
      };

      if (editingRecord) {
        await attendanceService.update(editingRecord.id, payload as unknown as Partial<Attendance>);
      } else {
        await attendanceService.create(payload as unknown as Partial<Attendance>);
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to save attendance.");
    } finally {
      setIsSubmitting(false);
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
    <>
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
        <EntityTable<AttendanceListItem>
          data={attendance}
          loading={loading}
          resourceName="attendance"
          columns={[
            {
              key: "enrollment",
              label: "Student & Course",
              render: (a) => a.enrollment
                ? `${a.enrollment.student.first_name} ${a.enrollment.student.last_name} - ${a.enrollment.course.code}`
                : "Unknown"
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
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
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

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Record"
        message="Are you sure you want to delete this attendance record?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </>
  );
}
