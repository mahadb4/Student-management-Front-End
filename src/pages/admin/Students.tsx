import { useEffect, useState } from "react";
import { studentService, getStudentList, getDepartmentReference, getSectionReference, getCourseOfferingList, enrollmentService } from "../../services/entities";
import { EntityTable } from "../../components/common/EntityTable";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { PaginatedSelect } from "../../components/common/PaginatedSelect";
import { Avatar } from "../../components/common/Avatar";
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

  // Optional "assign to a class" shortcut, offered right in the same review
  // flow - creates a real Enrollment (student + course_offering) via the
  // existing Enrollments API, same as the dedicated Enrollments page. Not
  // preloaded with the student's current enrollment (would be an extra
  // lookup per row/open); left blank means "don't change enrollment here",
  // same convention as Enrollments.tsx not pre-resolving section on edit.
  const [selectedOffering, setSelectedOffering] = useState<number | "">("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<number | "">("");
  const [placementFilter, setPlacementFilter] = useState<"" | "pending" | "confirmed">("");
  const [ordering, setOrdering] = useState("name");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<StudentListItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Separate from the Delete ConfirmDialog: shown only when an edit flips an
  // existing, currently-active Student to inactive.
  const [pendingDeactivation, setPendingDeactivation] = useState(false);

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
    placement_confirmed:false,
    date_of_enrollment:"",
    is_active:true
  });

  const loadStudents = async (signal?: AbortSignal) => {
    setLoading(true);

    try {
      const result = await getStudentList(
        currentPage,pageSize,signal,debouncedSearch,deptFilter === "" ? undefined : deptFilter,ordering,
        placementFilter === "" ? undefined : placementFilter === "confirmed",
      );
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
  },[currentPage,pageSize,debouncedSearch,deptFilter,placementFilter,ordering]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const handleDeptFilterChange = (id: number | "") => {
    setDeptFilter(id);
    setCurrentPage(1);
  };

  const handlePlacementFilterChange = (value: "" | "pending" | "confirmed") => {
    setPlacementFilter(value);
    setCurrentPage(1);
  };

  const handleSortChange = (nextOrdering: string) => {
    setOrdering(nextOrdering);
    setCurrentPage(1);
  };

  const handleDepartmentChange = (department: number | "") => {
    // Clearing/changing Department invalidates any already-selected Section,
    // and a placement can never stay confirmed without both. The Class
    // Assignment picker is scoped to Section, so it resets too.
    setFormData(prev => ({ ...prev, department, section: "", placement_confirmed: false }));
    setEditingLabels(prev => ({ ...prev, section: undefined }));
    setSelectedOffering("");
  };

  const handleSectionChange = (section: number | "") => {
    setFormData(prev => ({ ...prev, section, placement_confirmed: section === "" ? false : prev.placement_confirmed }));
    setSelectedOffering("");
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
          placement_confirmed:student.placement_confirmed,
          date_of_enrollment:student.date_of_enrollment,
          is_active:student.is_active
        });
        setSelectedOffering("");
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
        placement_confirmed:false,
        date_of_enrollment:new Date().toISOString().split("T")[0],
        is_active:true
      });
      setSelectedOffering("");
    }

    setIsModalOpen(true);
  };

  const handleSave = async (e:React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (editingStudent && editingStudent.is_active && !formData.is_active) {
      setPendingDeactivation(true);
      return;
    }

    await saveStudent();
  };

  const saveStudent = async () => {
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        department:formData.department === "" ? null : Number(formData.department),
        section:formData.section === "" ? null : Number(formData.section)
      };

      let studentId = editingStudent?.id;

      if (editingStudent) {
        await studentService.update(editingStudent.id,payload);
        showToast("Student updated successfully.", "success");
      } else {
        const created = await studentService.create(payload);
        studentId = created.id;
        showToast("Student created successfully.", "success");
      }

      // Optional convenience: assigning a class right here creates a real
      // Enrollment through the existing Enrollments API - same effect as
      // doing it afterwards from the Enrollments page, just without leaving
      // this review flow. Left blank, nothing enrollment-related happens.
      if (selectedOffering !== "" && studentId !== undefined) {
        try {
          await enrollmentService.create({
            student: studentId, course_offering: Number(selectedOffering), status: "ACTIVE",
          });
          showToast("Student enrolled in the selected class.", "success");
        } catch (error) {
          console.error(error);
          showToast(error instanceof Error ? error.message : "Student saved, but enrollment failed.", "error");
        }
      }

      setPendingDeactivation(false);
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
              fetchPage={(page, pageSize, signal, search) => getDepartmentReference(page, pageSize, signal, search)}
              getId={d => d.id}
              getLabel={d => d.name}
              value={deptFilter}
              onChange={id => handleDeptFilterChange(id)}
              onClear={() => handleDeptFilterChange("")}
              clearLabel="All Departments"
              placeholder="All Departments"
              serverSearch
            />
          </div>

          <select
            className="form-control"
            style={{ maxWidth: "220px" }}
            value={placementFilter}
            onChange={e => handlePlacementFilterChange(e.target.value as "" | "pending" | "confirmed")}
          >
            <option value="">All Placements</option>
            <option value="pending">Pending Review</option>
            <option value="confirmed">Confirmed</option>
          </select>
        </div>
      </div>

      <div className="content-card">
        <EntityTable<StudentListItem>
          data={students}
          loading={loading}
          resourceName="students"
          columns={[
            {
              key:"profile_picture_url",
              label:"",
              render:s => <Avatar src={s.profile_picture_url} name={s.name} size={32} />
            },
            {
              key:"name",
              label:"Name",
              render:s => s.name,
              sortKey:"name"
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
            },
            {
              key:"placement_confirmed",
              label:"Placement",
              render:s => s.placement_confirmed
                ? <span className="badge badge-success">Confirmed</span>
                : <span className="badge badge-warning">Pending Review</span>
            }
          ]}
          onEdit={handleOpenModal}
          onDelete={setDeleteConfirm}
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={handlePageSizeChange}
          ordering={ordering}
          onSortChange={handleSortChange}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        title={editingStudent ? (editingStudent.placement_confirmed ? "Edit Student" : "Review Student Application") : "Add Student"}
        onClose={() => setIsModalOpen(false)}
      >
        {editingStudent && !editingStudent.placement_confirmed && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", marginBottom: "18px",
              backgroundColor: "var(--color-warning-bg, #fffbeb)", border: "1px solid var(--color-warning, #f59e0b)",
              borderRadius: "var(--radius-md)", fontSize: "0.85rem",
            }}
          >
            <span className="badge badge-warning">Pending Review</span>
            <span>This student completed onboarding and is waiting for academic placement.</span>
          </div>
        )}

        <form onSubmit={handleSave}>
          <h4 style={{ margin: "0 0 12px", fontSize: "0.85rem", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
            Personal Information
          </h4>
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
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <textarea className="form-control" rows={2} value={formData.address} onChange={e => setFormData({...formData,address:e.target.value})}></textarea>
          </div>

          <h4 style={{ margin: "20px 0 12px", fontSize: "0.85rem", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
            Academic Placement
          </h4>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px" }}>
            <div className="form-group">
              <label className="form-label">Department</label>
              <PaginatedSelect
                fetchPage={(page, pageSize, signal, search) => getDepartmentReference(page, pageSize, signal, search)}
                getId={d => d.id}
                getLabel={d => d.name}
                value={formData.department}
                onChange={id => handleDepartmentChange(id)}
                onClear={() => handleDepartmentChange("")}
                clearLabel="-- No Department --"
                selectedLabel={editingLabels.department}
                placeholder="-- No Department --"
                serverSearch
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
                onChange={id => handleSectionChange(id)}
                onClear={() => handleSectionChange("")}
                clearLabel="-- No Section --"
                selectedLabel={editingLabels.section}
                placeholder="-- No Section --"
                disabled={formData.department === ""}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Class / Course Offering (optional)</label>
              <PaginatedSelect
                // Scoped to the selected Section, same dependency pattern as
                // the Enrollments page: fetching the admin's existing,
                // section-filtered, active-only Course Offering list rather
                // than dumping every offering/teacher into one dropdown.
                // Choosing an offering also fixes the teacher, since teacher
                // is a property of the CourseOffering, not something this
                // form ever sets directly on the Student.
                fetchPage={(page, pageSize, signal, search) =>
                  getCourseOfferingList(page, pageSize, signal, search, formData.section === "" ? undefined : formData.section, true)
                }
                resetKey={formData.section}
                getId={o => o.id}
                getLabel={o => `${o.course_name} (${o.course_code}) - ${o.teacher_name || "No Teacher"}`}
                value={selectedOffering}
                onChange={id => setSelectedOffering(id)}
                onClear={() => setSelectedOffering("")}
                clearLabel="-- No Class Assignment --"
                placeholder="-- No Class Assignment --"
                disabled={formData.section === ""}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Enrollment Date</label>
              <input required type="date" className="form-control" value={formData.date_of_enrollment} onChange={e => setFormData({...formData,date_of_enrollment:e.target.value})} />
            </div>

            <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
              <label style={{ margin: 0 }}>Active</label>
            </div>
          </div>

          <div
            className="form-group"
            style={{
              display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px",
              backgroundColor: "var(--color-surface-muted, #f8fafc)", borderRadius: "var(--radius-md)",
            }}
          >
            <input
              type="checkbox"
              id="placement-confirmed"
              checked={formData.placement_confirmed}
              disabled={formData.department === "" || formData.section === ""}
              onChange={e => setFormData({...formData, placement_confirmed: e.target.checked})}
            />
            <label htmlFor="placement-confirmed" style={{ margin: 0 }}>
              Confirm Academic Placement
              <span style={{ display: "block", fontSize: "0.78rem", color: "var(--color-text-secondary)", fontWeight: 400 }}>
                {formData.department === "" || formData.section === ""
                  ? "Select a Department and Section to confirm placement."
                  : "Grants this student access to their dashboard."}
              </span>
            </label>
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

      <ConfirmDialog
        isOpen={pendingDeactivation}
        title="Deactivate Student"
        message="Deactivating this student will prevent new Enrollments for them. Existing enrollments and attendance records are not affected. Continue?"
        onConfirm={saveStudent}
        onCancel={() => setPendingDeactivation(false)}
        variant="warning"
        confirmDisabled={isSubmitting}
        confirmLabel="Deactivate"
        pendingLabel="Deactivating..."
      />
    </>
  );
}
