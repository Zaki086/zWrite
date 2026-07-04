import { lazy, Suspense, useEffect, Component, type ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, error: err.message + '\n' + (err.stack || '') };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-background p-8">
          <div className="max-w-2xl">
            <h1 className="text-destructive font-bold text-lg mb-2">Something went wrong</h1>
            <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-[60vh] whitespace-pre-wrap">{this.state.error}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const EditorPage = lazy(() => import('@/pages/EditorPage'));

function Toaster() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          className={`
            flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm cursor-pointer
            animate-fade-in transition-all hover:shadow-xl
            ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200' : ''}
            ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200' : ''}
            ${toast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200' : ''}
            ${toast.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200' : ''}
          `}
        >
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

function ThemeInit() {
  useEffect(() => {
    const theme = useUIStore.getState().theme;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);
  return null;
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <ThemeInit />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/doc/:docId" element={<ErrorBoundary><EditorPage /></ErrorBoundary>} />
          <Route path="/doc/new" element={<ErrorBoundary><EditorPage /></ErrorBoundary>} />
          <Route path="/template/:templateId" element={<ErrorBoundary><EditorPage /></ErrorBoundary>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Toaster />
    </HashRouter>
  );
}
