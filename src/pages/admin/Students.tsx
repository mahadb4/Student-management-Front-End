import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { studentService, departmentService, teacherService } from "../../services/entities";
import { EntityTable } from "../../components/common/EntityTable";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import type { Student, Department, Teacher } from "../../types/user";

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Student | null>(null);
  
  const [formData, setFormData] = useState({ 
    first_name: "", last_name: "", student_email: "", parents_phone_number: "",
    date_of_birth: "", gender: "M", address: "", student_group: "",
    department: "" as number | "", teacher: "" as number | "", date_of_enrollment: "", is_active: true 
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      studentService.getAll(),
      departmentService.getAll(),
      teacherService.getAll()
    ]).then(([s, d, t]) => {
      setStudents(s);
      setDepartments(d);
      setTeachers(t);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData({ 
        first_name: student.first_name, last_name: student.last_name, 
        student_email: student.student_email, parents_phone_number: student.parents_phone_number,
        date_of_birth: student.date_of_birth, gender: student.gender, address: student.address,
        student_group: student.student_group, department: student.department || "",
        teacher: student.teacher || "", date_of_enrollment: student.date_of_enrollment, is_active: student.is_active 
      });
    } else {
      setEditingStudent(null);
      setFormData({ 
        first_name: "", last_name: "", student_email: "", parents_phone_number: "",
        date_of_birth: "", gender: "M", address: "", student_group: "",
        department: "", teacher: "", date_of_enrollment: new Date().toISOString().split('T')[0], is_active: true 
      });
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
      
      if (editingStudent) {
        await studentService.update(editingStudent.id, payload);
      } else {
        await studentService.create(payload);
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      alert("Failed to save student.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await studentService.remove(deleteConfirm.id);
      setDeleteConfirm(null);
      loadData();
    } catch (error) {
      console.error(error);
      alert("Failed to delete student.");
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = (s.first_name + " " + s.last_name).toLowerCase().includes(search.toLowerCase()) || 
                          s.student_email.toLowerCase().includes(search.toLowerCase());
      const matchDept = deptFilter ? s.department?.toString() === deptFilter : true;
      return matchSearch && matchDept;
    });
  }, [students, search, deptFilter]);

  return (
    <DashboardLayout title="Manage Students">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h2>Students</h2>
          <p>Manage student records</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn btn-primary">
          + Add Student
        </button>
      </div>

      <div className="content-card" style={{ marginBottom: "24px", padding: "16px" }}>
        <div style={{ display: "flex", gap: "16px" }}>
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            className="form-control" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
          <select className="form-control" value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ maxWidth: "250px" }}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      <div className="content-card">
        <EntityTable<Student>
          data={filteredStudents}
          loading={loading}
          resourceName="students"
          columns={[
            { 
              key: "name", 
              label: "Name",
              render: (s) => `${s.first_name} ${s.last_name}`
            },
            { key: "student_email", label: "Email" },
            { key: "student_group", label: "Group" },
            { 
              key: "department", 
              label: "Department",
              render: (s) => departments.find(d => d.id === s.department)?.name || "-"
            },
            { 
              key: "teacher", 
              label: "Advisor",
              render: (s) => {
                const t = teachers.find(t => t.id === s.teacher);
                return t ? `${t.first_name} ${t.last_name}` : "-";
              }
            }
          ]}
          onEdit={handleOpenModal}
          onDelete={setDeleteConfirm}
        />
      </div>

      <Modal isOpen={isModalOpen} title={editingStudent ? "Edit Student" : "Add Student"} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSave}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input required className="form-control" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input required className="form-control" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input required type="email" className="form-control" value={formData.student_email} onChange={(e) => setFormData({...formData, student_email: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Parents Phone</label>
              <input required className="form-control" value={formData.parents_phone_number} onChange={(e) => setFormData({...formData, parents_phone_number: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input required type="date" className="form-control" value={formData.date_of_birth} onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-control" value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-control" value={formData.department} onChange={(e) => setFormData({...formData, department: Number(e.target.value)})}>
                <option value="">-- No Department --</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Advisor (Teacher)</label>
              <select className="form-control" value={formData.teacher} onChange={(e) => setFormData({...formData, teacher: Number(e.target.value)})}>
                <option value="">-- No Advisor --</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Group</label>
              <input required className="form-control" value={formData.student_group} onChange={(e) => setFormData({...formData, student_group: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Enrollment Date</label>
              <input required type="date" className="form-control" value={formData.date_of_enrollment} onChange={(e) => setFormData({...formData, date_of_enrollment: e.target.value})} />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Address</label>
            <textarea className="form-control" rows={2} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})}></textarea>
          </div>
          
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Student"
        message={`Are you sure you want to delete ${deleteConfirm?.first_name} ${deleteConfirm?.last_name}?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </DashboardLayout>
  );
}
