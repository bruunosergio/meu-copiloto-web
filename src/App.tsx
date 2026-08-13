import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LoginPage } from './features/auth/LoginPage';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { Role } from './domain';
import { UsersPage } from './features/users/UsersPage';
import { DistribuidorasPage } from './features/distribuidoras/DistribuidorasPage';
import { RegisterShortagePage } from './features/shortages/RegisterShortagePage';
import { ShortagesQueuePage } from './features/shortages/ShortagesQueuePage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/faltas" replace />} />
          <Route path="/faltas" element={<ShortagesQueuePage />} />
          <Route path="/faltas/registrar" element={<RegisterShortagePage />} />

          <Route element={<ProtectedRoute allowedRoles={[Role.ADMIN]} />}>
            <Route path="/usuarios" element={<UsersPage />} />
            <Route path="/distribuidoras" element={<DistribuidorasPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
