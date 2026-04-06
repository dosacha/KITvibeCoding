const API_BASE_URL =
  (typeof window !== "undefined" && window.__UNITFLOW_API_BASE_URL__) ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let message = `요청 처리에 실패했어. (${response.status})`;
    try {
      const payload = await response.json();
      if (payload?.detail) message = payload.detail;
    } catch {
      const text = await response.text();
      if (text) message = text;
    }
    throw new Error(message);
  }

  return response.json();
}

export const apiClient = {
  login: async (payload) => {
    const response = await request("/auth/login", { method: "POST", body: payload });
    return {
      accessToken: response.access_token,
      user: {
        id: response.user.id,
        name: response.user.full_name,
        email: response.user.email,
        role: response.user.role,
      },
    };
  },
  me: async (token) => {
    const response = await request("/auth/me", { token });
    return {
      user: {
        id: response.user.id,
        name: response.user.full_name,
        email: response.user.email,
        role: response.user.role,
      },
    };
  },
  getInstructorDashboard: (token) => request("/frontend/dashboard/instructor", { token }),
  getStudentDashboard: (token) => request("/frontend/dashboard/student", { token }),
  getStudents: (token) => request("/frontend/students", { token }),
  getStudentDetail: (token, studentId) => request(`/frontend/students/${studentId}`, { token }),
  getExams: (token) => request("/frontend/exams", { token }),
  getExamCatalog: (token) => request("/exams", { token }),
  createExam: (token, payload) => request("/frontend/exams", { method: "POST", token, body: payload }),
  updateExam: (token, examId, payload) => request(`/exams/${examId}`, { method: "PUT", token, body: payload }),
  getExamQuestions: (token, examId) => request(`/exams/${examId}/questions`, { token }),
  createQuestion: (token, payload) => request("/questions", { method: "POST", token, body: payload }),
  updateQuestion: (token, questionId, payload) => request(`/questions/${questionId}`, { method: "PUT", token, body: payload }),
  getMetadata: (token) => request("/frontend/metadata", { token }),
  getSubjectUnits: (token, subjectId) => request(`/subjects/${subjectId}/units`, { token }),
  getStudentResults: (token, studentProfileId) => request(`/students/${studentProfileId}/results`, { token }),
  saveStudentResult: (token, payload) => request("/student-results", { method: "POST", token, body: payload }),
  recalculateStudent: (token, studentProfileId) =>
    request(`/students/${studentProfileId}/recalculate`, { method: "POST", token }),
  getUniversities: (token) => request("/universities/policies", { token }),
  createUniversityPolicy: (token, payload) =>
    request("/universities/policies", { method: "POST", token, body: payload }),
  updateUniversityPolicy: (token, policyId, payload) =>
    request(`/universities/policies/${policyId}`, { method: "PUT", token, body: payload }),
};
