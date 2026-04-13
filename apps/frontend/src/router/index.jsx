import { Navigate, createBrowserRouter } from 'react-router-dom';
import RequireAuth from '../guards/RequireAuth.jsx';
import AuditPage from '../pages/AuditPage.jsx';
import ExamsPage from '../pages/ExamsPage.jsx';
import InstructorDashboardPage from '../pages/InstructorDashboardPage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import StudentDashboardPage from '../pages/StudentDashboardPage.jsx';
import StudentDetailPage from '../pages/StudentDetailPage.jsx';
import StudentDiagnosisPage from '../pages/StudentDiagnosisPage.jsx';
import StudentGrowthPage from '../pages/StudentGrowthPage.jsx';
import StudentPlannerPage from '../pages/StudentPlannerPage.jsx';
import StudentSimulatorPage from '../pages/StudentSimulatorPage.jsx';
import StudentStrategyWorkspacePage from '../pages/StudentStrategyWorkspacePage.jsx';
import UniversityPoliciesPage from '../pages/UniversityPoliciesPage.jsx';

function StudentRoute({ children }) {
  return <RequireAuth roles={['student']}>{children}</RequireAuth>;
}

function StaffRoute({ children }) {
  return <RequireAuth roles={['admin', 'instructor']}>{children}</RequireAuth>;
}

export const appRouter = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/instructor',
    element: (
      <StaffRoute>
        <InstructorDashboardPage />
      </StaffRoute>
    ),
  },
  {
    path: '/students/:studentId',
    element: (
      <StaffRoute>
        <StudentDetailPage />
      </StaffRoute>
    ),
  },
  {
    path: '/exams',
    element: (
      <StaffRoute>
        <ExamsPage />
      </StaffRoute>
    ),
  },
  {
    path: '/universities',
    element: (
      <StaffRoute>
        <UniversityPoliciesPage />
      </StaffRoute>
    ),
  },
  {
    path: '/audit',
    element: (
      <StaffRoute>
        <AuditPage />
      </StaffRoute>
    ),
  },
  {
    path: '/student',
    element: (
      <StudentRoute>
        <StudentDashboardPage />
      </StudentRoute>
    ),
  },
  {
    path: '/student/diagnosis',
    element: (
      <StudentRoute>
        <StudentDiagnosisPage />
      </StudentRoute>
    ),
  },
  {
    path: '/student/strategy-workspace',
    element: (
      <StudentRoute>
        <StudentStrategyWorkspacePage />
      </StudentRoute>
    ),
  },
  {
    path: '/student/planner',
    element: (
      <StudentRoute>
        <StudentPlannerPage />
      </StudentRoute>
    ),
  },
  {
    path: '/student/growth',
    element: (
      <StudentRoute>
        <StudentGrowthPage />
      </StudentRoute>
    ),
  },
  {
    path: '/student/simulator',
    element: (
      <StudentRoute>
        <StudentSimulatorPage />
      </StudentRoute>
    ),
  },
]);
