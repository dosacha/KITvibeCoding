import { Navigate, createBrowserRouter } from 'react-router-dom';
import RequireAuth from '../guards/RequireAuth.jsx';
import AuditPage from '../pages/AuditPage.jsx';
import ExamsPage from '../pages/ExamsPage.jsx';
import InstructorDashboardPage from '../pages/InstructorDashboardPage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import StudentDashboardPage from '../pages/StudentDashboardPage.jsx';
import StudentDetailPage from '../pages/StudentDetailPage.jsx';
import UniversityPoliciesPage from '../pages/UniversityPoliciesPage.jsx';

export const appRouter = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/instructor',
    element: (
      <RequireAuth roles={['admin', 'instructor']}>
        <InstructorDashboardPage />
      </RequireAuth>
    ),
  },
  {
    path: '/students/:studentId',
    element: (
      <RequireAuth roles={['admin', 'instructor']}>
        <StudentDetailPage />
      </RequireAuth>
    ),
  },
  {
    path: '/exams',
    element: (
      <RequireAuth roles={['admin', 'instructor']}>
        <ExamsPage />
      </RequireAuth>
    ),
  },
  {
    path: '/universities',
    element: (
      <RequireAuth roles={['admin', 'instructor']}>
        <UniversityPoliciesPage />
      </RequireAuth>
    ),
  },
  {
    path: '/audit',
    element: (
      <RequireAuth roles={['admin', 'instructor']}>
        <AuditPage />
      </RequireAuth>
    ),
  },
  {
    path: '/student',
    element: (
      <RequireAuth roles={['student']}>
        <StudentDashboardPage />
      </RequireAuth>
    ),
  },
]);
