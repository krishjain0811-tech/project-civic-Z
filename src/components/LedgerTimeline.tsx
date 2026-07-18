import React, { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, Key, Calendar, RefreshCw, Layers } from "lucide-react";
import { PointLedger } from "../types";
import { motion } from "motion/react";

interface LedgerTimelineProps {
  userId: string;
  transactions: PointLedger[];
  onRefreshTrigger?: () => void;
}

interface VerificationReport {
  verified: boolean;
  corruptedIndex: number;
  count: number;
  reports: {
    id: string;
    amount: number;
    type: string;
    description: string;
    prevHashValid: boolean;
    selfHashValid: boolean;
    isValid: boolean;
    timestamp: string;
  }[];
}

export function LedgerTimeline({ userId, transactions, onRefreshTrigger }: LedgerTimelineProps) {
  const [verification, setVerification] = useState<VerificationReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchLedgerVerification = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ledger/verify/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setVerification(data);
      }
    } catch (err) {
      console.error("Failed to fetch ledger validation report", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchLedgerVerification();
    }
  }, [userId, transactions]);

  const handleManualScan = () => {
    if (onRefreshTrigger) onRefreshTrigger();
    fetchLedgerVerification();
  };

  return (
    <div className="bg-[#1A1D23] border border-white/5 rounded-3xl p-5 shadow-2xl relative overflow-hidden" id="ledger-timeline-container">
      {/* Background terminal matrix feel */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
        <div>
          <h3 className="text-lg font-bold font-display text-slate-100 flex items-center gap-2">
            <Layers className="text-orange-400" size={18} />
            Cryptographic Point Ledger
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Zero-Trust immutable ledger chain. Every block is signed with SHA-256 hash chains.
          </p>
        </div>

        <button
          onClick={handleManualScan}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-orange-500/20 hover:border-orange-500 bg-orange-500/10 text-orange-400 hover:text-orange-300 text-xs font-semibold font-mono transition-all disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {loading ? "Re-verifying Chain..." : "Run Ledger Integrity Scan"}
        </button>
      </div>

      {/* Chain Status Summary */}
      {verification && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl mb-6 border flex items-center justify-between ${
            verification.verified
              ? "bg-emerald-500/5 border-emerald-500/15 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.02)]"
              : "bg-rose-500/5 border-rose-500/15 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.02)]"
          }`}
        >
          <div className="flex items-center gap-3">
            {verification.verified ? (
              <ShieldCheck className="text-emerald-400 w-8 h-8 shrink-0" />
            ) : (
              <ShieldAlert className="text-rose-400 w-8 h-8 shrink-0" />
            )}
            <div>
              <p className="text-sm font-bold uppercase tracking-wider font-mono">
                {verification.verified ? "Ledger Verified: Secure" : "Ledger Compromised"}
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                {verification.verified
                  ? `${verification.count} block(s) structurally scanned. Previous hash linkages 100% verified.`
                  : `Block index #${verification.corruptedIndex} failed signature verification!`}
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-[#0A0A0B] border border-white/5 px-2 py-1 rounded font-mono font-bold uppercase">
            {verification.verified ? "Immutable" : "Broken Link"}
          </span>
        </motion.div>
      )}

      {/* Ledger Block List */}
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {transactions.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8 italic font-mono">
            Zero ledger activities found for this ID. Complete civic drives to mint points.
          </p>
        ) : (
          transactions.map((tx, idx) => {
            const report = verification?.reports?.find(r => r.id === tx.id);
            const blockNum = transactions.length - idx;
            const isEarned = tx.amount > 0;

            return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className={`bg-[#0A0A0B]/40 border p-4 rounded-2xl relative ${
                  report ? (report.isValid ? "border-white/5" : "border-rose-500/40") : "border-white/5"
                }`}
                id={`ledger-block-${tx.id}`}
              >
                {/* Block header badge */}
                <div className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded bg-[#0A0A0B] text-slate-400 border border-white/5 font-mono">
                  BLOCK #{blockNum}
                </div>

                <div className="flex items-start gap-3">
                  <div className={`mt-1 font-mono font-bold text-sm px-2.5 py-1 rounded-lg shrink-0 ${
                    isEarned 
                      ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" 
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}>
                    {isEarned ? `+${tx.amount}` : `${tx.amount}`} HP
                  </div>

                  <div className="flex-1 min-w-0 pr-12">
                    <p className="text-xs font-semibold text-slate-200 truncate">{tx.description}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-mono font-semibold">
                      {tx.type.replace(/_/g, " ")}
                    </p>

                    {/* Timeline expand cryptographics */}
                    <div className="mt-3 bg-[#0A0A0B] rounded-xl p-2.5 border border-white/5 font-mono text-[9px] space-y-1.5 overflow-x-auto text-slate-500 select-all">
                      <div className="flex items-center gap-1.5">
                        <Key size={10} className="text-slate-400" />
                        <span className="text-slate-400 font-semibold uppercase">Prev Hash:</span>
                        <span className="text-slate-600 tracking-tight">{tx.previousHash}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Key size={10} className="text-orange-500" />
                        <span className="text-slate-400 font-semibold uppercase">Block Hash:</span>
                        <span className="text-orange-400/90 tracking-tight">{tx.currentHash}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </span>

                      {report && (
                        <span className={`flex items-center gap-1 font-bold uppercase ${
                          report.isValid ? "text-emerald-500" : "text-rose-500"
                        }`}>
                          <ShieldCheck size={11} />
                          {report.isValid ? "● Hash Verified" : "● Sign Mismatch"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
