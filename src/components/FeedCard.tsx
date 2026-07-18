import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, MessageSquare, ShieldCheck, ShieldAlert, Award, Send, Flame, Heart } from "lucide-react";
import { Post } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface FeedCardProps {
  post: Post;
  currentUserId: string;
  onReact: (postId: string, reaction: "LIKE" | "DISLIKE") => void;
  onAddComment: (postId: string, text: string) => void;
  key?: string;
}

export function FeedCard({ post, currentUserId, onReact, onAddComment }: FeedCardProps) {
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const hasLiked = post.likedBy?.includes(currentUserId);
  const hasDisliked = post.dislikedBy?.includes(currentUserId);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(post.id, commentText);
    setCommentText("");
  };

  const onLikePress = () => {
    setIsLiking(true);
    onReact(post.id, "LIKE");
    setTimeout(() => setIsLiking(false), 600);
  };

  // Checking consensus status
  const totalVotes = post.likeCount + post.dislikeCount;
  const isRejected = post.dislikeCount >= post.likeCount && totalVotes > 0;
  const isApproved = post.likeCount > post.dislikeCount && totalVotes > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="bg-[#111115]/90 border border-white/5 hover:border-white/10 rounded-[28px] overflow-hidden shadow-2xl relative group"
      id={`feed-card-${post.id}`}
    >
      {/* Background radial accent glow */}
      <div className="absolute -top-16 -right-16 w-32 h-32 bg-[#ee2a7b]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#ee2a7b]/15 transition-all duration-500" />
      <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-[#6228d7]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#6228d7]/15 transition-all duration-500" />

      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/5 relative z-10 bg-[#16161c]/40">
        <div className="flex items-center gap-3">
          {/* Instagram-style story gradient ring */}
          <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] shadow-lg transform hover:scale-105 transition-transform duration-300">
            <div className="p-[1.5px] bg-[#030303] rounded-full">
              <img
                src={post.user.profilePicUrl || "https://api.dicebear.com/7.x/bottts/svg"}
                alt={post.user.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-sm text-white tracking-tight hover:text-orange-400 transition-colors">{post.user.fullName}</span>
              {/* Colorful Gen Z Badge */}
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-pink-500/20 text-pink-400 font-extrabold uppercase tracking-widest font-display">
                {post.user.role.replace("_", " ")}
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">@{post.user.username}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {post.isAiGenerated && (
            <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold tracking-wider font-mono uppercase animate-pulse">
              <ShieldAlert size={11} /> AI Media Detected
            </span>
          )}
          {post.pointsGranted > 0 ? (
            <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400/20 to-orange-500/20 border border-orange-500/30 text-orange-300 font-black tracking-wider font-mono">
              <Flame size={12} className="text-orange-500" /> +{post.pointsGranted} HP
            </span>
          ) : isRejected ? (
            <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-red-950/40 border border-red-500/20 text-red-400 font-bold uppercase tracking-wider font-mono">
              <ShieldAlert size={12} /> Blocked
            </span>
          ) : null}
        </div>
      </div>

      {/* Media Content */}
      <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden border-b border-white/5">
        {post.mediaType === "VIDEO" ? (
          <video
            src={post.mediaUrl}
            controls
            className="w-full h-full object-cover"
            playsInline
            muted
          />
        ) : (
          <img
            src={post.mediaUrl}
            alt="Civic Work Proof"
            className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
        )}

        {/* Double-tap heart animation simulation layer */}
        <AnimatePresence>
          {isLiking && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0.5, 1.2, 1], opacity: [0, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 m-auto flex items-center justify-center pointer-events-none z-20"
            >
              <Heart size={80} className="text-pink-500 fill-pink-500 drop-shadow-[0_0_30px_rgba(238,42,123,0.6)]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions Bar */}
      <div className="p-4 bg-[#14161c]/40 relative z-10">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-4">
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={onLikePress}
              className={`flex items-center gap-1.5 text-xs font-bold font-mono transition-all px-2.5 py-1.5 rounded-full ${
                hasLiked 
                  ? "bg-pink-500/10 text-pink-500 border border-pink-500/30" 
                  : "text-slate-400 hover:text-white border border-transparent hover:border-white/10 hover:bg-white/5"
              }`}
              id={`like-button-${post.id}`}
            >
              <Heart size={16} className={hasLiked ? "fill-pink-500 text-pink-500" : ""} />
              <span>{post.likeCount}</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={() => onReact(post.id, "DISLIKE")}
              className={`flex items-center gap-1.5 text-xs font-bold font-mono transition-all px-2.5 py-1.5 rounded-full ${
                hasDisliked 
                  ? "bg-rose-500/10 text-rose-500 border border-rose-500/30" 
                  : "text-slate-400 hover:text-white border border-transparent hover:border-white/10 hover:bg-white/5"
              }`}
              id={`dislike-button-${post.id}`}
            >
              <ThumbsDown size={15} className={hasDisliked ? "fill-rose-500/10" : ""} />
              <span>{post.dislikeCount}</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 text-xs font-bold font-mono text-slate-400 hover:text-white transition-all px-2.5 py-1.5 rounded-full border border-transparent hover:border-white/10 hover:bg-white/5"
            >
              <MessageSquare size={15} />
              <span>{post.comments?.length || 0}</span>
            </motion.button>
          </div>

          {/* Social Consensus Meter - Gradient Progress */}
          {totalVotes > 0 && (
            <div className="flex flex-col items-end gap-1">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black font-mono">
                Consensus Verdict
              </span>
              <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden flex p-[1px]">
                <div 
                  className="bg-gradient-to-r from-pink-500 to-orange-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${(post.likeCount / totalVotes) * 100}%` }} 
                />
                <div 
                  className="bg-rose-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${(post.dislikeCount / totalVotes) * 100}%` }} 
                />
              </div>
            </div>
          )}
        </div>

        {/* Caption */}
        {post.caption && (
          <div className="text-sm text-slate-300 leading-relaxed mb-3 pr-2">
            <span className="font-extrabold text-white mr-2 hover:text-pink-500 transition-colors">@{post.user.username}</span>
            {post.caption}
          </div>
        )}

        {/* Dynamic Time Elapsed indicator */}
        <span className="text-[10px] text-slate-500 font-mono block">
          {new Date(post.createdAt).toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
          })}
        </span>

        {/* Comments Section */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-white/5 overflow-hidden"
            >
              <div className="space-y-3 max-h-48 overflow-y-auto mb-4 pr-1">
                {post.comments && post.comments.length > 0 ? (
                  post.comments.map((comm) => (
                    <div key={comm.id} className="flex gap-2.5 text-xs text-slate-300">
                      <img
                        src={comm.userPic || "https://api.dicebear.com/7.x/bottts/svg"}
                        alt={comm.username}
                        className="w-6 h-6 rounded-full border border-white/10 object-cover shrink-0 mt-0.5"
                      />
                      <div className="flex-1 bg-white/[0.03] rounded-2xl p-2.5 border border-white/5">
                        <span className="font-extrabold text-slate-200 block">@{comm.username}</span>
                        <p className="mt-0.5 text-slate-300 leading-normal font-sans">{comm.text}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 text-center py-4 italic font-mono">No remarks yet. Give community feedback above! ✨</p>
                )}
              </div>

              {/* Add Comment */}
              <form onSubmit={handleCommentSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Drop a cool remark..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 text-xs bg-[#030303] border border-white/10 rounded-2xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-pink-500/50 placeholder:text-slate-600 transition-all font-sans"
                />
                <button
                  type="submit"
                  className="px-4 bg-gradient-to-r from-pink-500 to-orange-500 hover:opacity-90 text-white rounded-2xl text-xs font-black tracking-wide flex items-center justify-center transition-opacity cursor-pointer shrink-0"
                >
                  <Send size={12} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
