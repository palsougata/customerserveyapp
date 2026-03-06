import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Star, Loader2 } from "lucide-react";
import { motion } from "motion/react";

export default function SurveyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        const res = await fetch(`/api/surveys/${id}`);
        if (!res.ok) throw new Error("Survey not found");
        const data = await res.json();
        if (data.rating) {
          setError("This survey has already been completed.");
        }
      } catch (err) {
        setError("Invalid or expired survey link.");
      } finally {
        setLoading(false);
      }
    };
    fetchSurvey();
  }, [id]);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/surveys/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      if (res.ok) {
        navigate("/gift");
      } else {
        alert("Failed to submit rating");
      }
    } catch (err) {
      alert("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="animate-spin text-zinc-400" size={40} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-zinc-200 text-center space-y-4">
          <h2 className="text-xl font-semibold text-zinc-900">Oops!</h2>
          <p className="text-zinc-500">{error}</p>
          <button
            onClick={() => navigate("/gift")}
            className="w-full bg-zinc-900 text-white py-3 rounded-xl font-medium"
          >
            Go to Offers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border border-zinc-100 space-y-10 text-center"
      >
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Quick Feedback</h1>
          <p className="text-zinc-500 text-lg">How would you rate your call today?</p>
        </header>

        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
              className="transition-transform active:scale-90"
            >
              <Star
                size={48}
                className={`transition-colors duration-200 ${
                  star <= (hoverRating || rating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-zinc-200"
                }`}
              />
            </button>
          ))}
        </div>

        <div className="space-y-6">
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="w-full bg-zinc-900 text-white py-5 rounded-2xl font-semibold text-lg hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-zinc-200"
          >
            {submitting ? "Submitting..." : "Submit Rating"}
          </button>
          
          <p className="text-xs text-zinc-400 uppercase tracking-widest font-medium">
            Complete to unlock your free gift
          </p>
        </div>
      </motion.div>
    </div>
  );
}
