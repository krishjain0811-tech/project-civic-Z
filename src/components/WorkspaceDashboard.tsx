import React, { useState, useEffect } from "react";
import { 
  Folder, Mail, Users as UsersIcon, MessageSquare, Database, FileText, 
  Plus, Trash2, Send, Sparkles, RefreshCw, AlertCircle, CheckCircle, 
  Lock, ExternalLink, Globe, Search
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "../types";

interface WorkspaceDashboardProps {
  currentUser: User;
  accessToken: string;
  onRefreshHP: () => void;
  triggerToast: (msg: string) => void;
}

export function WorkspaceDashboard({ currentUser, accessToken, onRefreshHP, triggerToast }: WorkspaceDashboardProps) {
  const [currentSubTab, setCurrentSubTab] = useState<"drive" | "gmail" | "contacts" | "chat" | "sql-logs">("drive");
  const [loading, setLoading] = useState(false);

  // Drive state
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [newFileName, setNewFileName] = useState("Civic_Action_Report.txt");
  const [newFileContent, setNewFileContent] = useState("I verified Juhu Beach cleanups today with 5 other citizens!");
  const [fileToConfirmDelete, setFileToConfirmDelete] = useState<string | null>(null);

  // Gmail state
  const [emails, setEmails] = useState<any[]>([]);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("Volunteering Hours Sign-off");
  const [emailBody, setEmailBody] = useState("Yo! This is Rohan. I completed 4 hours of beach cleanup today. Ledger is updated.");
  const [emailToConfirmDelete, setEmailToConfirmDelete] = useState<string | null>(null);

  // Contacts state
  const [contacts, setContacts] = useState<any[]>([]);
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [contactToConfirmDelete, setContactToConfirmDelete] = useState<string | null>(null);

  // Chat state
  const [spaces, setSpaces] = useState<any[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [chatMessage, setChatMessage] = useState("Hello Bandra Beach Warriors group chat!");

  // SQL logs state
  const [sqlLogs, setSqlLogs] = useState<any[]>([]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Helpers to make authorized API calls
  const authHeaders = {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };

  // Fetch functions
  const fetchDriveFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workspace/drive/files?uid=${currentUser.id}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setDriveFiles(data.files || []);
      }
    } catch (e) {
      console.error(e);
      triggerToast("Failed to fetch Google Drive files");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workspace/gmail/messages?uid=${currentUser.id}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setEmails(data.messages || []);
      }
    } catch (e) {
      console.error(e);
      triggerToast("Failed to fetch Gmail messages");
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workspace/contacts?uid=${currentUser.id}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch (e) {
      console.error(e);
      triggerToast("Failed to fetch Google Contacts");
    } finally {
      setLoading(false);
    }
  };

  const fetchChatSpaces = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workspace/chat/spaces?uid=${currentUser.id}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setSpaces(data.spaces || []);
        if (data.spaces?.length > 0 && !selectedSpaceId) {
          setSelectedSpaceId(data.spaces[0].name);
        }
      }
    } catch (e) {
      console.error(e);
      triggerToast("Failed to fetch Chat Spaces");
    } finally {
      setLoading(false);
    }
  };

  const fetchSqlLogs = async () => {
    try {
      const res = await fetch(`/api/workspace/logs/${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setSqlLogs(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger load on subtab change
  useEffect(() => {
    if (currentSubTab === "drive") fetchDriveFiles();
    if (currentSubTab === "gmail") fetchEmails();
    if (currentSubTab === "contacts") fetchContacts();
    if (currentSubTab === "chat") fetchChatSpaces();
    fetchSqlLogs();
  }, [currentSubTab]);

  // Actions
  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName) return;
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/drive/files", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ name: newFileName, content: newFileContent, uid: currentUser.id })
      });
      if (res.ok) {
        triggerToast(`File '${newFileName}' created in Google Drive!`);
        setNewFileName("Civic_Action_Report.txt");
        setNewFileContent("");
        fetchDriveFiles();
        fetchSqlLogs();
        onRefreshHP();
      } else {
        triggerToast("Failed to create Drive file");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workspace/drive/files/${fileId}?uid=${currentUser.id}`, {
        method: "DELETE",
        headers: authHeaders
      });
      if (res.ok) {
        triggerToast("File deleted from Google Drive!");
        setFileToConfirmDelete(null);
        fetchDriveFiles();
        fetchSqlLogs();
      } else {
        triggerToast("Failed to delete file");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailTo) return;
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/gmail/messages", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ to: emailTo, subject: emailSubject, body: emailBody, uid: currentUser.id })
      });
      if (res.ok) {
        triggerToast(`Email successfully sent to ${emailTo}!`);
        setEmailTo("");
        setEmailBody("");
        fetchEmails();
        fetchSqlLogs();
      } else {
        triggerToast("Failed to send email");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleTrashEmail = async (msgId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workspace/gmail/messages/${msgId}?uid=${currentUser.id}`, {
        method: "DELETE",
        headers: authHeaders
      });
      if (res.ok) {
        triggerToast("Email moved to trash!");
        setEmailToConfirmDelete(null);
        fetchEmails();
        fetchSqlLogs();
      } else {
        triggerToast("Failed to delete email");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName) return;
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/contacts", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ name: newContactName, email: newContactEmail, phone: newContactPhone, uid: currentUser.id })
      });
      if (res.ok) {
        triggerToast(`Contact '${newContactName}' registered in Workspace!`);
        setNewContactName("");
        setNewContactEmail("");
        setNewContactPhone("");
        fetchContacts();
        fetchSqlLogs();
      } else {
        triggerToast("Failed to register contact");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (resourceName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workspace/contacts/${resourceName}?uid=${currentUser.id}`, {
        method: "DELETE",
        headers: authHeaders
      });
      if (res.ok) {
        triggerToast("Contact removed from Google Contacts!");
        setContactToConfirmDelete(null);
        fetchContacts();
        fetchSqlLogs();
      } else {
        triggerToast("Failed to remove contact");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpaceId || !chatMessage) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/workspace/chat/spaces/${encodeURIComponent(selectedSpaceId)}/messages`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ text: chatMessage, uid: currentUser.id })
      });
      if (res.ok) {
        triggerToast("Broadcast successfully sent to Google Chat!");
        setChatMessage("");
        fetchSqlLogs();
      } else {
        triggerToast("Failed to post message to space");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Filtering
  const filteredDriveFiles = driveFiles.filter(file => 
    file.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEmails = emails.filter(email => 
    email.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.snippet?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.from?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = contacts.filter(contact => 
    contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* GEN-Z HEADER CARD */}
      <div className="bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-pink-500/20 p-6 rounded-[32px] relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 p-8 text-pink-500/10 animate-pulse font-black font-syne text-8xl pointer-events-none select-none">
          G-WORK
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-[10px] bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white font-extrabold px-3 py-1 rounded-full font-mono uppercase tracking-widest shadow-sm">
              DECENTRALIZED WORKSPACE CONNECT
            </span>
            <h2 className="text-2xl font-black font-syne text-white tracking-tight mt-3">
              Workspace Core Hub
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-sans max-w-xl">
              Link, manage, and audit your Google Drive reports, Gmail updates, contact logs, and Google Chat spaces. Action audit logs are appended to the public PostgreSQL ledger.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:w-auto bg-[#030303]/60 border border-white/5 rounded-2xl px-4 py-3 text-center sm:text-right">
              <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest font-mono">AUTHORIZED ENDPOINT</span>
              <span className="text-xs font-mono font-bold text-pink-400 mt-0.5 block break-all">fit-bolt-lpt51.firebaseapp.com</span>
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-white/5">
        <button
          onClick={() => setCurrentSubTab("drive")}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black font-syne uppercase tracking-wider shrink-0 transition-all cursor-pointer border ${
            currentSubTab === "drive" 
              ? "bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-pink-500/30 text-pink-400 shadow-md" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Folder size={14} /> Google Drive
        </button>

        <button
          onClick={() => setCurrentSubTab("gmail")}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black font-syne uppercase tracking-wider shrink-0 transition-all cursor-pointer border ${
            currentSubTab === "gmail" 
              ? "bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-pink-500/30 text-pink-400 shadow-md" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Mail size={14} /> Gmail Node
        </button>

        <button
          onClick={() => setCurrentSubTab("contacts")}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black font-syne uppercase tracking-wider shrink-0 transition-all cursor-pointer border ${
            currentSubTab === "contacts" 
              ? "bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-pink-500/30 text-pink-400 shadow-md" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <UsersIcon size={14} /> Contacts Directory
        </button>

        <button
          onClick={() => setCurrentSubTab("chat")}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black font-syne uppercase tracking-wider shrink-0 transition-all cursor-pointer border ${
            currentSubTab === "chat" 
              ? "bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-pink-500/30 text-pink-400 shadow-md" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <MessageSquare size={14} /> Google Chat Hub
        </button>

        <button
          onClick={() => setCurrentSubTab("sql-logs")}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black font-syne uppercase tracking-wider shrink-0 transition-all cursor-pointer border ${
            currentSubTab === "sql-logs" 
              ? "bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-pink-500/30 text-pink-400 shadow-md" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Database size={14} /> Cloud SQL Logs
        </button>
      </div>

      {/* SEARCH AND REFRESH ROW */}
      {currentSubTab !== "sql-logs" && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-3.5 text-slate-600" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${currentSubTab}...`}
              className="w-full text-xs bg-[#111115] border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-pink-500/50 font-sans"
            />
          </div>

          <button
            onClick={() => {
              if (currentSubTab === "drive") fetchDriveFiles();
              if (currentSubTab === "gmail") fetchEmails();
              if (currentSubTab === "contacts") fetchContacts();
              if (currentSubTab === "chat") fetchChatSpaces();
              fetchSqlLogs();
            }}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-3.5 bg-[#111115] hover:bg-[#15151b] text-slate-300 font-extrabold rounded-2xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 border border-white/5 transition-all cursor-pointer shrink-0 disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Sync Sync
          </button>
        </div>
      )}

      {/* SUBTAB CONTENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: LISTS */}
        <div className="lg:col-span-2 bg-[#111115] border border-white/5 rounded-[32px] p-6 shadow-md overflow-hidden min-h-[400px]">
          <h3 className="text-xs font-black font-syne uppercase tracking-wider text-slate-100 mb-4 flex items-center justify-between">
            <span>ACTIVE {currentSubTab.toUpperCase()} ARTIFACTS</span>
            <span className="text-[9px] font-mono font-bold text-pink-400">SECURE NODE</span>
          </h3>

          <AnimatePresence mode="wait">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3 font-mono text-slate-500 text-xs">
                <RefreshCw className="animate-spin text-pink-500" size={24} />
                <span>Synchronizing with Google Workspace endpoints...</span>
              </div>
            ) : (
              <motion.div
                key={currentSubTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {/* GOOGLE DRIVE FILES */}
                {currentSubTab === "drive" && (
                  filteredDriveFiles.length === 0 ? (
                    <div className="text-center py-16 text-slate-600 font-mono text-xs italic">
                      No files located on Google Drive storage bucket.
                    </div>
                  ) : (
                    filteredDriveFiles.map(file => (
                      <div key={file.id} className="bg-[#030303]/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
                            <Folder size={18} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-100 line-clamp-1">{file.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                              Modified: {new Date(file.modifiedTime).toLocaleDateString()} • {file.mimeType.split(".").pop() || "txt"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-slate-100 transition-colors">
                            <ExternalLink size={14} />
                          </a>
                          {fileToConfirmDelete === file.id ? (
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleDeleteFile(file.id)} className="px-2 py-1 bg-red-600 text-white rounded font-bold font-mono text-[9px] hover:bg-red-500 transition-colors">
                                CONFIRM
                              </button>
                              <button onClick={() => setFileToConfirmDelete(null)} className="px-2 py-1 bg-white/5 text-slate-400 rounded font-bold font-mono text-[9px] hover:bg-white/10 transition-colors">
                                CANCEL
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setFileToConfirmDelete(file.id)} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )
                )}

                {/* GMAIL ENDPOINT MESSAGES */}
                {currentSubTab === "gmail" && (
                  filteredEmails.length === 0 ? (
                    <div className="text-center py-16 text-slate-600 font-mono text-xs italic">
                      No matching mail items synchronised in mail server.
                    </div>
                  ) : (
                    filteredEmails.map(email => (
                      <div key={email.id} className="bg-[#030303]/40 border border-white/5 rounded-2xl p-4 flex items-start justify-between gap-4 hover:border-white/10 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mt-1 shrink-0">
                            <Mail size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-black font-mono text-slate-400 line-clamp-1">{email.from}</span>
                              <span className="text-[9px] text-slate-600 font-mono">{new Date(email.date).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs font-bold text-slate-200 mt-1">{email.subject}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 font-sans leading-relaxed">{email.snippet}</p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {emailToConfirmDelete === email.id ? (
                            <div className="flex flex-col items-end gap-1">
                              <button onClick={() => handleTrashEmail(email.id)} className="px-2 py-1 bg-red-600 text-white rounded font-bold font-mono text-[9px] hover:bg-red-500 transition-colors">
                                CONFIRM
                              </button>
                              <button onClick={() => setEmailToConfirmDelete(null)} className="px-2 py-1 bg-white/5 text-slate-400 rounded font-bold font-mono text-[9px] hover:bg-white/10 transition-colors text-center w-full">
                                CANCEL
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setEmailToConfirmDelete(email.id)} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )
                )}

                {/* CONTACTS LIST */}
                {currentSubTab === "contacts" && (
                  filteredContacts.length === 0 ? (
                    <div className="text-center py-16 text-slate-600 font-mono text-xs italic">
                      No synchronized contact addresses detected in directory.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredContacts.map(contact => (
                        <div key={contact.resourceName} className="bg-[#030303]/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-white/10 transition-colors">
                          <div className="flex items-center gap-3 overflow-hidden">
                            {contact.photo ? (
                              <img src={contact.photo} alt={contact.name} referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover border border-white/10" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-500 text-white font-extrabold flex items-center justify-center text-xs font-syne">
                                {contact.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="overflow-hidden">
                              <p className="text-xs font-bold text-slate-200 truncate">{contact.name}</p>
                              {contact.email && <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">{contact.email}</p>}
                              {contact.phone && <p className="text-[10px] text-pink-400/80 font-mono truncate">{contact.phone}</p>}
                            </div>
                          </div>

                          <div className="shrink-0">
                            {contactToConfirmDelete === contact.resourceName ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleDeleteContact(contact.resourceName)} className="px-1.5 py-0.5 bg-red-600 text-white rounded font-bold font-mono text-[8px] hover:bg-red-500 transition-colors">
                                  OK
                                </button>
                                <button onClick={() => setContactToConfirmDelete(null)} className="px-1.5 py-0.5 bg-white/5 text-slate-400 rounded font-bold font-mono text-[8px] hover:bg-white/10 transition-colors">
                                  NO
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setContactToConfirmDelete(contact.resourceName)} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* GOOGLE CHAT CHANNELS */}
                {currentSubTab === "chat" && (
                  spaces.length === 0 ? (
                    <div className="text-center py-16 text-slate-600 font-mono text-xs italic">
                      No active Google Chat channels/spaces linked to this token.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[10px] font-mono text-slate-500 font-bold tracking-wider mb-2">CHOOSE ACTIVE DESTINATION CHAT SPACE:</p>
                      {spaces.map(space => (
                        <div
                          key={space.name}
                          onClick={() => setSelectedSpaceId(space.name)}
                          className={`bg-[#030303]/40 border rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            selectedSpaceId === space.name ? "border-pink-500/40 bg-pink-500/5" : "border-white/5 hover:border-white/10"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                              <MessageSquare size={16} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-200">{space.displayName || space.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Type: {space.spaceType || space.type || "GROUP_CHAT"}</p>
                            </div>
                          </div>
                          {selectedSpaceId === space.name && (
                            <span className="text-[9px] bg-pink-500/20 text-pink-400 border border-pink-500/30 font-bold px-2 py-0.5 rounded uppercase font-mono">
                              Active
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* CLOUD SQL LOGS TABLE */}
                {currentSubTab === "sql-logs" && (
                  sqlLogs.length === 0 ? (
                    <div className="text-center py-16 text-slate-600 font-mono text-xs italic">
                      No historical activity records found in public PostgreSQL db.
                    </div>
                  ) : (
                    <div className="border border-white/5 rounded-2xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs font-mono">
                        <thead>
                          <tr className="bg-[#030303]/75 border-b border-white/5 text-[9px] text-slate-500 font-black tracking-widest uppercase">
                            <th className="p-3">ID</th>
                            <th className="p-3">SERVICE</th>
                            <th className="p-3">ACTION</th>
                            <th className="p-3">AUDIT LOG DETAILS</th>
                            <th className="p-3 text-right">TIMESTAMP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sqlLogs.map(log => (
                            <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="p-3 text-slate-600">#{log.id}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${
                                  log.serviceName === "DRIVE" ? "bg-pink-950/40 text-pink-400" :
                                  log.serviceName === "GMAIL" ? "bg-purple-950/40 text-purple-400" :
                                  log.serviceName === "CONTACTS" ? "bg-blue-950/40 text-blue-400" :
                                  "bg-indigo-950/40 text-indigo-400"
                                }`}>
                                  {log.serviceName}
                                </span>
                              </td>
                              <td className="p-3 font-bold text-slate-300">{log.actionType}</td>
                              <td className="p-3 text-slate-400 max-w-[200px] truncate">{log.details}</td>
                              <td className="p-3 text-right text-slate-500 text-[10px]">
                                {new Date(log.createdAt).toLocaleTimeString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE UTILITY ACTIONS */}
        <div className="space-y-6">
          
          {/* ACTION FORMS */}
          <div className="bg-[#111115] border border-white/5 p-6 rounded-[32px] shadow-lg">
            <h3 className="text-xs font-black font-syne uppercase tracking-wider text-slate-100 mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-pink-500" />
              {currentSubTab === "drive" && "Upload Action Report"}
              {currentSubTab === "gmail" && "Send Volunteer Mail"}
              {currentSubTab === "contacts" && "Register Contact Connection"}
              {currentSubTab === "chat" && "Broadcast To Channel"}
              {currentSubTab === "sql-logs" && "PostgreSQL Engine Details"}
            </h3>

            {/* DRIVE ACTION FORM */}
            {currentSubTab === "drive" && (
              <form onSubmit={handleUploadFile} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 font-mono">FILE NAME</label>
                  <input
                    type="text"
                    required
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="report_juhu_cleanup.txt"
                    className="w-full text-xs bg-[#030303] border border-white/10 rounded-2xl px-3.5 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-pink-500/50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 font-mono">REPORT CONTENT</label>
                  <textarea
                    rows={4}
                    required
                    value={newFileContent}
                    onChange={(e) => setNewFileContent(e.target.value)}
                    placeholder="Enter details of clean up work, hours completed..."
                    className="w-full text-xs bg-[#030303] border border-white/10 rounded-2xl px-3.5 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-pink-500/50 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:opacity-95 text-white font-extrabold rounded-2xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md"
                >
                  <Plus size={14} /> Upload To Google Drive
                </button>
              </form>
            )}

            {/* GMAIL ACTION FORM */}
            {currentSubTab === "gmail" && (
              <form onSubmit={handleSendEmail} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 font-mono">RECIPIENT EMAIL</label>
                  <input
                    type="email"
                    required
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="organizer@earthsave.org"
                    className="w-full text-xs bg-[#030303] border border-white/10 rounded-2xl px-3.5 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-pink-500/50 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 font-mono">SUBJECT</label>
                  <input
                    type="text"
                    required
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Weekly volunteer claim digest"
                    className="w-full text-xs bg-[#030303] border border-white/10 rounded-2xl px-3.5 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-pink-500/50 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 font-mono">BODY CONTENT</label>
                  <textarea
                    rows={3}
                    required
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Write your email summary here..."
                    className="w-full text-xs bg-[#030303] border border-white/10 rounded-2xl px-3.5 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-pink-500/50 resize-none font-sans"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:opacity-95 text-white font-extrabold rounded-2xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md"
                >
                  <Send size={13} /> Send Secure Mail
                </button>
              </form>
            )}

            {/* CONTACTS ACTION FORM */}
            {currentSubTab === "contacts" && (
              <form onSubmit={handleCreateContact} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 font-mono">CONTACT FULL NAME</label>
                  <input
                    type="text"
                    required
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="Arjun Yadav"
                    className="w-full text-xs bg-[#030303] border border-white/10 rounded-2xl px-3.5 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-pink-500/50 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 font-mono">EMAIL ADDRESS</label>
                  <input
                    type="email"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    placeholder="driver.arjun@caretransit.com"
                    className="w-full text-xs bg-[#030303] border border-white/10 rounded-2xl px-3.5 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-pink-500/50 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 font-mono">PHONE NUMBER</label>
                  <input
                    type="text"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    placeholder="+91 65432 10987"
                    className="w-full text-xs bg-[#030303] border border-white/10 rounded-2xl px-3.5 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-pink-500/50 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:opacity-95 text-white font-extrabold rounded-2xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md"
                >
                  <Plus size={14} /> Add Contact Connection
                </button>
              </form>
            )}

            {/* CHAT BROADCAST ACTION FORM */}
            {currentSubTab === "chat" && (
              <form onSubmit={handleSendChatMessage} className="space-y-4">
                <div className="p-3 bg-[#030303] border border-pink-500/10 rounded-2xl text-[10px] font-mono leading-relaxed text-slate-400">
                  <span className="font-bold text-slate-300 block mb-1">📢 Chat Space Targeted:</span>
                  {spaces.find(s => s.name === selectedSpaceId)?.displayName || selectedSpaceId || "None chosen"}
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 font-mono">MESSAGE TO BROADCAST</label>
                  <textarea
                    rows={4}
                    required
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Broadcast text..."
                    className="w-full text-xs bg-[#030303] border border-white/10 rounded-2xl px-3.5 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-pink-500/50 resize-none font-sans"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !selectedSpaceId}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:opacity-95 text-white font-extrabold rounded-2xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md"
                >
                  <Send size={13} /> Broadcast Message
                </button>
              </form>
            )}

            {/* SQL INFRA DETAILS PANEL */}
            {currentSubTab === "sql-logs" && (
              <div className="space-y-4">
                <div className="p-4 bg-[#030303] border border-white/5 rounded-2xl font-mono text-[11px] text-slate-400 space-y-2.5">
                  <p className="font-bold text-slate-200 uppercase tracking-wider text-[9px] border-b border-white/5 pb-1.5">PostgreSQL Engine Credentials</p>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Instance ID</span>
                    <span className="text-pink-400 font-bold">ai-studio-542483ed</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Project</span>
                    <span className="text-slate-300 font-bold">fit-bolt-lpt51</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Region</span>
                    <span className="text-slate-300 font-bold">asia-southeast1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Driver</span>
                    <span className="text-indigo-400 font-black">drizzle-orm (Node-PG)</span>
                  </div>
                </div>

                <div className="p-4 bg-[#030303]/50 border border-white/5 rounded-2xl text-[10px] leading-relaxed text-slate-500 italic">
                  Note: Actions in other Workspace columns trigger database insert commands that update this list in real-time. Feel free to inspect your files, send emails, or create connections to see append triggers!
                </div>
              </div>
            )}
          </div>

          {/* SECURE BLOCKCHAIN ACCREDITATION CARD */}
          <div className="bg-gradient-to-br from-[#111115] to-[#1a1125] border border-white/5 p-5 rounded-[32px] text-xs font-mono space-y-2">
            <h4 className="text-[10px] font-black text-slate-300 flex items-center gap-1.5 uppercase font-syne tracking-wider">
              <Lock size={14} className="text-pink-500" /> Secure Token Node
            </h4>
            <p className="text-slate-400 text-[11px] leading-relaxed font-sans">
              Google Workspace OAuth credentials are encrypted and stored in local volatile memory. Appending ledger entries is cryptographically secure.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
