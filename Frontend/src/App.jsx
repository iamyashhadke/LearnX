import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
import RoleBasedRoute from './components/RoleBasedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentLearning from './pages/StudentLearning';
import StudentTest from './pages/StudentTest';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Role-based dashboard routes */}
          <Route
            path="/dashboard/student"
            element={
              <RoleBasedRoute allowedRole="student">
                <StudentDashboard />
              </RoleBasedRoute>
            }
          />
          <Route
            path="/dashboard/teacher"
            element={
              <RoleBasedRoute allowedRole="teacher">
                <TeacherDashboard />
              </RoleBasedRoute>
            }
          />

          {/* Student-specific routes */}
          <Route
            path="/student/learning"
            element={
              <RoleBasedRoute allowedRole="student">
                <StudentLearning />
              </RoleBasedRoute>
            }
          />
          <Route
            path="/student/test"
            element={
              <RoleBasedRoute allowedRole="student">
                <StudentTest />
              </RoleBasedRoute>
            }
          />

          {/* Fallback for old /dashboard route */}
          <Route path="/dashboard" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
