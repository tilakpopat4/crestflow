import React, { useState, useMemo } from 'react';
import {
  Compass,
  Search,
  ExternalLink,
  Copy,
  Check,
  FileCode,
} from 'lucide-react';
import { SITEMAP_PAGES, PageCategory } from './sitemapData';

/**
 * AdminSitemapManager renders a complete live directory of all pages and routes
 * connected to the CrestFlow portal.
 */
export const AdminSitemapManager: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | PageCategory>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';

  const filteredPages = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SITEMAP_PAGES.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.path.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.accessLevel.toLowerCase().includes(q)
      );
    });
  }, [search, selectedCategory]);

  const copyUrl = async (samplePath: string, id: string) => {
    const fullUrl = `${origin}${samplePath}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = fullUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const counts = useMemo(
    () => ({
      all: SITEMAP_PAGES.length,
      public: SITEMAP_PAGES.filter((p) => p.category === 'public').length,
      client: SITEMAP_PAGES.filter((p) => p.category === 'client').length,
      workspace: SITEMAP_PAGES.filter((p) => p.category === 'workspace').length,
      admin: SITEMAP_PAGES.filter((p) => p.category === 'admin').length,
    }),
    []
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-2xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Compass size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Portal Sitemap &amp; Connected Pages
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Live registry of every route, public portal, client intake channel, and workspace tab.
              </p>
            </div>
          </div>

          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <FileCode size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span>View XML Sitemap</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 space-y-1 shadow-2xs border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Connected Pages
          </div>
          <div className="text-2xl font-bold">{counts.all}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 space-y-1 shadow-2xs border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Public &amp; Legal
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{counts.public}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 space-y-1 shadow-2xs border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Public Portals &amp; Intake
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{counts.client}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 space-y-1 shadow-2xs border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Workspace Tabs
          </div>
          <div className="text-2xl font-bold">{counts.workspace}</div>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search pages by name, path, or access level..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-indigo-600 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
          {[
            { id: 'all', label: `All (${counts.all})` },
            { id: 'public', label: `Public (${counts.public})` },
            { id: 'client', label: `Client & Portals (${counts.client})` },
            { id: 'workspace', label: `Workspace (${counts.workspace})` },
            { id: 'admin', label: `Admin (${counts.admin})` },
          ].map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pages Table / Card Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredPages.map((page) => {
            const isCopied = copiedId === page.id;
            const fullUrl = `${origin}${page.samplePath}`;
            return (
              <div
                key={page.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      {page.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${
                        page.category === 'public'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          : page.category === 'client'
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                          : page.category === 'workspace'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          : 'bg-slate-900 text-white dark:bg-slate-700'
                      }`}
                    >
                      {page.accessLevel}
                    </span>
                    {page.inXmlSitemap && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        (sitemap.xml)
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {page.description}
                  </p>

                  <div className="flex items-center gap-2 text-xs font-mono text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {page.path}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="text-slate-500 truncate">{fullUrl}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                  <button
                    type="button"
                    onClick={() => copyUrl(page.samplePath, page.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer border-0"
                    title="Copy full URL"
                  >
                    {isCopied ? <Check size={13} className="text-indigo-600" /> : <Copy size={13} />}
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <a
                    href={page.samplePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                    title="Open page in new tab"
                  >
                    <span>Open</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminSitemapManager;
