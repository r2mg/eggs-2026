/**
 * App entry (`src/main.tsx`)
 * ==========================
 *
 * **Routing entry point:** `BrowserRouter` (from react-router-dom) wraps the whole app
 * so `<Link>`, `<NavLink>`, `useParams()`, etc. work. The actual URL → screen mapping
 * (which path shows which page) lives in `src/app/App.tsx` inside `<Routes>`.
 */
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app/App.tsx';
import ScrollToTop from './app/ScrollToTop.tsx';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    {/* Runs on every route change so new pages start at the top */}
    <ScrollToTop />
    <App />
  </BrowserRouter>,
);
