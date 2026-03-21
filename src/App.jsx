import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'

// Layout
import Layout from './components/Layout'

// Public
import Login from './pages/Login'
import NotFound from './pages/NotFound'

// Admin
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminCourses from './pages/admin/AdminCourses'
import { AdminForum, AdminCertificates, AdminReports, AdminSettings } from './pages/admin/AdminOther'

// Teacher
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import { TeacherCourses, TeacherCourseEditor } from './pages/teacher/TeacherCourses'
import { TeacherQuiz, TeacherStudents, TeacherForum, TeacherProfile } from './pages/teacher/TeacherOther'

// Student
import { StudentDashboard, StudentCatalog } from './pages/student/StudentDashboard'
import { StudentCourseDetail, StudentCourseReader } from './pages/student/StudentCourse'
import StudentQuiz from './pages/student/StudentQuiz'
import { StudentMyCourses, StudentProgress, StudentBadges, StudentForum, StudentProfile } from './pages/student/StudentOther'

//  Guards 
function RequireAuth({ children, role }) {
  const { state } = useApp()
  const { user } = state
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) {
    const home = user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/student'
    return <Navigate to={home} replace />
  }
  return children
}

function RedirectIfLoggedIn({ children }) {
  const { state } = useApp()
  const { user } = state
  if (user) {
    const home = user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/student'
    return <Navigate to={home} replace />
  }
  return children
}
// App Routes
function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<RedirectIfLoggedIn><Login /></RedirectIfLoggedIn>} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Admin */}
      <Route path="/admin" element={<RequireAuth role="admin"><Layout /></RequireAuth>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="courses" element={<AdminCourses />} />
        <Route path="forum" element={<AdminForum />} />
        <Route path="certificates" element={<AdminCertificates />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Teacher */}
      <Route path="/teacher" element={<RequireAuth role="teacher"><Layout /></RequireAuth>}>
        <Route index element={<TeacherDashboard />} />
        <Route path="courses" element={<TeacherCourses />} />
        <Route path="courses/:id" element={<TeacherCourseEditor />} />
        <Route path="quiz/:courseId" element={<TeacherQuiz />} />
        <Route path="students" element={<TeacherStudents />} />
        <Route path="forum" element={<TeacherForum />} />
        <Route path="profile" element={<TeacherProfile />} />
      </Route>

      {/* Student */}
      <Route path="/student" element={<RequireAuth role="student"><Layout /></RequireAuth>}>
        <Route index element={<StudentDashboard />} />
        <Route path="catalog" element={<StudentCatalog />} />
        <Route path="courses" element={<StudentMyCourses />} />
        <Route path="course/:id" element={<StudentCourseDetail />} />
        <Route path="learn/:id" element={<StudentCourseReader />} />
        <Route path="quiz/:courseId" element={<StudentQuiz />} />
        <Route path="progress" element={<StudentProgress />} />
        <Route path="badges" element={<StudentBadges />} />
        <Route path="forum" element={<StudentForum />} />
        <Route path="profile" element={<StudentProfile />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  )
}
