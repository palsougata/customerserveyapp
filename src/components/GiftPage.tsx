import React from "react";
import { Gift, ExternalLink, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

const OFFERS = [
  {
    id: 1,
    title: "350 Free Spins",
    category: "Casino Bonus",
    description: "Exclusive offer for new players at our partner casino.",
    cta: "Claim Spins",
    color: "bg-indigo-600",
    icon: <Gift className="text-white" />,
  },
  {
    id: 2,
    title: "Insurance Quote",
    category: "Savings",
    description: "Compare rates and save up to $500 on your annual premium.",
    cta: "Get Quote",
    color: "bg-emerald-600",
    icon: <ExternalLink className="text-white" />,
  },
  {
    id: 3,
    title: "Free Assessment",
    category: "Consultation",
    description: "Book a 15-minute call with our expert advisors.",
    cta: "Book Now",
    color: "bg-amber-600",
    icon: <CheckCircle2 className="text-white" />,
  },
];

export default function GiftPage() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="text-center space-y-4 pt-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full mb-4"
          >
            <CheckCircle2 className="text-emerald-600" size={40} />
          </motion.div>
          <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">Thank You!</h1>
          <p className="text-zinc-500 text-xl max-w-lg mx-auto">
            Your feedback helps us improve. As promised, please select your free gift below.
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          {OFFERS.map((offer, index) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-3xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col"
            >
              <div className={`p-6 ${offer.color} flex items-center justify-center`}>
                {offer.icon}
              </div>
              <div className="p-8 flex-1 flex flex-col space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                    {offer.category}
                  </span>
                  <h3 className="text-2xl font-bold text-zinc-900 leading-tight">
                    {offer.title}
                  </h3>
                </div>
                <p className="text-zinc-500 text-sm leading-relaxed flex-1">
                  {offer.description}
                </p>
                <button
                  onClick={() => window.open("https://example.com/affiliate", "_blank")}
                  className="w-full py-4 rounded-xl font-bold text-white bg-zinc-900 hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
                >
                  {offer.cta}
                  <ExternalLink size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <footer className="text-center py-12 border-t border-zinc-200">
          <p className="text-zinc-400 text-sm italic">
            Offers are subject to terms and conditions. Redirecting to partner site.
          </p>
        </footer>
      </div>
    </div>
  );
}
