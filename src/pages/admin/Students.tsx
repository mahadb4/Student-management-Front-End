import { useEffect, useRef, useState, useMemo } from "react";
import { studentService, getStudentList, departmentService, sectionService } from "../../services/entities";
import { EntityTable } from "../../components/common/EntityTable";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import type { Student, StudentListItem, Department, Section } from "../../types/user";
import { useToast } from "../../context/ToastContext";

export default function Students() {
  const { showToast } = useToast();
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Departments/Sections are still fetched here — not for the table (the list
  // API already returns resolved department/section names per row), but
  // because the Add/Edit form dropdowns and the department filter need the
  // full lists to choose from.
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");

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

  // Department/Section options are only needed for the Add/Edit form and the
  // department filter — not for rendering the table (the list API already
  // returns resolved names). Loaded lazily, once, on first actual use.
  const dropdownsRequested = useRef(false);

  const loadDropdownData = () => {
    if (dropdownsRequested.current) return;
    dropdownsRequested.current = true;

    Promise.all([
      departmentService.getAll(),
      sectionService.getAll()
    ]).then(([d,s]) => {
      setDepartments(d);
      setSections(s);
    }).catch(err => {
      console.error(err);
      dropdownsRequested.current = false;
    });
  };

  const sectionsForDepartment = useMemo(() => {
    if (formData.department === "") return sections;
    return sections.filter(s => s.department === formData.department);
  },[sections,formData.department]);

  // The Students list only carries the narrow StudentListItem projection, so editing
  // fetches the full Student record (detail endpoint, unchanged) to populate the form.
  const handleOpenModal = async (row?: StudentListItem) => {
    loadDropdownData();

    if (row) {
      try {
        const student = await studentService.getById(row.id);
        setEditingStudent(student);
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
    if (!deptFilter) return students;
    return students.filter(s => s.department?.id.toString() === deptFilter);
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

      <div className="content-card" style={{ marginBottom:"24px",padding:"16px" }}>
        <div style={{ display:"flex",gap:"16px" }}>
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
            style={{ maxWidth:"250px" }}
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
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
              render:s => s.section?.name || "-"
            },
            {
              key:"department",
              label:"Department",
              render:s => s.department?.name || "-"
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
              <select className="form-control" value={formData.department} onChange={e => setFormData({...formData,department:e.target.value === "" ? "" : Number(e.target.value),section:""})}>
                <option value="">-- No Department --</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Section</label>
              <select className="form-control" value={formData.section} onChange={e => setFormData({...formData,section:e.target.value === "" ? "" : Number(e.target.value)})}>
                <option value="">-- No Section --</option>
                {sectionsForDepartment.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
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
