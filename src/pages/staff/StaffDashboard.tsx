import DashboardLayout from "../../components/layout/DashboardLayout";

function StaffDashboard() {
  return (
    <DashboardLayout title="Staff Dashboard">
      <div className="page-header">
        <h2>Welcome, Staff</h2>
        <p>Administrative support portal</p>
      </div>
      <div className="placeholder-section">
        <p className="placeholder-text">
          🚀 Staff portal features will be implemented in subsequent phases.
        </p>
      </div>
    </DashboardLayout>
  );
}

export default StaffDashboard;
