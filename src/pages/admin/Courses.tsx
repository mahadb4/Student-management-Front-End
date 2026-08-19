import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { courseService, departmentService, teacherService } from "../../services/entities";
import { EntityTable } from "../../components/common/EntityTable";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import type { Course, Department, Teacher } from "../../types/user";

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Course | null>(null);
  
  const [formData, setFormData] = useState({ 
    name: "", code: "", description: "", credits: 3, 
    department: "" as number | "", teacher: "" as number | "", is_active: true 
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      courseService.getAll(),
      departmentService.getAll(),
      teacherService.getAll()
    ]).then(([c, d, t]) => {
      setCourses(c);
      setDepartments(d);
      setTeachers(t);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      setFormData({ 
        name: course.name, 
        code: course.code, 
        description: course.description, 
        credits: course.credits,
        department: course.department || "",
        teacher: course.teacher || "",
        is_active: course.is_active 
      });
    } else {
      setEditingCourse(null);
      setFormData({ name: "", code: "", description: "", credits: 3, department: "", teacher: "", is_active: true });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        department: formData.department === "" ? null : Number(formData.department),
        teacher: formData.teacher === "" ? null : Number(formData.teacher),
      };
      
      if (editingCourse) {
        await courseService.update(editingCourse.id, payload);
      } else {
        await courseService.create(payload);
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      alert("Failed to save course.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await courseService.remove(deleteConfirm.id);
      setDeleteConfirm(null);
      loadData();
    } catch (error) {
      console.error(error);
      alert("Failed to delete course.");
    }
  };

  return (
    <DashboardLayout title="Manage Courses">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>Courses</h2>
          <p>Curriculum courses</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn btn-primary">
          + Add Course
        </button>
      </div>

      <div className="content-card">
        <EntityTable<Course>
          data={courses}
          loading={loading}
          resourceName="courses"
          columns={[
            { key: "code", label: "Code" },
            { key: "name", label: "Name" },
            { key: "credits", label: "Credits" },
            { 
              key: "department", 
              label: "Department",
              render: (c) => departments.find(d => d.id === c.department)?.name || "-"
            },
            { 
              key: "teacher", 
              label: "Teacher",
              render: (c) => {
                const t = teachers.find(t => t.id === c.teacher);
                return t ? `${t.first_name} ${t.last_name}` : "-";
              }
            }
          ]}
          onEdit={handleOpenModal}
          onDelete={setDeleteConfirm}
        />
      </div>

      <Modal isOpen={isModalOpen} title={editingCourse ? "Edit Course" : "Add Course"} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Course Name</label>
            <input required className="form-control" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Course Code</label>
            <input required className="form-control" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Credits</label>
            <input type="number" required className="form-control" value={formData.credits} onChange={(e) => setFormData({...formData, credits: parseInt(e.target.value) || 0})} />
          </div>
          
          <div className="form-group">
            <label className="form-label">Department</label>
            <select className="form-control" value={formData.department} onChange={(e) => setFormData({...formData, department: Number(e.target.value)})}>
              <option value="">-- Select Department --</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Teacher</label>
            <select className="form-control" value={formData.teacher} onChange={(e) => setFormData({...formData, teacher: Number(e.target.value)})}>
              <option value="">-- Select Teacher --</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows={3} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}></textarea>
          </div>
          
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Course"
        message={`Are you sure you want to delete ${deleteConfirm?.name}?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </DashboardLayout>
  );
}
