import { Navigate, Outlet } from '@umijs/max';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/stores/authStore';

export default function AdminGuard() {
  const currentUser = useAuthStore((state) => state.currentUser);

  if (!currentUser) {
    return <Navigate to={ROUTES.login} replace />;
  }

  if (currentUser.role !== 'admin') {
    return <Navigate to={ROUTES.studentDevices} replace />;
  }

  return <Outlet />;
}
