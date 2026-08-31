import { useEffect, useRef, useState } from "react";
import { courseService, getCourseList, getDepartmentReference, getTeacherReference } from "../../services/entities";
import { EntityTable } from "../../components/common/EntityTable";
import { Modal } from "../../components/common/Modal";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import type { Course, CourseListItem, DepartmentReference, TeacherReference } from "../../types/user";
import { useToast } from "../../context/ToastContext";

export default function Courses() {
  const { showToast } = useToast();
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Departments/Teachers are only needed for the Add/Edit form dropdowns —
  // not for the table (the list API already returns resolved names).
  const [departments, setDepartments] = useState<DepartmentReference[]>([]);
  const [teachers, setTeachers] = useState<TeacherReference[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CourseListItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: "", code: "", description: "", credits: 3,
    department: "" as number | "", teacher: "" as number | "", is_active: true
  });

  const loadCourses = (signal?: AbortSignal) => {
    setLoading(true);
    getCourseList(currentPage, pageSize, signal, debouncedSearch).then(res => {
      setCourses(res.results);
      setTotalCount(res.total_count);
    }).catch(err => {
      if (err.name === 'AbortError') return;
      console.error(err);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    },400);

    return () => clearTimeout(timer);
  },[search]);

  useEffect(() => {
    const controller = new AbortController();
    loadCourses(controller.signal);
    return () => controller.abort();
  }, [currentPage,pageSize,debouncedSearch]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Department/Teacher options are only needed for the Add/Edit form — loaded
  // lazily, once, on first actual use.
  const dropdownsRequested = useRef(false);

  const loadDropdownData = () => {
    if (dropdownsRequested.current) return;
    dropdownsRequested.current = true;

    Promise.all([
      getDepartmentReference(),
      getTeacherReference()
    ]).then(([d, t]) => {
      setDepartments(d);
      setTeachers(t);
    }).catch(err => {
      console.error(err);
      dropdownsRequested.current = false;
    });
  };

  // The Courses list only carries the narrow CourseListItem projection, so editing
  // fetches the full Course record (detail endpoint, unchanged) to populate the form.
  const handleOpenModal = async (row?: CourseListItem) => {
    loadDropdownData();

    if (row) {
      try {
        const course = await courseService.getById(row.id);
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
      } catch (error) {
        console.error(error);
        showToast(error instanceof Error ? error.message : "Failed to load course.", "error");
        return;
      }
    } else {
      setEditingCourse(null);
      setFormData({ name: "", code: "", description: "", credits: 3, department: "", teacher: "", is_active: true });
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
        teacher: formData.teacher === "" ? null : Number(formData.teacher),
      };

      if (editingCourse) {
        await courseService.update(editingCourse.id, payload);
        showToast("Course updated successfully.", "success");
      } else {
        await courseService.create(payload);
        showToast("Course created successfully.", "success");
      }
      setIsModalOpen(false);
      loadCourses();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Failed to save course.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm || isDeleting) return;
    setIsDeleting(true);
    try {
      await courseService.remove(deleteConfirm.id);
      setDeleteConfirm(null);
      showToast("Course deleted successfully.", "success");
      loadCourses();
    } catch (error) {
      console.error(error);
      showToast("Failed to delete course.", "error");
      setDeleteConfirm(null);
      loadCourses();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>Courses</h2>
          <p>Curriculum courses</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn btn-primary">
          + Add Course
        </button>
      </div>

      <div className="content-card" style={{ marginBottom: "24px", padding: "16px" }}>
        <input
          type="text"
          placeholder="Search by name, code or department..."
          className="form-control"
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
        />
      </div>

      <div className="content-card">
        <EntityTable<CourseListItem>
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
              render: (c) => c.department_name || "-"
            },
            {
              key: "teacher",
              label: "Teacher",
              render: (c) => c.teacher_name || "-"
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
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows={3} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}></textarea>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Course"
        message={`Are you sure you want to delete ${deleteConfirm?.name}?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        confirmDisabled={isDeleting}
      />
    </>
  );
}
