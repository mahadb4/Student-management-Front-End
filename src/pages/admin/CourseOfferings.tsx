import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { offeringService, courseService, teacherService } from "../../services/entities";
import { EntityTable } from "../../components/common/EntityTable";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import type { CourseOffering, Course, Teacher, Semester } from "../../types/user";

export default function CourseOfferings() {
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffering, setEditingOffering] = useState<CourseOffering | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CourseOffering | null>(null);
  
  const [formData, setFormData] = useState({ 
    course: "" as number | "", teacher: "" as number | "", 
    semester: "FALL" as Semester, academic_year: new Date().getFullYear(), 
    section: "", is_active: true 
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      offeringService.getAll(),
      courseService.getAll(),
      teacherService.getAll()
    ]).then(([o, c, t]) => {
      setOfferings(o);
      setCourses(c);
      setTeachers(t);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (offering?: CourseOffering) => {
    if (offering) {
      setEditingOffering(offering);
      setFormData({ 
        course: offering.course, 
        teacher: offering.teacher, 
        semester: offering.semester, 
        academic_year: offering.academic_year,
        section: offering.section,
        is_active: offering.is_active 
      });
    } else {
      setEditingOffering(null);
      setFormData({ 
        course: "", teacher: "", semester: "FALL", 
        academic_year: new Date().getFullYear(), section: "", is_active: true 
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        course: Number(formData.course),
        teacher: Number(formData.teacher),
      };
      
      if (editingOffering) {
        await offeringService.update(editingOffering.id, payload);
      } else {
        await offeringService.create(payload);
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      alert("Failed to save course offering.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await offeringService.remove(deleteConfirm.id);
      setDeleteConfirm(null);
      loadData();
    } catch (error) {
      console.error(error);
      alert("Failed to delete course offering.");
    }
  };

  return (
    <DashboardLayout title="Course Offerings">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>Course Offerings</h2>
          <p>Manage courses taught in specific semesters</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn btn-primary">
          + Add Offering
        </button>
      </div>

      <div className="content-card">
        <EntityTable<CourseOffering>
          data={offerings}
          loading={loading}
          resourceName="course_offerings"
          columns={[
            { 
              key: "course", 
              label: "Course",
              render: (o) => {
                const c = courses.find(c => c.id === o.course);
                return c ? `${c.name} (${c.code})` : o.course.toString();
              }
            },
            { 
              key: "teacher", 
              label: "Teacher",
              render: (o) => {
                const t = teachers.find(t => t.id === o.teacher);
                return t ? `${t.first_name} ${t.last_name}` : o.teacher.toString();
              }
            },
            { key: "semester", label: "Semester" },
            { key: "academic_year", label: "Year" },
            { key: "section", label: "Section" },
            { 
              key: "is_active", 
              label: "Status",
              render: (o) => <span className={`badge ${o.is_active ? 'badge-success' : 'badge-warning'}`}>{o.is_active ? 'Active' : 'Inactive'}</span>
            }
          ]}
          onEdit={handleOpenModal}
          onDelete={setDeleteConfirm}
        />
      </div>

      <Modal isOpen={isModalOpen} title={editingOffering ? "Edit Offering" : "Add Offering"} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Course</label>
            <select required className="form-control" value={formData.course} onChange={(e) => setFormData({...formData, course: Number(e.target.value)})}>
              <option value="">-- Select Course --</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Teacher</label>
            <select required className="form-control" value={formData.teacher} onChange={(e) => setFormData({...formData, teacher: Number(e.target.value)})}>
              <option value="">-- Select Teacher --</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
            </select>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label">Semester</label>
              <select required className="form-control" value={formData.semester} onChange={(e) => setFormData({...formData, semester: e.target.value as Semester})}>
                <option value="FALL">Fall</option>
                <option value="SPRING">Spring</option>
                <option value="SUMMER">Summer</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Academic Year</label>
              <input type="number" required className="form-control" value={formData.academic_year} onChange={(e) => setFormData({...formData, academic_year: parseInt(e.target.value) || new Date().getFullYear()})} />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Section</label>
            <input required className="form-control" value={formData.section} onChange={(e) => setFormData({...formData, section: e.target.value})} />
          </div>
          
          <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} />
            <label style={{ margin: 0 }}>Active</label>
          </div>
          
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Course Offering"
        message="Are you sure you want to delete this course offering?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </DashboardLayout>
  );
}
