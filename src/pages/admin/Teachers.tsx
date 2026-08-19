import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { teacherService, departmentService } from "../../services/entities";
import { EntityTable } from "../../components/common/EntityTable";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import type { Teacher, Department } from "../../types/user";

export default function Teachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Teacher | null>(null);
  
  const [formData, setFormData] = useState({ 
    first_name: "", last_name: "", employee_id: "", email: "", phone_number: "",
    department: "" as number | "", designation: "", qualification: "", gender: "M",
    date_of_birth: "", date_of_joining: "", salary: "", address: "", is_active: true 
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      teacherService.getAll(),
      departmentService.getAll()
    ]).then(([t, d]) => {
      setTeachers(t);
      setDepartments(d);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (teacher?: Teacher) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setFormData({ 
        first_name: teacher.first_name, last_name: teacher.last_name, 
        employee_id: teacher.employee_id, email: teacher.email, phone_number: teacher.phone_number,
        department: teacher.department || "", designation: teacher.designation, qualification: teacher.qualification, 
        gender: teacher.gender, date_of_birth: teacher.date_of_birth, date_of_joining: teacher.date_of_joining, 
        salary: teacher.salary, address: teacher.address, is_active: teacher.is_active 
      });
    } else {
      setEditingTeacher(null);
      setFormData({ 
        first_name: "", last_name: "", employee_id: "", email: "", phone_number: "",
        department: "", designation: "", qualification: "", gender: "M",
        date_of_birth: "", date_of_joining: "", salary: "", address: "", is_active: true 
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
      };
      
      if (editingTeacher) {
        await teacherService.update(editingTeacher.id, payload);
      } else {
        await teacherService.create(payload);
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      alert("Failed to save teacher.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await teacherService.remove(deleteConfirm.id);
      setDeleteConfirm(null);
      loadData();
    } catch (error) {
      console.error(error);
      alert("Failed to delete teacher.");
    }
  };

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const matchSearch = (t.first_name + " " + t.last_name).toLowerCase().includes(search.toLowerCase()) || 
                          t.email.toLowerCase().includes(search.toLowerCase());
      const matchDept = deptFilter ? t.department?.toString() === deptFilter : true;
      return matchSearch && matchDept;
    });
  }, [teachers, search, deptFilter]);

  return (
    <DashboardLayout title="Manage Teachers">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h2>Teachers</h2>
          <p>Manage faculty members</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn btn-primary">
          + Add Teacher
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
        <EntityTable<Teacher>
          data={filteredTeachers}
          loading={loading}
          resourceName="teachers"
          columns={[
            { key: "employee_id", label: "Emp ID" },
            { 
              key: "name", 
              label: "Name",
              render: (t) => `${t.first_name} ${t.last_name}`
            },
            { key: "email", label: "Email" },
            { 
              key: "department", 
              label: "Department",
              render: (t) => departments.find(d => d.id === t.department)?.name || "-"
            },
            { key: "designation", label: "Designation" }
          ]}
          onEdit={handleOpenModal}
          onDelete={setDeleteConfirm}
        />
      </div>

      <Modal isOpen={isModalOpen} title={editingTeacher ? "Edit Teacher" : "Add Teacher"} onClose={() => setIsModalOpen(false)}>
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
              <label className="form-label">Employee ID</label>
              <input required className="form-control" value={formData.employee_id} onChange={(e) => setFormData({...formData, employee_id: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input required type="email" className="form-control" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input required className="form-control" value={formData.phone_number} onChange={(e) => setFormData({...formData, phone_number: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select required className="form-control" value={formData.department} onChange={(e) => setFormData({...formData, department: Number(e.target.value)})}>
                <option value="">-- Select Department --</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Designation</label>
              <input required className="form-control" value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Qualification</label>
              <input required className="form-control" value={formData.qualification} onChange={(e) => setFormData({...formData, qualification: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-control" value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input required type="date" className="form-control" value={formData.date_of_birth} onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Joining</label>
              <input required type="date" className="form-control" value={formData.date_of_joining} onChange={(e) => setFormData({...formData, date_of_joining: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Salary</label>
              <input required type="number" step="0.01" className="form-control" value={formData.salary} onChange={(e) => setFormData({...formData, salary: e.target.value})} />
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
        title="Delete Teacher"
        message={`Are you sure you want to delete ${deleteConfirm?.first_name} ${deleteConfirm?.last_name}?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </DashboardLayout>
  );
}
