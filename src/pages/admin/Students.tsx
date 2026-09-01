import { useEffect, useState, useMemo } from "react";
import { studentService, getStudentList, getDepartmentReference, getSectionReference } from "../../services/entities";
import { EntityTable } from "../../components/common/EntityTable";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { PaginatedSelect } from "../../components/common/PaginatedSelect";
import type { Student, StudentListItem } from "../../types/user";
import { useToast } from "../../context/ToastContext";

export default function Students() {
  const { showToast } = useToast();
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [loading, setLoading] = useState(true);
  // Labels for the currently-edited student's Department/Section, shown until
  // the paginated dropdowns' own loaded pages happen to include them.
  const [editingLabels, setEditingLabels] = useState<{ department?: string; section?: string }>({});

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<number | "">("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<StudentListItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    first_name:"",
    last_name:"",
    student_email:"",
    parents_phone_number:"",
    date_of_birth:"",
    gender:"M",
    address:"",
    department:"" as number | "",
    section:"" as number | "",
    date_of_enrollment:"",
    is_active:true
  });

  const loadStudents = async (signal?: AbortSignal) => {
    setLoading(true);

    try {
      const result = await getStudentList(currentPage,pageSize,signal,debouncedSearch);
      setStudents(result.results);
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
    loadStudents(controller.signal);

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

  const handleDepartmentChange = (department: number | "") => {
    setFormData(prev => ({ ...prev, department, section: "" }));
    setEditingLabels(prev => ({ ...prev, section: undefined }));
  };

  // The Students list only carries the narrow StudentListItem projection, so editing
  // fetches the full Student record (detail endpoint, unchanged) to populate the form.
  const handleOpenModal = async (row?: StudentListItem) => {
    if (row) {
      try {
        const student = await studentService.getById(row.id);
        setEditingStudent(student);
        setEditingLabels({ department: row.department_name || undefined, section: row.section_name || undefined });
        setFormData({
          first_name:student.first_name,
          last_name:student.last_name,
          student_email:student.student_email,
          parents_phone_number:student.parents_phone_number,
          date_of_birth:student.date_of_birth,
          gender:student.gender,
          address:student.address,
          department:student.department || "",
          section:student.section || "",
          date_of_enrollment:student.date_of_enrollment,
          is_active:student.is_active
        });
      } catch (error) {
        console.error(error);
        showToast(error instanceof Error ? error.message : "Failed to load student.", "error");
        return;
      }
    } else {
      setEditingStudent(null);
      setEditingLabels({});
      setFormData({
        first_name:"",
        last_name:"",
        student_email:"",
        parents_phone_number:"",
        date_of_birth:"",
        gender:"M",
        address:"",
        department:"",
        section:"",
        date_of_enrollment:new Date().toISOString().split("T")[0],
        is_active:true
      });
    }

    setIsModalOpen(true);
  };

  const handleSave = async (e:React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        department:formData.department === "" ? null : Number(formData.department),
        section:formData.section === "" ? null : Number(formData.section)
      };

      if (editingStudent) {
        await studentService.update(editingStudent.id,payload);
        showToast("Student updated successfully.", "success");
      } else {
        await studentService.create(payload);
        showToast("Student created successfully.", "success");
      }

      setIsModalOpen(false);
      loadStudents();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Failed to save student.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm || isDeleting) return;
    setIsDeleting(true);

    try {
      await studentService.remove(deleteConfirm.id);
      setDeleteConfirm(null);
      showToast("Student deleted successfully.", "success");
      loadStudents();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Failed to delete student.", "error");
      setDeleteConfirm(null);
      loadStudents();
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (deptFilter === "") return students;
    return students.filter(s => s.department_id === deptFilter);
  },[students,deptFilter]);

  return (
    <>
      <div className="page-header" style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end" }}>
        <div>
          <h2>Students</h2>
          <p>Manage student records</p>
        </div>

        <button onClick={() => handleOpenModal()} className="btn btn-primary">
          + Add Student
        </button>
      </div>

      <div className="content-card" style={{ marginBottom:"24px",padding:"16px",overflow:"visible" }}>
        <div style={{ display:"flex",gap:"16px" }}>
          <input
            type="text"
            placeholder="Search by name or email..."
            className="form-control"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
          />

          <div style={{ maxWidth:"250px", width:"100%" }}>
            <PaginatedSelect
              fetchPage={(page, pageSize, signal) => getDepartmentReference(page, pageSize, signal)}
              getId={d => d.id}
              getLabel={d => d.name}
              value={deptFilter}
              onChange={id => setDeptFilter(id)}
              onClear={() => setDeptFilter("")}
              clearLabel="All Departments"
              placeholder="All Departments"
            />
          </div>
        </div>
      </div>

      <div className="content-card">
        <EntityTable<StudentListItem>
          data={filteredStudents}
          loading={loading}
          resourceName="students"
          columns={[
            {
              key:"name",
              label:"Name",
              render:s => s.name
            },
            { key:"student_email",label:"Email" },
            {
              key:"section",
              label:"Section",
              render:s => s.section_name || "-"
            },
            {
              key:"department",
              label:"Department",
              render:s => s.department_name || "-"
            }
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

      <Modal
        isOpen={isModalOpen}
        title={editingStudent ? "Edit Student" : "Add Student"}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSave}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px" }}>
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input required className="form-control" value={formData.first_name} onChange={e => setFormData({...formData,first_name:e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input required className="form-control" value={formData.last_name} onChange={e => setFormData({...formData,last_name:e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input required type="email" className="form-control" value={formData.student_email} onChange={e => setFormData({...formData,student_email:e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label">Parents Phone</label>
              <input required className="form-control" value={formData.parents_phone_number} onChange={e => setFormData({...formData,parents_phone_number:e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input required type="date" className="form-control" value={formData.date_of_birth} onChange={e => setFormData({...formData,date_of_birth:e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-control" value={formData.gender} onChange={e => setFormData({...formData,gender:e.target.value})}>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Department</label>
              <PaginatedSelect
                fetchPage={(page, pageSize, signal) => getDepartmentReference(page, pageSize, signal)}
                getId={d => d.id}
                getLabel={d => d.name}
                value={formData.department}
                onChange={id => handleDepartmentChange(id)}
                onClear={() => handleDepartmentChange("")}
                clearLabel="-- No Department --"
                selectedLabel={editingLabels.department}
                placeholder="-- No Department --"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Section</label>
              <PaginatedSelect
                // Dependent on the selected Department: department_id is
                // threaded into the fetch, and resetKey (below) forces the
                // dropdown to discard loaded pages and re-fetch page 1 for
                // the new department whenever it changes.
                fetchPage={(page, pageSize, signal) => getSectionReference(formData.department === "" ? undefined : formData.department, page, pageSize, signal)}
                resetKey={formData.department}
                getId={s => s.id}
                getLabel={s => s.name}
                value={formData.section}
                onChange={id => setFormData({...formData, section: id})}
                onClear={() => setFormData({...formData, section: ""})}
                clearLabel="-- No Section --"
                selectedLabel={editingLabels.section}
                placeholder="-- No Section --"
                disabled={formData.department === ""}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Enrollment Date</label>
              <input required type="date" className="form-control" value={formData.date_of_enrollment} onChange={e => setFormData({...formData,date_of_enrollment:e.target.value})} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <textarea className="form-control" rows={2} value={formData.address} onChange={e => setFormData({...formData,address:e.target.value})}></textarea>
          </div>

          <div style={{ display:"flex",justifyContent:"flex-end",gap:"12px",marginTop:"24px" }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Student"
        message={`Are you sure you want to delete ${deleteConfirm?.name}?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        confirmDisabled={isDeleting}
      />
    </>
  );
}
