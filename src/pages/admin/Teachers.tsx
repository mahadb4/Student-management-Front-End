import { useEffect, useRef, useState, useMemo } from "react";
import { teacherService, getTeacherList, getDepartmentReference } from "../../services/entities";
import { EntityTable } from "../../components/common/EntityTable";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import type { Teacher, TeacherListItem, DepartmentReference } from "../../types/user";
import { useToast } from "../../context/ToastContext";

export default function Teachers() {
  const { showToast } = useToast();
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Departments are still fetched here — not for the table (the list API
  // already returns resolved department names per row), but because the
  // Add/Edit form dropdown and the department filter need the full list.
  const [departments, setDepartments] = useState<DepartmentReference[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<TeacherListItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    first_name: "", last_name: "", employee_id: "", email: "", phone_number: "",
    department: "" as number | "", designation: "", qualification: "", gender: "M",
    date_of_birth: "", date_of_joining: "", salary: "", address: "", is_active: true
  });

  const loadTeachers = async (signal?: AbortSignal) => {
    setLoading(true);

    try {
      const result = await getTeacherList(currentPage,pageSize,signal,debouncedSearch);
      setTeachers(result.results);
      setTotalCount(result.total_count);
    } catch (err:any) {
      if (err.name === "AbortError") return;
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    },400);

    return () => clearTimeout(timer);
  },[search]);

  useEffect(() => {
    const controller = new AbortController();
    loadTeachers(controller.signal);

    return () => controller.abort();
  },[currentPage,pageSize,debouncedSearch]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Department options are only needed for the Add/Edit form and the
  // department filter — not for rendering the table (the list API already
  // returns resolved names). Loaded lazily, once, on first actual use.
  const dropdownsRequested = useRef(false);

  const loadDropdownData = () => {
    if (dropdownsRequested.current) return;
    dropdownsRequested.current = true;

    getDepartmentReference().then(d => {
      setDepartments(d);
    }).catch(err => {
      console.error(err);
      dropdownsRequested.current = false;
    });
  };

  // The Teachers list only carries the narrow TeacherListItem projection, so editing
  // fetches the full Teacher record (detail endpoint, unchanged) to populate the form.
  const handleOpenModal = async (row?: TeacherListItem) => {
    loadDropdownData();

    if (row) {
      try {
        const teacher = await teacherService.getById(row.id);
        setEditingTeacher(teacher);
        setFormData({
          first_name: teacher.first_name, last_name: teacher.last_name,
          employee_id: teacher.employee_id, email: teacher.email, phone_number: teacher.phone_number,
          department: teacher.department || "", designation: teacher.designation, qualification: teacher.qualification,
          gender: teacher.gender, date_of_birth: teacher.date_of_birth, date_of_joining: teacher.date_of_joining,
          salary: teacher.salary, address: teacher.address, is_active: teacher.is_active
        });
      } catch (error) {
        console.error(error);
        showToast(error instanceof Error ? error.message : "Failed to load teacher.", "error");
        return;
      }
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
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        department: formData.department === "" ? null : Number(formData.department),
      };

      if (editingTeacher) {
        await teacherService.update(editingTeacher.id, payload);
        showToast("Teacher updated successfully.", "success");
      } else {
        await teacherService.create(payload);
        showToast("Teacher created successfully.", "success");
      }
      setIsModalOpen(false);
      loadTeachers();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Failed to save teacher.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm || isDeleting) return;
    setIsDeleting(true);
    try {
      await teacherService.remove(deleteConfirm.id);
      setDeleteConfirm(null);
      showToast("Teacher deleted successfully.", "success");
      loadTeachers();
    } catch (error) {
      console.error(error);
      showToast("Failed to delete teacher.", "error");
      setDeleteConfirm(null);
      loadTeachers();
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredTeachers = useMemo(() => {
    if (!deptFilter) return teachers;
    return teachers.filter(t => t.department_id?.toString() === deptFilter);
  }, [teachers, deptFilter]);

  return (
    <>
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
            onChange={e => handleSearchChange(e.target.value)}
          />
          <select
            className="form-control"
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            onFocus={loadDropdownData}
            style={{ maxWidth: "250px" }}
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      <div className="content-card">
        <EntityTable<TeacherListItem>
          data={filteredTeachers}
          loading={loading}
          resourceName="teachers"
          columns={[
            { key: "employee_id", label: "Emp ID" },
            {
              key: "name",
              label: "Name",
              render: (t) => t.name
            },
            { key: "email", label: "Email" },
            {
              key: "department",
              label: "Department",
              render: (t) => t.department_name || "-"
            },
            { key: "designation", label: "Designation" }
          ]}
          onEdit={handleOpenModal}
          onDelete={setDeleteConfirm}
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={handlePageSizeChange}
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
              <select required className="form-control" value={formData.department} onChange={(e) => setFormData({...formData, department: Number(e.target.value)})} onFocus={loadDropdownData}>
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
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Teacher"
        message={`Are you sure you want to delete ${deleteConfirm?.name}?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        confirmDisabled={isDeleting}
      />
    </>
  );
}
