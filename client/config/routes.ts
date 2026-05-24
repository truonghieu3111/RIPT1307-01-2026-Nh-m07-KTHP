const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    component: '@/pages/login'
  },
  {
    path: '/student',
    component: '@/layouts/AppLayout',
    wrappers: ['@/wrappers/StudentGuard'],
    routes: [
      { path: '', redirect: 'devices' },
      { path: 'devices', component: '@/pages/student/devices' },
      { path: 'borrow', component: '@/pages/student/borrow' },
      { path: 'notifications', component: '@/pages/student/notifications' },
      { path: 'profile', component: '@/pages/student/profile' },
      { path: 'requests', component: '@/pages/student/requests' }
    ]
  },
  {
    path: '/admin',
    component: '@/layouts/AppLayout',
    wrappers: ['@/wrappers/AdminGuard'],
    routes: [
      { path: '', redirect: 'requests' },
      { path: 'requests', component: '@/pages/admin/requests' },
      { path: 'devices', component: '@/pages/admin/devices' },
      { path: 'students', component: '@/pages/admin/students' },
      { path: 'returns', component: '@/pages/admin/returns' },
      { path: 'statistics', component: '@/pages/admin/statistics' }
    ]
  },
  {
    path: '*',
    component: '@/pages/404'
  }
];

export default routes;
