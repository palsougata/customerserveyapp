import React, { useState, useEffect } from "react";
import { Trash2, ExternalLink, Filter, Search, RefreshCw, Star, Github, CheckCircle2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SurveyRecord {
  id: string;
  contact: string;
  type: string;
  rating: number | null;
  created_at: string;
  completed_at: string | null;
}

export default function AdminPage() {
  const [surveys, setSurveys] = useState<SurveyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "completed" | "pending">("all");
  
  // GitHub Sync State
  const [githubToken, setGithubToken] = useState<string | null>(localStorage.getItem("github_token"));
  const [syncing, setSyncing] = useState(false);
  const [syncUrl, setSyncUrl] = useState<string | null>(null);

  const fetchSurveys = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/surveys");
      const data = await res.json();
      setSurveys(data);
    } catch (err) {
      console.error("Failed to fetch surveys", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurveys();

    // Listen for OAuth message
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GITHUB_AUTH_SUCCESS') {
        const token = event.data.token;
        setGithubToken(token);
        localStorage.setItem("github_token", token);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGithubConnect = async () => {
    try {
      const res = await fetch("/api/auth/github/url");
      const { url } = await res.json();
      window.open(url, 'github_oauth', 'width=600,height=700');
    } catch (err) {
      alert("Failed to get GitHub Auth URL");
    }
  };

  const handleSync = async () => {
    if (!githubToken) return;
    setSyncing(true);
    setSyncUrl(null);
    try {
      const res = await fetch("/api/admin/github/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          token: githubToken, 
          repoName: "surveypulse-poc-" + Math.random().toString(36).substring(7) 
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncUrl(data.url);
      } else {
        alert("Sync failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Something went wrong during sync");
    } finally {
      setSyncing(false);
    }
  };

  const deleteSurvey = async (id: string) => {
// ... existing code ...
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      await fetch("/api/admin/surveys/" + id, { method: "DELETE" });
      setSurveys(surveys.filter(s => s.id !== id));
    } catch (err) {
      alert("Failed to delete");
    }
  };

  const filteredSurveys = surveys.filter(s => {
    const matchesSearch = s.contact.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filter === "all" ? true :
      filter === "completed" ? s.rating !== null :
      s.rating === null;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-end border-b border-[#141414] pb-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-serif italic tracking-tight">Admin Console</h1>
            <p className="text-sm uppercase tracking-widest opacity-50 font-mono">Survey Management System v1.0</p>
          </div>
          <button 
            onClick={fetchSurveys}
            className="flex items-center gap-2 px-4 py-2 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors font-mono text-sm"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            REFRESH_DATA
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={18} />
              <input 
                type="text"
                placeholder="SEARCH_CONTACTS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border border-[#141414] pl-10 pr-4 py-3 focus:outline-none font-mono text-sm"
              />
            </div>
            <div className="flex border border-[#141414]">
              {(["all", "completed", "pending"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 text-xs uppercase tracking-widest font-mono transition-colors ${
                    filter === f ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/10"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center justify-end gap-6 font-mono text-xs uppercase tracking-tighter opacity-70">
              <div>Total: {surveys.length}</div>
              <div>Completed: {surveys.filter(s => s.rating).length}</div>
              <div>Pending: {surveys.filter(s => !s.rating).length}</div>
            </div>
            
            {/* GitHub Integration UI */}
            <div className="flex items-center gap-2">
              {!githubToken ? (
                <button 
                  onClick={handleGithubConnect}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#141414] text-[#E4E3E0] text-[10px] uppercase font-mono tracking-widest hover:opacity-80 transition-opacity"
                >
                  <Github size={12} />
                  Connect GitHub
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 px-3 py-1.5 border border-[#141414] text-[10px] uppercase font-mono tracking-widest hover:bg-[#141414] hover:text-[#E4E3E0] transition-all disabled:opacity-50"
                  >
                    {syncing ? <Loader2 size={12} className="animate-spin" /> : <Github size={12} />}
                    {syncing ? "Syncing..." : "Sync to GitHub"}
                  </button>
                  <button 
                    onClick={() => { setGithubToken(null); localStorage.removeItem("github_token"); }}
                    className="text-[10px] font-mono opacity-30 hover:opacity-100"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {syncUrl && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-emerald-50 border border-emerald-200 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 text-emerald-800 font-mono text-xs">
                <CheckCircle2 size={16} />
                <span>Project successfully synced to GitHub!</span>
              </div>
              <a 
                href={syncUrl} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 px-3 py-1 bg-emerald-800 text-white text-[10px] font-mono uppercase tracking-widest hover:bg-emerald-700 transition-colors"
              >
                View Repository <ExternalLink size={10} />
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="border border-[#141414] bg-white/50 overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_150px_150px_100px] border-b border-[#141414] bg-[#141414] text-[#E4E3E0] px-6 py-3 text-[10px] uppercase tracking-[0.2em] font-mono">
            <div>Contact</div>
            <div>Type</div>
            <div>Created</div>
            <div>Rating</div>
            <div className="text-right">Actions</div>
          </div>

          <div className="divide-y divide-[#141414]">
            {filteredSurveys.length > 0 ? (
              filteredSurveys.map((survey) => (
                <motion.div 
                  layout
                  key={survey.id}
                  className="grid grid-cols-[1fr_100px_150px_150px_100px] items-center px-6 py-4 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors group cursor-default"
                >
                  <div className="font-medium truncate pr-4">{survey.contact}</div>
                  <div className="font-mono text-xs opacity-60 group-hover:opacity-100 uppercase">{survey.type}</div>
                  <div className="font-mono text-[10px] opacity-60 group-hover:opacity-100">
                    {new Date(survey.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    {survey.rating ? (
                      <div className="flex items-center gap-1 text-amber-500 group-hover:text-amber-400">
                        <span className="font-mono font-bold">{survey.rating}</span>
                        <Star size={12} fill="currentColor" />
                      </div>
                    ) : (
                      <span className="text-[10px] uppercase tracking-widest opacity-30 font-mono">Pending</span>
                    )}
                  </div>
                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={() => window.open(`/survey/${survey.id}`, "_blank")}
                      className="opacity-30 hover:opacity-100 transition-opacity"
                      title="View Survey Link"
                    >
                      <ExternalLink size={16} />
                    </button>
                    <button 
                      onClick={() => deleteSurvey(survey.id)}
                      className="opacity-30 hover:opacity-100 text-red-500 hover:text-red-400 transition-opacity"
                      title="Delete Record"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-12 text-center font-mono opacity-30 text-sm italic uppercase tracking-widest">
                No records found matching criteria
              </div>
            )}
          </div>
        </div>

        <footer className="flex justify-between items-center pt-8 border-t border-[#141414]/20">
          <div className="text-[10px] font-mono uppercase tracking-widest opacity-40">
            System Status: Operational // {new Date().toLocaleTimeString()}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-widest opacity-40">
            © 2024 SurveyPulse Analytics
          </div>
        </footer>
      </div>
    </div>
  );
}
