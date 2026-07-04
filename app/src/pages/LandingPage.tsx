import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText, Plus, Receipt, FileBarChart,
  MoreVertical, Copy, Trash2, Search, Moon, Sun, Monitor,
  Clock, Type, PenLine, Briefcase,
} from 'lucide-react';
import { useDocumentStore } from '@/stores/documentStore';
import { useUIStore } from '@/stores/uiStore';
import { getRecentDocuments, deleteDocument, duplicateDocument } from '@/utils/indexedDB';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/* ------------------------------------------------------------------ */
/*  Landing Page                                                       */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const navigate = useNavigate();
  const recentDocs = useDocumentStore((s) => s.recentDocuments);
  const setRecentDocuments = useDocumentStore((s) => s.setRecentDocuments);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const addToast = useUIStore((s) => s.addToast);

  const [searchQuery, setSearchQuery] = useState('');
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const docs = await getRecentDocuments(20);
      setRecentDocuments(docs);
      setIsLoaded(true);
    }
    load();
  }, [setRecentDocuments]);

  const handleNewDocument = useCallback(() => navigate('/doc/new'), [navigate]);
  const handleOpenDocument = useCallback((id: string) => navigate(`/doc/${id}`), [navigate]);

  const handleDeleteDocument = useCallback(async (id: string) => {
    await deleteDocument(id);
    setRecentDocuments(recentDocs.filter((d) => d.id !== id));
    setDocToDelete(null);
    addToast({ message: 'Document deleted', type: 'success' });
  }, [recentDocs, setRecentDocuments, addToast]);

  const handleDuplicateDocument = useCallback(async (id: string) => {
    const newDoc = await duplicateDocument(id);
    if (newDoc) {
      const docs = await getRecentDocuments(20);
      setRecentDocuments(docs);
      addToast({ message: 'Document duplicated', type: 'success' });
    }
  }, [setRecentDocuments, addToast]);

  const handleDeleteAll = useCallback(async () => {
    for (const doc of recentDocs) await deleteDocument(doc.id);
    setRecentDocuments([]);
    addToast({ message: 'All documents deleted', type: 'success' });
  }, [recentDocs, setRecentDocuments, addToast]);

  const cycleTheme = useCallback(() => {
    const order: Array<'dark' | 'light' | 'system'> = ['dark', 'light', 'system'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
    if (next === 'dark') document.documentElement.classList.add('dark');
    else if (next === 'light') document.documentElement.classList.remove('dark');
    else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches)
        document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
  }, [theme, setTheme]);

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const filteredDocs = recentDocs.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ---- Top Nav ---- */}
      <nav className="flex items-center justify-between px-6 lg:px-10 h-16 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <PenLine className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold tracking-tight font-heading">zWrite</span>
        </div>
        <button
          onClick={cycleTheme}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent/80 text-muted-foreground transition-colors"
          aria-label="Toggle theme"
          type="button"
        >
          <ThemeIcon className="w-4 h-4" />
        </button>
      </nav>

      {/* ---- Main ---- */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 lg:px-10 py-12">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-14"
        >
          <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight font-heading leading-[1.1] mb-4">
            Write without
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              distractions
            </span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-lg">
            A professional document editor with powerful formatting, templates,
            and seamless export. Everything stays on your device.
          </p>
        </motion.section>

        {/* Entry points */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="mb-16"
        >
          {/* Primary action — distinct visual weight */}
          <div className="mb-5">
            <button
              onClick={handleNewDocument}
              className="group relative flex items-center gap-4 w-full sm:w-auto px-7 py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
              type="button"
            >
              <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                <Plus className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <div className="text-lg font-semibold leading-tight">New Document</div>
                <div className="text-sm text-indigo-100/80 mt-0.5">Start writing from scratch</div>
              </div>
            </button>
          </div>

          {/* Template cards — editorial, preview-style */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <TemplateCard
              icon={<Briefcase className="w-5 h-5" />}
              label="Resume"
              description="Professional CV with experience, education & skills sections"
              onClick={() => navigate('/template/resume')}
              preview={<ResumePreview />}
              accent="from-emerald-500/10 to-teal-500/10"
              iconColor="text-emerald-500"
            />
            <TemplateCard
              icon={<Receipt className="w-5 h-5" />}
              label="Invoice"
              description="Business invoice with itemized billing and totals"
              onClick={() => navigate('/template/invoice')}
              preview={<InvoicePreview />}
              accent="from-amber-500/10 to-orange-500/10"
              iconColor="text-amber-500"
            />
            <TemplateCard
              icon={<FileBarChart className="w-5 h-5" />}
              label="Report"
              description="Formal report with summary, tables & analysis"
              onClick={() => navigate('/template/report')}
              preview={<ReportPreview />}
              accent="from-sky-500/10 to-blue-500/10"
              iconColor="text-sky-500"
            />
          </div>
        </motion.section>

        {/* Recent Documents */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold font-heading tracking-tight">Recent Documents</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {recentDocs.length} document{recentDocs.length !== 1 ? 's' : ''} saved locally
              </p>
            </div>
            {recentDocs.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded hover:bg-destructive/5"
                type="button"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Search */}
          {recentDocs.length > 3 && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="w-full h-10 pl-10 pr-4 text-sm bg-card border border-border/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/30 transition-shadow"
              />
            </div>
          )}

          {isLoaded && filteredDocs.length === 0 ? (
            <EmptyState hasSearch={!!searchQuery} />
          ) : (
            <div className="space-y-1.5">
              {filteredDocs.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  className="group flex items-center gap-3.5 p-3 rounded-xl border border-border/60 bg-card/40 hover:bg-card hover:border-border hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => handleOpenDocument(doc.id)}
                >
                  {/* Doc icon with subtle color */}
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center flex-shrink-0 border border-border/40">
                    <Type className="w-4 h-4 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold truncate">{doc.title}</h3>
                    <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-0.5">
                      <span>{doc.wordCount.toLocaleString()} words</span>
                      <span className="w-px h-3 bg-border" />
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(doc.updatedAt)}
                      </span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <button
                        className="w-8 h-8 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-accent transition-all"
                        aria-label="More options"
                        type="button"
                      >
                        <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDuplicateDocument(doc.id)}>
                        <Copy className="w-3.5 h-3.5 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDocToDelete(doc.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 px-6 lg:px-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <span>zWrite — documents stay on your device</span>
          <span>IndexedDB · Offline · Private</span>
        </div>
      </footer>

      {/* Delete Confirmation */}
      <AlertDialog open={!!docToDelete} onOpenChange={() => setDocToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The document will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => docToDelete && handleDeleteDocument(docToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function TemplateCard({
  icon, label, description, onClick, preview, accent, iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  preview: React.ReactNode;
  accent: string;
  iconColor: string;
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group flex flex-col rounded-2xl border border-border/60 bg-gradient-to-br ${accent} hover:border-border hover:shadow-md transition-all duration-200 text-left overflow-hidden`}
      type="button"
    >
      {/* Mini preview area */}
      <div className="h-24 bg-white/50 dark:bg-white/[0.03] border-b border-border/30 flex items-center justify-center p-4 relative overflow-hidden">
        {preview}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className={`${iconColor}`}>{icon}</span>
          <h3 className="text-sm font-semibold">{label}</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </motion.button>
  );
}

/* Mini SVG previews for each template */
function ResumePreview() {
  return (
    <svg width="80" height="60" viewBox="0 0 80 60" fill="none" className="opacity-60">
      <rect x="20" y="6" width="40" height="4" rx="2" fill="currentColor" className="text-foreground" />
      <rect x="28" y="14" width="24" height="2.5" rx="1.25" fill="currentColor" className="text-muted-foreground" />
      <rect x="10" y="24" width="20" height="2" rx="1" fill="currentColor" className="text-foreground" />
      <rect x="10" y="29" width="60" height="1.5" rx="0.75" fill="currentColor" className="text-muted-foreground" />
      <rect x="10" y="33" width="55" height="1.5" rx="0.75" fill="currentColor" className="text-muted-foreground" />
      <rect x="10" y="40" width="18" height="2" rx="1" fill="currentColor" className="text-foreground" />
      <rect x="10" y="45" width="60" height="1.5" rx="0.75" fill="currentColor" className="text-muted-foreground" />
      <rect x="10" y="49" width="40" height="1.5" rx="0.75" fill="currentColor" className="text-muted-foreground" />
    </svg>
  );
}

function InvoicePreview() {
  return (
    <svg width="80" height="60" viewBox="0 0 80 60" fill="none" className="opacity-60">
      <rect x="10" y="6" width="25" height="3" rx="1.5" fill="currentColor" className="text-foreground" />
      <rect x="55" y="6" width="15" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground" />
      <rect x="10" y="16" width="60" height="1" rx="0.5" fill="currentColor" className="text-border" />
      <rect x="10" y="22" width="35" height="1.5" rx="0.75" fill="currentColor" className="text-muted-foreground" />
      <rect x="10" y="26" width="30" height="1.5" rx="0.75" fill="currentColor" className="text-muted-foreground" />
      <rect x="10" y="34" width="60" height="1" rx="0.5" fill="currentColor" className="text-border" />
      <rect x="10" y="38" width="25" height="1.5" rx="0.75" fill="currentColor" className="text-muted-foreground" />
      <rect x="50" y="38" width="20" height="1.5" rx="0.75" fill="currentColor" className="text-foreground" />
      <rect x="10" y="42" width="25" height="1.5" rx="0.75" fill="currentColor" className="text-muted-foreground" />
      <rect x="55" y="42" width="15" height="1.5" rx="0.75" fill="currentColor" className="text-foreground" />
      <rect x="10" y="50" width="60" height="1" rx="0.5" fill="currentColor" className="text-border" />
      <rect x="50" y="53" width="20" height="2.5" rx="1.25" fill="currentColor" className="text-foreground" />
    </svg>
  );
}

function ReportPreview() {
  return (
    <svg width="80" height="60" viewBox="0 0 80 60" fill="none" className="opacity-60">
      <rect x="15" y="5" width="50" height="3.5" rx="1.75" fill="currentColor" className="text-foreground" />
      <rect x="20" y="12" width="40" height="2" rx="1" fill="currentColor" className="text-muted-foreground" />
      <rect x="10" y="20" width="60" height="1" rx="0.5" fill="currentColor" className="text-border" />
      <rect x="10" y="25" width="18" height="2" rx="1" fill="currentColor" className="text-foreground" />
      <rect x="10" y="30" width="60" height="1.5" rx="0.75" fill="currentColor" className="text-muted-foreground" />
      <rect x="10" y="34" width="50" height="1.5" rx="0.75" fill="currentColor" className="text-muted-foreground" />
      <rect x="10" y="40" width="60" height="8" rx="2" fill="currentColor" className="text-muted-foreground/20" />
      <rect x="12" y="42" width="15" height="4" rx="1" fill="currentColor" className="text-sky-400/60" />
      <rect x="30" y="44" width="20" height="4" rx="1" fill="currentColor" className="text-sky-400/40" />
      <rect x="55" y="41" width="12" height="7" rx="1" fill="currentColor" className="text-sky-400/50" />
    </svg>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
        <FileText className="w-7 h-7 opacity-30" />
      </div>
      <p className="text-sm font-medium">
        {hasSearch ? 'No documents match your search' : 'No documents yet'}
      </p>
      {!hasSearch && (
        <p className="text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
          Create a new document or choose a template above to get started. Everything saves automatically.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Utilities                                                          */
/* ------------------------------------------------------------------ */

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
