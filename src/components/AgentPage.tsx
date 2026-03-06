import React, { useState, useEffect } from "react";
import { Send, Phone, Mail, BarChart3 } from "lucide-react";

export default function AgentPage() {
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastLink, setLastLink] = useState("");
  const [stats, setStats] = useState({ total: 0, avgRating: 0 });

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const sendSurvey = async (type: "sms" | "email") => {
    if (!contact) return;
    setLoading(true);
    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact, type }),
      });
      const data = await res.json();
      setLastLink(data.link);
      setContact("");
      fetchStats();
    } catch (err) {
      alert("Failed to send survey");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="flex justify-between items-end border-b border-zinc-200 pb-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Agent Dashboard</h1>
            <p className="text-zinc-500 text-sm italic">Post-Call Survey System POC</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-zinc-600">
              <BarChart3 size={16} />
              <span className="text-sm font-medium">Avg Rating: {stats.avgRating?.toFixed(1) || "0.0"}</span>
            </div>
            <p className="text-xs text-zinc-400 uppercase tracking-widest">{stats.total} Surveys Completed</p>
          </div>
        </header>

        <main className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Customer Contact</label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Enter phone number or email..."
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => sendSurvey("sms")}
              disabled={loading || !contact}
              className="flex items-center justify-center gap-2 bg-zinc-900 text-white py-4 rounded-xl font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Phone size={18} />
              Send SMS
            </button>
            <button
              onClick={() => sendSurvey("email")}
              disabled={loading || !contact}
              className="flex items-center justify-center gap-2 bg-white text-zinc-900 border border-zinc-900 py-4 rounded-xl font-medium hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mail size={18} />
              Send Email
            </button>
          </div>

          {lastLink && (
            <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
              <p className="text-emerald-800 text-sm font-medium flex items-center gap-2">
                <Send size={14} /> Survey Sent Successfully!
              </p>
              <p className="text-emerald-600 text-xs mt-1 break-all font-mono">
                Link: {lastLink}
              </p>
            </div>
          )}
        </main>

        <footer className="text-center space-y-4">
          <p className="text-zinc-400 text-xs uppercase tracking-[0.2em]">Internal Use Only • Phase 1 POC</p>
          <div className="pt-4 border-t border-zinc-100">
            <a 
              href="/admin" 
              className="text-xs font-mono text-zinc-300 hover:text-zinc-600 transition-colors uppercase tracking-widest"
            >
              Access Admin Console
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
