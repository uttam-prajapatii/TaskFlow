import { Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './features/auth/pages/AuthPage.tsx';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="signin" />} />
      <Route path="/register" element={<AuthPage mode="signup" />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
