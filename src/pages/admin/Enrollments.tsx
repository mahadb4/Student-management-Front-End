import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { enrollmentService, studentService, offeringService, courseService } from "../../services/entities";
import { EntityTable } from "../../components/common/EntityTable";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import type { Enrollment, Student, CourseOffering, Course, EnrollmentStatus } from "../../types/user";

export default function Enrollments() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<Enrollment | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Enrollment | null>(null);
  
  const [formData, setFormData] = useState({ 
    student: "" as number | "", 
    course_offering: "" as number | "", 
    status: "ACTIVE" as EnrollmentStatus 
  });

  const loadData = () => {
    setLoading(true);
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
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (enrollment?: Enrollment) => {
    if (enrollment) {
      setEditingEnrollment(enrollment);
      setFormData({ 
        student: enrollment.student, 
        course_offering: enrollment.course_offering, 
        status: enrollment.status
      });
    } else {
      setEditingEnrollment(null);
      setFormData({ 
        student: "", course_offering: "", status: "ACTIVE" 
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        student: Number(formData.student),
        course_offering: Number(formData.course_offering),
      };
      
      if (editingEnrollment) {
        await enrollmentService.update(editingEnrollment.id, payload);
      } else {
        await enrollmentService.create(payload);
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      alert("Failed to save enrollment.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await enrollmentService.remove(deleteConfirm.id);
      setDeleteConfirm(null);
      loadData();
    } catch (error) {
      console.error(error);
      alert("Failed to delete enrollment.");
    }
  };

  const getOfferingDisplay = (offeringId: number) => {
    const o = offerings.find(x => x.id === offeringId);
    if (!o) return offeringId.toString();
    const c = courses.find(x => x.id === o.course);
    const courseName = c ? c.name : "Unknown Course";
    return `${courseName} - Sec ${o.section} (${o.semester} ${o.academic_year})`;
  };

  return (
    <DashboardLayout title="Enrollments">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>Student Enrollments</h2>
          <p>Manage which students are in which offerings</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn btn-primary">
          + Add Enrollment
        </button>
      </div>

      <div className="content-card">
        <EntityTable<Enrollment>
          data={enrollments}
          loading={loading}
          resourceName="enrollments"
          columns={[
            { 
              key: "student", 
              label: "Student",
              render: (e) => {
                const s = students.find(s => s.id === e.student);
                return s ? `${s.first_name} ${s.last_name} (${s.student_email})` : e.student.toString();
              }
            },
            { 
              key: "course_offering", 
              label: "Course Offering",
              render: (e) => getOfferingDisplay(e.course_offering)
            },
            { 
              key: "status", 
              label: "Status",
              render: (e) => {
                let badgeClass = "badge-warning";
                if (e.status === "ACTIVE") badgeClass = "badge-success";
                if (e.status === "DROPPED") badgeClass = "badge-danger";
                return <span className={`badge ${badgeClass}`}>{e.status}</span>;
              }
            }
          ]}
          onEdit={handleOpenModal}
          onDelete={setDeleteConfirm}
        />
      </div>

      <Modal isOpen={isModalOpen} title={editingEnrollment ? "Edit Enrollment" : "Add Enrollment"} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Student</label>
            <select required className="form-control" value={formData.student} onChange={(e) => setFormData({...formData, student: Number(e.target.value)})}>
              <option value="">-- Select Student --</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.student_email})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Course Offering</label>
            <select required className="form-control" value={formData.course_offering} onChange={(e) => setFormData({...formData, course_offering: Number(e.target.value)})}>
              <option value="">-- Select Offering --</option>
              {offerings.map(o => <option key={o.id} value={o.id}>{getOfferingDisplay(o.id)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select required className="form-control" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as EnrollmentStatus})}>
              <option value="ACTIVE">Active</option>
              <option value="DROPPED">Dropped</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
          
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Enrollment"
        message="Are you sure you want to delete this enrollment?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </DashboardLayout>
  );
}
