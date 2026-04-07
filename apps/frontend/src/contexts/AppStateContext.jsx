import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AppStateContext = createContext(null);

function defaultPageForRole(role) {
  return role === "student" ? "student-dashboard" : "instructor-dashboard";
}

function defaultPathForRole(role) {
  return role === "student" ? "/student" : "/dashboard";
}

function parseLocation(role) {
  const path = window.location.pathname;

  if (role === "student") {
    return {
      currentPage: "student-dashboard",
      selectedStudentId: null,
    };
  }

  if (path.startsWith("/students/")) {
    const studentId = decodeURIComponent(path.replace("/students/", "").trim());
    return {
      currentPage: "student-detail",
      selectedStudentId: studentId || null,
    };
  }

  if (path === "/students") {
    return { currentPage: "students", selectedStudentId: null };
  }

  if (path === "/exams") {
    return { currentPage: "exams", selectedStudentId: null };
  }

  if (path === "/universities") {
    return { currentPage: "universities", selectedStudentId: null };
  }

  return { currentPage: "instructor-dashboard", selectedStudentId: null };
}

function buildPath(page, studentId, role) {
  if (role === "student") return defaultPathForRole(role);

  switch (page) {
    case "students":
      return "/students";
    case "student-detail":
      return studentId ? `/students/${encodeURIComponent(studentId)}` : "/students";
    case "exams":
      return "/exams";
    case "universities":
      return "/universities";
    case "instructor-dashboard":
    default:
      return "/dashboard";
  }
}

export function AppStateProvider({ role, children }) {
  const initialState = useMemo(() => parseLocation(role), [role]);
  const [currentPage, setCurrentPage] = useState(initialState.currentPage);
  const [selectedStudentId, setSelectedStudentId] = useState(initialState.selectedStudentId);

  useEffect(() => {
    const nextState = parseLocation(role);
    setCurrentPage(nextState.currentPage || defaultPageForRole(role));
    setSelectedStudentId(nextState.selectedStudentId);
  }, [role]);

  useEffect(() => {
    function handlePopState() {
      const nextState = parseLocation(role);
      setCurrentPage(nextState.currentPage || defaultPageForRole(role));
      setSelectedStudentId(nextState.selectedStudentId);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [role]);

  function navigateTo(page, studentId = null) {
    const nextPath = buildPath(page, studentId, role);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
    setCurrentPage(page);
    setSelectedStudentId(studentId);
  }

  const value = useMemo(
    () => ({
      currentPage,
      selectedStudentId,
      openPage(page) {
        navigateTo(page, null);
      },
      openStudentDetail(studentId) {
        navigateTo("student-detail", studentId);
      },
    }),
    [currentPage, selectedStudentId, role],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error("AppStateProvider 안에서만 사용할 수 있어.");
  return context;
}
