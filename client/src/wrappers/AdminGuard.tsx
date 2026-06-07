import { useEffect } from 'react';
import { Navigate, Outlet } from 'umi';
import { ROUTES } from '@/constants/routes';
import { getMe, isDemoAuthUser } from '@/services/auth';
import { useAuthStore } from '@/stores/authStore';

export default function AdminGuard() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const signIn = useAuthStore((state) => state.signIn);
  const signOut = useAuthStore((state) => state.signOut);

  useEffect(() => {
    if (!currentUser?.token) return;
    if (isDemoAuthUser(currentUser)) return;

    let mounted = true;

    getMe()
      .then((latestUser) => {
        if (!mounted) return;
        signIn({ ...latestUser, token: currentUser.token });
      })
      .catch(() => {
        if (!mounted) return;
        signOut();
      });

    return () => {
      mounted = false;
    };
  }, [currentUser?.id, currentUser?.token, signIn, signOut]);

  if (!currentUser) {
    return <Navigate to={ROUTES.login} replace />;
  }

  if (currentUser.role !== 'admin') {
    return <Navigate to={ROUTES.studentDevices} replace />;
  }

  return <Outlet />;
}
