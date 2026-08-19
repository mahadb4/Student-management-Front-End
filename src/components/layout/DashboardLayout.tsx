import React from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import "../../pages/styles/Dashboard.css"; // We'll update this next

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <Navbar title={title} />
        <main className="dashboard-content-wrapper">
          {children}
        </main>
      </div>
    </div>
  );
}
