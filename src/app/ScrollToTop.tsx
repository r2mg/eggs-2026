import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Whenever the React Router pathname changes, scroll the window to the top
 * so each route feels like a fresh page.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

  return null;
}
