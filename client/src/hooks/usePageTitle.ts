import { useEffect } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | Quản lý mượn đồ dùng`;
  }, [title]);
}
