import React, { useState, useEffect } from "react";
import { 
  Heart, ShieldCheck, ShieldAlert, Layers, Award, Truck, ThumbsUp, ThumbsDown, 
  MessageSquare, Plus, Search, Sparkles, DollarSign, MapPin, Activity, User as UserIcon, 
  Users, LogOut, Compass, FileText, CheckCircle, Video, Key, Map, AlertCircle, RefreshCw, Send, Image as ImageIcon,
  Copy, Link, Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Role, User, Organization, Group, Project, HourlyProof, Comment, Post, PointLedger, BloodBank, Story, Achievement } from "./types";
import { HumanityPointBadge } from "./components/HumanityPointBadge";
import { FeedCard } from "./components/FeedCard";
import { LedgerTimeline } from "./components/LedgerTimeline";
import { LiveMapTracker } from "./components/LiveMapTracker";
import { googleSignIn, logout as googleLogout } from "./lib/firebase";
import { WorkspaceDashboard } from "./components/WorkspaceDashboard";
import { Globe, Folder, Mail, Users as UsersIcon } from "lucide-react";

export default function App() {
  // State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([]);
  
  // Navigation
  const [activeTab, setActiveTab] = useState<"feed" | "explore" | "blood" | "ambulance" | "org" | "profile" | "ledger" | "workspace">("feed");
  const [accessToken, setAccessToken] = useState<string>("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  // Auth Form
  const [authMode, setAuthMode] = useState<"login" | "signup" | "otp">("login");
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [signupForm, setSignupForm] = useState({
    email: "",
    phoneNumber: "",
    fullName: "",
    username: "",
    password: "",
    age: 24,
    role: "CITIZEN" as Role
  });
  const [otpInput, setOtpInput] = useState("");
  const [tempSignedUser, setTempSignedUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState("");

  // Post Submission
  const [postCaption, setPostCaption] = useState("");
  const [postMediaUrl, setPostMediaUrl] = useState("");
  const [postMediaType, setPostMediaType] = useState<"IMAGE" | "VIDEO">("IMAGE");
  const [creatingPost, setCreatingPost] = useState(false);
  const [filterReason, setFilterReason] = useState("");

  // Project Creation
  const [newProjectForm, setNewProjectForm] = useState({
    title: "",
    description: "",
    maxWorkers: 30,
    beforePhotoUrl: ""
  });
  const [creatingProject, setCreatingProject] = useState(false);
  const [paymentProject, setPaymentProject] = useState<Project | null>(null);

  // Proof upload
  const [proofVideoUrl, setProofVideoUrl] = useState("");
  const [proofAfterUrl, setProofAfterUrl] = useState("");
  const [uploadingProofFor, setUploadingProofFor] = useState<string | null>(null);
  const [aiScanFeedback, setAiScanFeedback] = useState<{ isDeepfake: boolean; reason: string } | null>(null);

  // Points buying
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyAmount, setBuyAmount] = useState(10); // USD
  const [buyingStatus, setBuyingStatus] = useState<"idle" | "processing" | "success">("idle");

  // Blood redemption
  const [selectedBloodBank, setSelectedBloodBank] = useState<BloodBank | null>(null);
  const [selectedBloodGroup, setSelectedBloodGroup] = useState("O+");
  const [redeemUnits, setRedeemUnits] = useState(1);
  const [redeemStatus, setRedeemStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [redeemError, setRedeemError] = useState("");

  // Ambulance transit state
  const [pickupCoords, setPickupCoords] = useState({ lat: 19.0760, lng: 72.8777 });
  const [destCoords, setDestCoords] = useState({ lat: 18.9322, lng: 72.8354 });
  const [rideDistance, setRideDistance] = useState(16.5);
  const [isAmbulanceTransit, setIsAmbulanceTransit] = useState(false);
  const [activeAmbulanceRide, setActiveAmbulanceRide] = useState<any>(null);

  // Profile verification & achievements state
  const [profileAchievements, setProfileAchievements] = useState<Achievement[]>([]);
  const [profileLedger, setProfileLedger] = useState<PointLedger[]>([]);

  // KYC submission for user
  const [showKycModal, setShowKycModal] = useState(false);
  const [kycForm, setKycForm] = useState({ docType: "Aadhaar", docNumber: "" });

  // P2P Tipping states
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipTargetUsername, setTipTargetUsername] = useState("");
  const [tipAmount, setTipAmount] = useState(15);
  const [tipStatus, setTipStatus] = useState<"idle" | "scanning" | "processing" | "success" | "error">("idle");
  const [tipError, setTipError] = useState("");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Ledger Security Audit tab state
  const [globalLedger, setGlobalLedger] = useState<PointLedger[]>([]);
  const [globalVerification, setGlobalVerification] = useState<any>(null);
  const [ledgerAuditLoading, setLedgerAuditLoading] = useState(false);
  const [tamperLoading, setTamperLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [dbOption, setDbOption] = useState<"postgres" | "sqlite">("postgres");
  const [blockchainLogs, setBlockchainLogs] = useState<string[]>([
    "System booted. Node ledger secure.",
    "Decentralized SHA-256 chain validators online.",
    "PostgreSQL append-only triggers: ENFORCED."
  ]);

  const addBlockchainLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setBlockchainLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 15)]);
  };

  const fetchGlobalLedger = async () => {
    try {
      const res = await fetch("/api/ledger/all");
      if (res.ok) {
        const data = await res.json();
        setGlobalLedger(data);
      }
    } catch (e) {
      console.error("Error loading global ledger", e);
    }
  };

  const runGlobalIntegrityScan = async () => {
    setLedgerAuditLoading(true);
    addBlockchainLog("Triggering network-wide cryptographic integrity scan...");
    try {
      const res = await fetch("/api/ledger/verify-all");
      if (res.ok) {
        const data = await res.json();
        setGlobalVerification(data);
        if (data.secure) {
          addBlockchainLog("Scan complete: 100% Secure. Cryptographic signatures valid across all nodes.");
        } else {
          addBlockchainLog("🚨 CRITICAL ALERT: Cryptographic chain mismatch detected! Database tampering identified.");
        }
      }
    } catch (e) {
      console.error("Error verifying global ledger", e);
      addBlockchainLog("Error: Handshake timeout with peer-to-peer verification nodes.");
    } finally {
      setLedgerAuditLoading(false);
    }
  };

  const simulateTamper = async (txId?: string, amount?: number) => {
    setTamperLoading(true);
    addBlockchainLog("Simulating database vulnerability exploit. Editing row manually...");
    try {
      const res = await fetch("/api/ledger/tamper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txId, newAmount: amount })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addBlockchainLog(`Row modified directly! ${data.tamperedTx.description} set to ${data.newAmount} HP.`);
        addBlockchainLog("SHA-256 hash has NOT been re-signed. Chain is now compromised.");
        triggerToast("Vulnerability exploited! Check audit status.");
        await fetchGlobalLedger();
        await runGlobalIntegrityScan();
        await reloadUserProfile();
      }
    } catch (e) {
      console.error(e);
      addBlockchainLog("Exploit failed: Immutable ledger driver rejected manual INSERT/UPDATE.");
    } finally {
      setTamperLoading(false);
    }
  };

  const triggerLedgerRestore = async () => {
    setRestoreLoading(true);
    addBlockchainLog("Broadcasting restore payload to peer consensus nodes...");
    try {
      const res = await fetch("/api/ledger/restore", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        addBlockchainLog("Backup state synchronized. Database clean state restored.");
        addBlockchainLog("Running post-restore healthcheck...");
        triggerToast("Consensus synchronized! Ledger restored.");
        await fetchGlobalLedger();
        await runGlobalIntegrityScan();
        await reloadUserProfile();
      }
    } catch (e) {
      console.error(e);
      addBlockchainLog("Restore failed: Node synchronization failed.");
    } finally {
      setRestoreLoading(false);
    }
  };

  // Initial loads
  useEffect(() => {
    fetchPosts();
    fetchStories();
    fetchGroups();
    fetchProjects();
    fetchBloodBanks();
    fetchAllUsers();
    fetchGlobalLedger();
    runGlobalIntegrityScan();
  }, []);

  const fetchAllUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch (e) {
      console.error("Error loading users list", e);
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  // Fetch functions
  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/posts");
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (e) {
      console.error("Error loading posts", e);
    }
  };

  const fetchStories = async () => {
    try {
      const res = await fetch("/api/stories");
      if (res.ok) {
        const data = await res.json();
        setStories(data);
      }
    } catch (e) {
      console.error("Error loading stories", e);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (e) {
      console.error("Error loading groups", e);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (e) {
      console.error("Error loading projects", e);
    }
  };

  const fetchBloodBanks = async () => {
    try {
      const res = await fetch("/api/blood-banks");
      if (res.ok) {
        const data = await res.json();
        setBloodBanks(data);
      }
    } catch (e) {
      console.error("Error loading blood banks", e);
    }
  };

  const reloadUserProfile = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/users/${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setProfileAchievements(data.achievements);
        setProfileLedger(data.ledger);
      }
    } catch (e) {
      console.error("Error loading profile details", e);
    }
  };

  // Sync profile details on view switch
  useEffect(() => {
    if (currentUser) {
      reloadUserProfile();
    }
  }, [currentUser?.id, activeTab]);

  // Auth Submit Handlers
  const handleGoogleSignIn = async () => {
    setAuthError("");
    setIsGoogleLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        const { user, accessToken } = result;
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setCurrentUser(data.user);
          setAccessToken(accessToken);
          triggerToast("Successfully connected Google Workspace node!");
        } else {
          setAuthError(data.error || "Workspace node onboarding failed.");
        }
      }
    } catch (err: any) {
      console.error(err);
      setAuthError("Google Workspace popup connection failed or closed.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentUser(data.user);
        setUsernameInput("");
        setPasswordInput("");
      } else {
        setAuthError(data.error || "Login credentials failed.");
      }
    } catch (err) {
      setAuthError("Network server authentication failure.");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!signupForm.username || !signupForm.email || !signupForm.phoneNumber || !signupForm.fullName || !signupForm.password) {
      setAuthError("Please fill out all signup criteria.");
      return;
    }
    
    // Simulate SMS OTP Verification step
    setAuthMode("otp");
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (otpInput !== "1234") {
      setAuthError("Invalid 4-digit SMS validation code. Use '1234' for simulation.");
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentUser(data.user);
        setAuthMode("login");
        setOtpInput("");
        setSignupForm({
          email: "",
          phoneNumber: "",
          fullName: "",
          username: "",
          password: "",
          age: 24,
          role: "CITIZEN"
        });
      } else {
        setAuthError(data.error || "Signup registration pipeline failed.");
        setAuthMode("signup");
      }
    } catch (err) {
      setAuthError("Registration database connection error.");
      setAuthMode("signup");
    }
  };

  const handleLogOut = async () => {
    try {
      await googleLogout();
    } catch (e) {
      console.error(e);
    }
    setCurrentUser(null);
    setAccessToken("");
    setActiveTab("feed");
  };

  // Reactions & Post Comments
  const handlePostReact = async (postId: string, reaction: "LIKE" | "DISLIKE") => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/posts/${postId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, reaction })
      });
      if (res.ok) {
        fetchPosts();
        reloadUserProfile();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = async (postId: string, text: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, text })
      });
      if (res.ok) {
        fetchPosts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setCreatingPost(true);
    setFilterReason("");

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          mediaUrl: postMediaUrl,
          mediaType: postMediaType,
          caption: postCaption
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPostCaption("");
        setPostMediaUrl("");
        if (data.validationReason) {
          setFilterReason(data.validationReason);
        }
        fetchPosts();
        reloadUserProfile();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingPost(false);
    }
  };

  // Join Group / Drives
  const handleJoinGroup = async (groupId: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });
      if (res.ok) {
        fetchGroups();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Apply for Project / Civic labor slot
  const handleApplyProject = async (projectId: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });
      if (res.ok) {
        fetchProjects();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Launch Project
  const handleLaunchProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setCreatingProject(true);

    try {
      // Find org
      const orgRes = await fetch("/api/groups");
      const groupsData = await orgRes.json();
      const orgId = groupsData[0]?.orgId || "org-1";

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          title: newProjectForm.title,
          description: newProjectForm.description,
          maxWorkers: newProjectForm.maxWorkers,
          beforePhotoUrl: newProjectForm.beforePhotoUrl
        })
      });
      const data = await res.json();
      if (res.ok) {
        setNewProjectForm({ title: "", description: "", maxWorkers: 30, beforePhotoUrl: "" });
        setPaymentProject(data.project);
        fetchProjects();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingProject(false);
    }
  };

  // Pay $10 Listing Fee
  const handlePayListingFee = async (projId: string) => {
    try {
      const res = await fetch(`/api/projects/${projId}/pay`, {
        method: "POST"
      });
      if (res.ok) {
        setPaymentProject(null);
        fetchProjects();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Hourly Proof Video
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadingProofFor) return;
    setAiScanFeedback(null);

    try {
      const res = await fetch(`/api/projects/${uploadingProofFor}/proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: proofVideoUrl,
          afterPhotoUrl: proofAfterUrl
        })
      });
      const data = await res.json();
      if (res.ok) {
        setProofVideoUrl("");
        setProofAfterUrl("");
        setUploadingProofFor(null);
        
        if (data.proof) {
          setAiScanFeedback({
            isDeepfake: data.proof.aiIsDeepfake,
            reason: data.proof.failureReason || "Signature match successful. AI scanned frame structures and verified labor authenticity."
          });
        }
        fetchProjects();
        reloadUserProfile();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Buy Humanity Points Cash Portal
  const handleBuyPoints = async () => {
    if (!currentUser) return;
    setBuyingStatus("processing");
    try {
      const res = await fetch("/api/payments/purchase-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, amountUsd: buyAmount })
      });
      if (res.ok) {
        setBuyingStatus("success");
        reloadUserProfile();
        setTimeout(() => {
          setShowBuyModal(false);
          setBuyingStatus("idle");
        }, 1500);
      }
    } catch (e) {
      console.error(e);
      setBuyingStatus("idle");
    }
  };

  // Redeem Blood Bags
  const handleRedeemBlood = async () => {
    if (!currentUser || !selectedBloodBank) return;
    setRedeemStatus("processing");
    setRedeemError("");

    try {
      const res = await fetch("/api/blood-banks/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          bloodBankId: selectedBloodBank.id,
          bloodGroup: selectedBloodGroup,
          units: redeemUnits
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRedeemStatus("success");
        fetchBloodBanks();
        reloadUserProfile();
        setTimeout(() => {
          setSelectedBloodBank(null);
          setRedeemStatus("idle");
        }, 2000);
      } else {
        setRedeemError(data.error || "Blood bag redemption failed.");
        setRedeemStatus("error");
      }
    } catch (e) {
      setRedeemError("Database connection error during blood bank redemption.");
      setRedeemStatus("error");
    }
  };

  // Ambulance dispatch
  const handleDispatchAmbulance = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/ambulance/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          pickupLat: pickupCoords.lat,
          pickupLng: pickupCoords.lng,
          destLat: destCoords.lat,
          destLng: destCoords.lng,
          distanceKm: rideDistance
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveAmbulanceRide(data.ride);
        setIsAmbulanceTransit(true);
        reloadUserProfile();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAmbulanceCompleted = async () => {
    if (!activeAmbulanceRide) return;
    try {
      const res = await fetch(`/api/ambulance/complete/${activeAmbulanceRide.id}`, {
        method: "POST"
      });
      if (res.ok) {
        setIsAmbulanceTransit(false);
        setActiveAmbulanceRide(null);
        reloadUserProfile();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit User KYC
  const handleSubmitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !kycForm.docNumber) return;

    try {
      const res = await fetch(`/api/users/${currentUser.id}/kyc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType: kycForm.docType,
          docNumber: kycForm.docNumber
        })
      });
      if (res.ok) {
        setShowKycModal(false);
        reloadUserProfile();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Peer-to-Peer Tip
  const handleSendTip = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;
    if (!tipTargetUsername) {
      setTipError("Please enter or select a recipient username.");
      return;
    }
    if (tipTargetUsername.toLowerCase() === currentUser.username.toLowerCase()) {
      setTipError("You cannot tip yourself!");
      return;
    }
    if (currentUser.humanityPoints < tipAmount) {
      setTipError(`Insufficient balance. You need ${tipAmount} HP.`);
      return;
    }

    setTipStatus("processing");
    setTipError("");

    try {
      const res = await fetch("/api/users/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUser.id,
          recipientUsername: tipTargetUsername,
          amount: tipAmount
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTipStatus("success");
        reloadUserProfile();
        fetchAllUsers(); // Refresh users list
        setTimeout(() => {
          setShowTipModal(false);
          setTipStatus("idle");
          setTipTargetUsername("");
        }, 2000);
      } else {
        setTipError(data.error || "Tipping transaction rejected by ledger.");
        setTipStatus("error");
      }
    } catch (e) {
      setTipError("Network communication error with cryptographic node.");
      setTipStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-slate-100 font-sans flex flex-col selection:bg-pink-500/30">
      
      {/* HEADER BAR */}
      <header className="border-b border-white/5 bg-[#030303]/85 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Instagram style warm gradient logo icon */}
            <div className="w-9 h-9 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] rounded-xl flex items-center justify-center font-black text-xl text-white shadow-lg shadow-pink-500/10 transform hover:rotate-6 transition-transform duration-300">
              Z
            </div>
            <div>
              <span className="font-syne font-extrabold text-xl tracking-wide bg-gradient-to-r from-[#fec051] via-[#ee2a7b] to-[#6228d7] bg-clip-text text-transparent">
                CIVIC Z
              </span>
              <span className="hidden sm:inline-block ml-2 text-[8px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 font-mono uppercase tracking-widest font-black">
                HYBRID GEN-Z EMERGENCY NETWORK
              </span>
            </div>
          </div>

          {currentUser ? (
            <div className="flex items-center gap-4">
              {/* Animated Balance Badge */}
              <div className="cursor-pointer transform hover:scale-105 transition-transform" onClick={() => setShowBuyModal(true)}>
                <HumanityPointBadge points={currentUser.humanityPoints} size="md" />
              </div>

              {/* User quick pill with Story Ring */}
              <div className="flex items-center gap-2 bg-[#111115] pl-1.5 pr-3 py-1.5 rounded-full border border-white/5 shadow-md">
                <div className="p-[1.5px] bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] rounded-full">
                  <img
                    src={currentUser.profilePicUrl || "https://api.dicebear.com/7.x/bottts/svg"}
                    alt={currentUser.username}
                    className="w-5 h-5 rounded-full object-cover border border-[#030303]"
                  />
                </div>
                <span className="text-xs font-bold text-slate-300 hidden sm:inline">
                  @{currentUser.username}
                </span>
                {!currentUser.isVerified && (
                  <button
                    onClick={() => setShowKycModal(true)}
                    className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold uppercase hover:bg-amber-500/20 transition-all"
                  >
                    KYC
                  </button>
                )}
              </div>

              <button
                onClick={handleLogOut}
                className="p-2 hover:bg-rose-950/20 rounded-xl border border-transparent hover:border-rose-950/30 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                title="Sign Out"
                id="logout-button"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="text-[10px] text-slate-500 font-mono font-black tracking-widest bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
              ⚡ IMMUTABLE ZERO-TRUST GATEWAY
            </div>
          )}
        </div>
      </header>

      {/* OUTSIDE / PUBLIC RECRUITER GATEWAY (AUTH) */}
      {!currentUser ? (
        <main className="flex-1 max-w-md w-full mx-auto px-4 py-16 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111115] border border-white/5 rounded-[32px] p-8 shadow-[0_15px_40px_rgba(0,0,0,0.5)] relative overflow-hidden"
          >
            {/* Insta style neon corner glow */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="text-center mb-8 relative z-10">
              <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white mb-4 shadow-lg shadow-pink-500/10">
                <Layers size={26} />
              </div>
              <h2 className="text-2xl font-black font-display tracking-tight text-white">
                {authMode === "login" ? "Verify Security Keys" : authMode === "signup" ? "Create Identity" : "Verify OTP Validation"}
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {authMode === "login" 
                  ? "Access your immutable Humanity Points ledger, verify civic proofs, and summon emergency transits." 
                  : authMode === "signup"
                  ? "Join the network as a Citizen, Org Leader, or EMT driver. Fully public, verifiable profiles."
                  : "We've simulated sending a 4-digit verification code to your device."}
              </p>
            </div>

             {authError && (
              <div className="p-3 bg-red-500/5 border border-red-500/20 text-red-400 text-xs rounded-2xl flex items-center gap-2 mb-6 font-mono">
                <AlertCircle size={14} />
                <span>{authError}</span>
              </div>
            )}

            {authMode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4 relative z-10">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Username or Email</label>
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="rohan_green or rohan@civicz.org"
                    className="w-full text-xs bg-[#030303] border border-white/10 rounded-2xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-pink-500/50 transition-all font-sans"
                    id="login-username"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Password Key</label>
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full text-xs bg-[#030303] border border-white/10 rounded-2xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-pink-500/50 transition-all font-sans"
                    id="login-password"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:opacity-95 text-white font-extrabold rounded-2xl text-xs uppercase tracking-widest transition-all shadow-[0_4px_25px_rgba(238,42,123,0.35)] cursor-pointer"
                  id="login-submit"
                >
                  Confirm Authentication
                </button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-white/5"></div>
                  <span className="flex-shrink mx-4 text-slate-600 text-[10px] font-black font-mono uppercase tracking-widest">OR</span>
                  <div className="flex-grow border-t border-white/5"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  className="w-full py-3.5 bg-[#030303] hover:bg-[#09090b] text-white border border-white/10 font-black rounded-2xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Globe size={14} className="text-pink-400 animate-spin-slow" />
                  {isGoogleLoading ? "Connecting Node..." : "Google Workspace Auth"}
                </button>

                <p className="text-xs text-slate-400 text-center mt-4 font-mono">
                  New coordinator node?{" "}
                  <button type="button" onClick={() => setAuthMode("signup")} className="text-pink-400 hover:text-pink-300 hover:underline font-bold">
                    Create node identity
                  </button>
                </p>
              </form>
            ) : authMode === "signup" ? (
              <form onSubmit={handleSignup} className="space-y-4 relative z-10">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Full Name</label>
                    <input
                      type="text"
                      required
                      value={signupForm.fullName}
                      onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                      placeholder="Vikram Singh"
                      className="w-full text-xs bg-[#030303] border border-white/10 rounded-2xl px-3.5 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-pink-500/50 transition-all font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Username</label>
                    <input
                      type="text"
                      required
                      value={signupForm.username}
                      onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                      placeholder="vikram_singh"
                      className="w-full text-xs bg-[#030303] border border-white/10 rounded-2xl px-3.5 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-pink-500/50 transition-all font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Email Address</label>
                  <input
                    type="email"
                    required
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    placeholder="vikram@redcross.org"
                    className="w-full text-xs bg-[#030303] border border-white/10 rounded-2xl px-3.5 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-pink-500/50 transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Phone (OTP Simulated)</label>
                  <input
                    type="text"
                    required
                    value={signupForm.phoneNumber}
                    onChange={(e) => setSignupForm({ ...signupForm, phoneNumber: e.target.value })}
                    placeholder="+91 99999 99999"
                    className="w-full text-xs bg-[#030303] border border-white/10 rounded-2xl px-3.5 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-pink-500/50 transition-all font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Node Role</label>
                    <select
                      value={signupForm.role}
                      onChange={(e) => setSignupForm({ ...signupForm, role: e.target.value as Role })}
                      className="w-full text-xs bg-[#030303] border border-white/10 rounded-2xl px-3 py-3 text-slate-100 focus:outline-none focus:border-pink-500/50 transition-all font-sans cursor-pointer"
                    >
                      <option value="CITIZEN">Citizen (Work & Redeem)</option>
                      <option value="ORGANIZATION_LEADER">Org Leader (Approve & Launch)</option>
                      <option value="BLOOD_BANK_ADMIN">Blood Bank Admin</option>
                      <option value="DRIVER">Ambulance EMT Driver</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Age</label>
                    <input
                      type="number"
                      required
                      value={signupForm.age}
                      onChange={(e) => setSignupForm({ ...signupForm, age: parseInt(e.target.value) || 21 })}
                      className="w-full text-xs bg-[#030303] border border-white/10 rounded-2xl px-3 py-3 text-slate-100 focus:outline-none focus:border-pink-500/50 transition-all font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Password Key</label>
                  <input
                    type="password"
                    required
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full text-xs bg-[#030303] border border-white/10 rounded-2xl px-3.5 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-pink-500/50 transition-all font-sans"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:opacity-95 text-white font-extrabold rounded-2xl text-xs uppercase tracking-widest transition-all shadow-[0_4px_25px_rgba(238,42,123,0.35)] cursor-pointer"
                >
                  Submit Registration Node
                </button>

                <p className="text-xs text-slate-400 text-center mt-4 font-mono">
                  Already have keys?{" "}
                  <button type="button" onClick={() => setAuthMode("login")} className="text-pink-400 hover:text-pink-300 hover:underline font-bold">
                    Authenticate node
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleOtpVerify} className="space-y-4 relative z-10">
                <div>
                  <p className="text-xs text-pink-400 bg-pink-500/5 p-3 rounded-2xl border border-pink-500/10 text-center mb-5 font-mono">
                    SIMULATION OTP CODE: <span className="font-bold text-white tracking-widest">1234</span>
                  </p>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center font-mono">Enter 4-Digit Validation Code</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="••••"
                    className="w-32 mx-auto text-center tracking-widest text-xl font-bold font-mono bg-[#030303] border border-white/10 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-pink-500/50 block"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:opacity-95 text-white font-extrabold rounded-2xl text-xs uppercase tracking-widest transition-all shadow-[0_4px_25px_rgba(238,42,123,0.35)] cursor-pointer"
                >
                  Verify Cryptographic Access
                </button>
              </form>
            )}
          </motion.div>
        </main>
      ) : (
        /* INNER APP WORKSPACE */
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 flex flex-col md:flex-row gap-8">
          
          {/* SIDEBAR TABS PANEL */}
          <nav className="w-full md:w-64 shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible border-b md:border-b-0 border-white/5 pb-3 md:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab("feed")}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[10px] font-black font-syne uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                activeTab === "feed" 
                  ? "bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-indigo-500/15 border border-pink-500/30 text-pink-400 shadow-[0_4px_20px_rgba(236,72,153,0.1)]" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
              }`}
            >
              <Compass size={16} className={activeTab === "feed" ? "text-pink-500 animate-spin-slow" : ""} />
              Community Feed
            </button>

            <button
              onClick={() => setActiveTab("explore")}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[10px] font-black font-syne uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                activeTab === "explore" 
                  ? "bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-indigo-500/15 border border-pink-500/30 text-pink-400 shadow-[0_4px_20px_rgba(236,72,153,0.1)]" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
              }`}
            >
              <Map size={16} className={activeTab === "explore" ? "text-pink-500" : ""} />
              Explore Drives
            </button>

            <button
              onClick={() => setActiveTab("blood")}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[10px] font-black font-syne uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                activeTab === "blood" 
                  ? "bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-indigo-500/15 border border-pink-500/30 text-pink-400 shadow-[0_4px_20px_rgba(236,72,153,0.1)]" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
              }`}
            >
              <Heart size={16} className={activeTab === "blood" ? "text-pink-500" : ""} />
              Redeem Blood
            </button>

            <button
              onClick={() => setActiveTab("ambulance")}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[10px] font-black font-syne uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                activeTab === "ambulance" 
                  ? "bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-indigo-500/15 border border-pink-500/30 text-pink-400 shadow-[0_4px_20px_rgba(236,72,153,0.1)]" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
              }`}
            >
              <Truck size={16} className={activeTab === "ambulance" ? "text-pink-500" : ""} />
              EMT Dispatch
            </button>

            {currentUser.role === "ORGANIZATION_LEADER" && (
              <button
                onClick={() => setActiveTab("org")}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[10px] font-black font-syne uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                  activeTab === "org" 
                    ? "bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-indigo-500/15 border border-pink-500/30 text-pink-400 shadow-[0_4px_20px_rgba(236,72,153,0.1)]" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                }`}
              >
                <Users size={16} className={activeTab === "org" ? "text-pink-500" : ""} />
                Org Control Room
              </button>
            )}

            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[10px] font-black font-syne uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                activeTab === "profile" 
                  ? "bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-indigo-500/15 border border-pink-500/30 text-pink-400 shadow-[0_4px_20px_rgba(236,72,153,0.1)]" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
              }`}
              id="profile-tab-button"
            >
              <UserIcon size={16} className={activeTab === "profile" ? "text-pink-500" : ""} />
              My Public Profile
            </button>

            <button
              onClick={() => setActiveTab("workspace")}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[10px] font-black font-syne uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                activeTab === "workspace" 
                  ? "bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-indigo-500/15 border border-pink-500/30 text-pink-400 shadow-[0_4px_20px_rgba(236,72,153,0.1)]" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
              }`}
              id="workspace-tab-button"
            >
              <Globe size={16} className={activeTab === "workspace" ? "text-pink-500 animate-spin-slow" : ""} />
              Workspace Nodes
            </button>

            <button
              onClick={() => {
                setActiveTab("ledger");
                fetchGlobalLedger();
                runGlobalIntegrityScan();
              }}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[10px] font-black font-syne uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                activeTab === "ledger" 
                  ? "bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-indigo-500/15 border border-pink-500/30 text-pink-400 shadow-[0_4px_20px_rgba(236,72,153,0.1)]" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
              }`}
              id="ledger-tab-button"
            >
              <Key size={16} className={activeTab === "ledger" ? "text-pink-500" : ""} />
              Ledger Audit Node
            </button>
          </nav>

          {/* MAIN CONTAINER ACTIVE WORKSPACE */}
          <main className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              
              {/* TAB 1: SOCIAL COMM FEED & STORIES */}
              {activeTab === "feed" && (
                <motion.div
                  key="feed-tab"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  {/* STORY ROW */}
                  <div className="bg-[#111115] border border-white/5 p-4 rounded-3xl flex items-center gap-4 overflow-x-auto shadow-sm scrollbar-none">
                    {/* Create Story Circle */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className="relative cursor-pointer w-14 h-14 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center hover:border-pink-500 transition-colors">
                        <Plus className="text-slate-400" size={18} />
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1.5 font-bold font-mono">Your Story</span>
                    </div>

                    {/* Seeded Stories */}
                    {stories.map(st => (
                      <div key={st.id} className="flex flex-col items-center shrink-0">
                        <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]">
                          <img
                            src={st.user.profilePicUrl || "https://api.dicebear.com/7.x/bottts/svg"}
                            alt={st.user.username}
                            className="w-13 h-13 rounded-full border-2 border-[#030303] object-cover"
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 mt-1.5 font-bold font-mono">@{st.user.username}</span>
                      </div>
                    ))}
                  </div>

                  {/* DOUBLE COLUMN FEED LAYOUT */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* POSTS CARDS TIMELINE */}
                    <div className="lg:col-span-2 space-y-6">
                      {posts.length === 0 ? (
                        <div className="p-12 text-center border border-dashed border-white/10 rounded-3xl bg-[#111115]/40 text-slate-500 font-mono text-xs">
                          No civic claims submitted to the feed yet. Create one!
                        </div>
                      ) : (
                        posts.map(post => (
                          <FeedCard
                            key={post.id}
                            post={post}
                            currentUserId={currentUser.id}
                            onReact={handlePostReact}
                            onAddComment={handleAddComment}
                          />
                        ))
                      )}
                    </div>

                    {/* SIDEBAR SUBMIT CREATOR & RULES */}
                    <div className="space-y-6">
                      {/* SUBMIT FORM */}
                      <div className="bg-[#111115] border border-white/5 p-6 rounded-[32px] shadow-lg">
                        <h3 className="text-xs font-black font-syne uppercase tracking-wider text-slate-100 mb-4 flex items-center gap-2">
                          <Plus size={16} className="text-pink-500" />
                          Publish Civic Claim
                        </h3>

                        {filterReason && (
                          <div className="p-3 bg-[#030303] border border-pink-500/20 text-pink-400 text-[10px] font-mono rounded-xl mb-4 leading-normal">
                            <span className="font-bold text-pink-300 block mb-1">🛡️ Vision AI Filter output:</span>
                            {filterReason}
                          </div>
                        )}

                        <form onSubmit={handleCreatePost} className="space-y-4">
                          <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 font-mono">CAPTION</label>
                            <textarea
                              rows={3}
                              value={postCaption}
                              onChange={(e) => setPostCaption(e.target.value)}
                              placeholder="Describe your physical labor, units of blood donated, or community action proof..."
                              className="w-full text-xs bg-[#030303] border border-white/10 rounded-2xl px-3.5 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-pink-500/50 resize-none font-sans"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 font-mono">MEDIA TYPE</label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setPostMediaType("IMAGE")}
                                className={`py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                  postMediaType === "IMAGE" 
                                    ? "bg-[#030303] border-pink-500/40 text-pink-400" 
                                    : "bg-[#030303]/30 border-white/5 text-slate-500"
                                }`}
                              >
                                <ImageIcon size={13} /> Photo
                              </button>
                              <button
                                type="button"
                                onClick={() => setPostMediaType("VIDEO")}
                                className={`py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                  postMediaType === "VIDEO" 
                                    ? "bg-[#030303] border-pink-500/40 text-pink-400" 
                                    : "bg-[#030303]/30 border-white/5 text-slate-500"
                                }`}
                              >
                                <Video size={13} /> Video
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 font-mono">PROOF MEDIA LINK (URL)</label>
                            <input
                              type="text"
                              value={postMediaUrl}
                              onChange={(e) => setPostMediaUrl(e.target.value)}
                              placeholder="https://images.unsplash.com/photo-..."
                              className="w-full text-xs bg-[#030303] border border-white/10 rounded-2xl px-3.5 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-pink-500/50 font-sans"
                              required
                            />
                            <p className="text-[9px] text-slate-500 mt-1 leading-normal font-mono">
                              Use Unsplash photos or standard MP4 urls for civic verification scans.
                            </p>
                          </div>

                          <button
                            type="submit"
                            disabled={creatingPost}
                            className="w-full py-3 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:opacity-95 text-white font-extrabold rounded-2xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-[0_4px_15px_rgba(238,42,123,0.25)]"
                          >
                            <Sparkles size={13} />
                            {creatingPost ? "Verifying Frame Authenticity..." : "Launch Verified Social Post"}
                          </button>
                        </form>
                      </div>

                      {/* SOCIAL CONSENSUS RULES BANNER */}
                      <div className="bg-[#111115]/40 border border-white/5 p-5 rounded-3xl">
                        <h4 className="text-[10px] font-black text-slate-300 flex items-center gap-1.5 uppercase font-syne tracking-wider">
                          <ShieldCheck size={14} className="text-pink-500" /> Consensus Rules
                        </h4>
                        <ul className="text-[11px] text-slate-400 space-y-2.5 mt-3 leading-relaxed list-disc list-inside font-mono">
                          <li>Every post undergoes frame scans for AI synthesis.</li>
                          <li>Casual posts that achieve <span className="text-pink-400 font-semibold font-mono">Likes &gt; Dislikes</span> mint 15 HP community points.</li>
                          <li>If dislikes exceed likes, points are automatically reversed and auditing warnings are logged in profile ledger.</li>
                        </ul>
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}

              {/* TAB 2: EXPLORE DRIVES & ACTIVE PROJECTS */}
              {activeTab === "explore" && (
                <motion.div
                  key="explore-tab"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold font-display text-slate-100">Verifiable Civic Drives</h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Assigned workers receive guaranteed Humanity Points after automated AI hourly progress analysis.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2.5 py-1 rounded bg-[#1A1D23] border border-white/5 font-mono text-orange-400 font-bold">
                        {projects.length} Active drives
                      </span>
                    </div>
                  </div>

                  {/* ACTIVE PROJECTS LIST */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {projects.map(proj => {
                      const isAssigned = proj.assignedWorkers.includes(currentUser.id);
                      return (
                        <div key={proj.id} className="bg-[#1A1D23] border border-white/5 rounded-3xl p-5 flex flex-col justify-between shadow-xl">
                          <div>
                            <div className="flex items-center justify-between gap-4 mb-3">
                              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                                proj.status === "ACTIVE" 
                                  ? "bg-orange-950/40 text-orange-400 border border-orange-500/20 animate-pulse" 
                                  : proj.status === "COMPLETED" 
                                  ? "bg-cyan-950/40 text-cyan-400 border border-cyan-500/20"
                                  : "bg-[#0A0A0B] text-slate-500 border border-white/10"
                              }`}>
                                {proj.status}
                              </span>
                              <span className="text-xs font-mono font-bold text-orange-400">
                                +{proj.pointsEarned} HP Bounty
                              </span>
                            </div>

                            <h3 className="text-base font-bold font-display text-slate-100">{proj.title}</h3>
                            <p className="text-xs text-slate-400 leading-relaxed mt-2 line-clamp-3">{proj.description}</p>

                            <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-mono">
                              <div className="bg-[#0A0A0B] p-2 rounded-2xl border border-white/5">
                                <p className="text-[9px] text-slate-500 font-bold">RECRUITS</p>
                                <p className="text-slate-300 mt-0.5">{proj.assignedWorkers.length} / {proj.maxWorkers}</p>
                              </div>
                              <div className="bg-[#0A0A0B] p-2 rounded-2xl border border-white/5">
                                <p className="text-[9px] text-slate-500 font-bold">LISTING FEE</p>
                                <p className="text-slate-300 mt-0.5">{proj.listingFeePaid ? "Paid ($10)" : "Pending"}</p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-5 pt-4 border-t border-white/5 flex items-center gap-3">
                            {proj.status === "ACTIVE" ? (
                              <button
                                onClick={() => handleApplyProject(proj.id)}
                                className={`flex-1 py-2 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                  isAssigned 
                                    ? "bg-rose-950/20 border border-rose-500/30 text-rose-400 hover:bg-rose-950/40" 
                                    : "bg-orange-600 hover:bg-orange-500 text-white"
                                }`}
                              >
                                {isAssigned ? "Resign from drive slot" : "Register as driver/volunteer"}
                              </button>
                            ) : proj.status === "COMPLETED" ? (
                              <span className="flex-1 text-center py-1.5 text-xs font-mono font-bold text-cyan-400 flex items-center justify-center gap-1">
                                <CheckCircle size={14} /> Drive successfully verified!
                              </span>
                            ) : (
                              <span className="flex-1 text-center py-1.5 text-xs font-mono font-bold text-slate-500">
                                drive under validation review
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* TAB 3: BLOOD BANK REDEMPTIONS */}
              {activeTab === "blood" && (
                <motion.div
                  key="blood-tab"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  <div className="border-b border-white/5 pb-4">
                    <h2 className="text-xl font-bold font-display text-slate-100 flex items-center gap-2">
                      <Heart className="text-rose-500 fill-rose-500 animate-pulse" size={20} />
                      Liquid Blood Bank Integration
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Redeem humanity points for free blood bags from authorized ground-level clinics.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* CLINICS DIRECTORY */}
                    <div className="lg:col-span-2 space-y-4">
                      {bloodBanks.map(bank => (
                        <div
                          key={bank.id}
                          className={`p-5 rounded-3xl border transition-all cursor-pointer ${
                            selectedBloodBank?.id === bank.id 
                              ? "bg-rose-950/10 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.05)]" 
                              : "bg-[#1A1D23] border border-white/5 hover:border-white/10"
                          }`}
                          onClick={() => {
                            setSelectedBloodBank(bank);
                            setRedeemError("");
                            setRedeemStatus("idle");
                          }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-bold font-display text-slate-100 flex items-center gap-1.5">
                                <MapPin size={15} className="text-rose-400" />
                                {bank.name}
                              </h3>
                              <p className="text-xs text-slate-400 mt-1">{bank.address}</p>
                              
                              {/* Coordinates */}
                              <p className="text-[10px] text-slate-500 font-mono mt-1">
                                Coord: {bank.locationLat}° N, {bank.locationLng}° E
                              </p>
                            </div>

                            <span className="text-[10px] px-2.5 py-0.5 rounded bg-rose-950/40 text-rose-400 border border-rose-500/20 font-mono font-bold uppercase tracking-wider">
                              Authorized Clinic
                            </span>
                          </div>

                          {/* Inventory Pill grid */}
                          <div className="mt-4 border-t border-white/5 pt-4">
                            <span className="text-[9px] text-slate-500 uppercase font-bold font-mono tracking-widest block mb-2">
                              Bags inventory in stock
                            </span>
                            <div className="flex flex-wrap gap-1.5 font-mono">
                              {Object.entries(bank.inventory).map(([group, count]) => {
                                const countNum = count as number;
                                return (
                                  <span
                                    key={group}
                                    className={`text-[10px] px-2 py-0.5 rounded-lg ${
                                      countNum > 0 
                                        ? "bg-[#0A0A0B] text-slate-300 border border-white/5" 
                                        : "bg-[#0A0A0B] text-slate-600 border border-white/5"
                                    }`}
                                  >
                                    {group}: <span className={countNum > 0 ? "text-orange-400 font-bold" : ""}>{countNum}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* REDEMPTION CALCULATOR */}
                    <div>
                      {selectedBloodBank ? (
                        <div className="bg-[#1A1D23] border border-white/5 p-5 rounded-3xl sticky top-24 shadow-lg">
                          <h3 className="text-sm font-bold font-display uppercase tracking-wider text-slate-100 mb-4 flex items-center gap-1.5">
                            <Heart size={15} className="text-rose-500" />
                            Claim Redemption Bag
                          </h3>

                          {redeemError && (
                            <div className="p-3 bg-[#1A1D23] border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2 mb-4 font-mono">
                              <AlertCircle size={14} />
                              <span>{redeemError}</span>
                            </div>
                          )}

                          {redeemStatus === "success" && (
                            <div className="p-3 bg-[#1A1D23] border border-orange-500/20 text-orange-400 text-xs rounded-xl flex items-center gap-2 mb-4 font-mono">
                              <CheckCircle size={14} />
                              <span>Redemption confirmed! Receipt logged to point ledger-trail.</span>
                            </div>
                          )}

                          <div className="space-y-4">
                            <div>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">CLINIC NODE</p>
                              <p className="text-xs text-slate-200 mt-1 font-semibold">{selectedBloodBank.name}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">BLOOD GROUP</label>
                                <select
                                  value={selectedBloodGroup}
                                  onChange={(e) => setSelectedBloodGroup(e.target.value)}
                                  className="w-full text-xs bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500/50 font-mono"
                                >
                                  {Object.keys(selectedBloodBank.inventory).map(grp => (
                                    <option key={grp} value={grp}>{grp}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">BAG UNITS</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={5}
                                  value={redeemUnits}
                                  onChange={(e) => setRedeemUnits(Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-full text-xs bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-1.5 text-slate-100 focus:outline-none focus:border-orange-500/50 font-mono"
                                />
                              </div>
                            </div>

                            {/* COST SUMMARY PANEL */}
                            <div className="bg-[#0A0A0B] p-4 rounded-2xl border border-white/5 space-y-2">
                              <div className="flex justify-between text-xs font-mono">
                                <span className="text-slate-500">Category Tariff</span>
                                <span className="text-slate-300 font-bold">
                                  {["A-", "B-", "AB-", "O-"].includes(selectedBloodGroup) 
                                    ? "Rare (250 HP/bag)" 
                                    : selectedBloodGroup === "Golden Blood" 
                                    ? "Golden (1,000 HP/bag)" 
                                    : "Positive (125 HP/bag)"}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs font-mono border-t border-white/5 pt-2 mt-1">
                                <span className="text-slate-500">HP Balance</span>
                                <span className="text-slate-300 font-bold">{currentUser.humanityPoints} HP</span>
                              </div>
                              <div className="flex justify-between text-sm font-mono border-t border-white/5 pt-2 mt-1">
                                <span className="text-orange-400 font-bold">Total Tariff</span>
                                <span className="text-orange-400 font-black">
                                  {redeemUnits * (["A-", "B-", "AB-", "O-"].includes(selectedBloodGroup) ? 250 : selectedBloodGroup === "Golden Blood" ? 1000 : 125)} HP
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={handleRedeemBlood}
                              disabled={redeemStatus === "processing" || redeemStatus === "success"}
                              className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-[0_4px_20px_rgba(249,115,22,0.15)] cursor-pointer"
                            >
                              Confirm Redemption Claim
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center border border-dashed border-white/10 rounded-3xl bg-[#1A1D23]/40 text-slate-500 text-xs italic leading-relaxed">
                          Please select an authorized clinic directory card on the left to activate redemption panel.
                        </div>
                      )}
                    </div>

                  </div>
                </motion.div>
              )}

              {/* TAB 4: EMT AMBULANCE DISPATCH & TRANSIT */}
              {activeTab === "ambulance" && (
                <motion.div
                  key="ambulance-tab"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  <div className="border-b border-white/5 pb-4">
                    <h2 className="text-xl font-bold font-display text-slate-100 flex items-center gap-2">
                      <Truck className="text-orange-500" size={20} />
                      Ambulance EMS Tracking
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Order emergency ambulance dispatch directly using Humanity Points (tariff: 1 HP per KM).
                    </p>
                  </div>

                  {/* ACTIVE LIVE MAP AND DRIVER CARD */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* DISPATCH PROGRESS DETAILS */}
                    <div className="lg:col-span-2 space-y-6">
                      <LiveMapTracker
                        pickupLat={pickupCoords.lat}
                        pickupLng={pickupCoords.lng}
                        destLat={destCoords.lat}
                        destLng={destCoords.lng}
                        isActive={isAmbulanceTransit}
                        onTripCompleted={handleAmbulanceCompleted}
                        distanceKm={rideDistance}
                      />

                      {/* ACTIVE DRIVER CARD */}
                      {isAmbulanceTransit && (
                        <div className="bg-[#1A1D23] border border-orange-500/30 p-4 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                          <div className="flex items-center gap-3">
                            <img
                              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop"
                              alt="Driver Arjun"
                              className="w-12 h-12 rounded-full border border-orange-500 object-cover"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-sm text-slate-100">Arjun Yadav</span>
                                <span className="text-[9px] bg-orange-950/40 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded font-bold font-mono">
                                  EMT RESPONDER
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">Fleet ID: MH-43-AMB-9021 • Active Navigation</p>
                            </div>
                          </div>

                          <div className="text-left sm:text-right font-mono">
                            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Assigned Mobile</p>
                            <p className="text-xs text-slate-300 font-semibold mt-0.5">+91 65432 10987</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* DISPATCH CONTROLLER PANEL */}
                    <div className="bg-[#1A1D23] border border-white/5 p-5 rounded-3xl h-fit shadow-lg">
                      <h3 className="text-sm font-bold font-display uppercase tracking-wider text-slate-100 mb-4 flex items-center gap-1.5">
                        <Compass size={15} className="text-orange-500 animate-spin" style={{ animationDuration: '6s' }} />
                        Dispatch coordinates
                      </h3>

                      <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-4 font-mono">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">PICKUP LAT</label>
                            <input
                              type="number"
                              step="0.0001"
                              value={pickupCoords.lat}
                              onChange={(e) => setPickupCoords({ ...pickupCoords, lat: parseFloat(e.target.value) || 19.0760 })}
                              disabled={isAmbulanceTransit}
                              className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500/50"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">PICKUP LNG</label>
                            <input
                              type="number"
                              step="0.0001"
                              value={pickupCoords.lng}
                              onChange={(e) => setPickupCoords({ ...pickupCoords, lng: parseFloat(e.target.value) || 72.8777 })}
                              disabled={isAmbulanceTransit}
                              className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500/50"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 font-mono">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">DESTINATION LAT</label>
                            <input
                              type="number"
                              step="0.0001"
                              value={destCoords.lat}
                              onChange={(e) => setDestCoords({ ...destCoords, lat: parseFloat(e.target.value) || 18.9322 })}
                              disabled={isAmbulanceTransit}
                              className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500/50"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">DESTINATION LNG</label>
                            <input
                              type="number"
                              step="0.0001"
                              value={destCoords.lng}
                              onChange={(e) => setDestCoords({ ...destCoords, lng: parseFloat(e.target.value) || 72.8354 })}
                              disabled={isAmbulanceTransit}
                              className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500/50"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">CALCULATED ROUTE KM</label>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={rideDistance}
                            onChange={(e) => setRideDistance(Math.max(1, parseFloat(e.target.value) || 1))}
                            disabled={isAmbulanceTransit}
                            className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500/50 font-mono"
                          />
                        </div>

                        {/* FARE FALLBACK CHECK CARD */}
                        <div className="bg-[#0A0A0B] p-4 rounded-2xl border border-white/5 text-[11px] leading-relaxed text-slate-400 space-y-1">
                          <p className="font-bold text-slate-200 uppercase font-mono text-[9px] mb-1">Insufficient point Overage fallback</p>
                          <p>Current humanity balance: <span className="font-bold text-slate-200">{currentUser.humanityPoints} HP</span></p>
                          {currentUser.humanityPoints < Math.ceil(rideDistance) ? (
                            <p className="text-amber-500 font-semibold font-mono">
                              ⚠️ Low Balance. Remaining {Math.ceil(rideDistance) - currentUser.humanityPoints} km transit will charge fallback rate of <span className="font-bold text-slate-200">$0.10/km</span> (${((Math.ceil(rideDistance) - currentUser.humanityPoints) * 0.10).toFixed(2)}) via linked card.
                            </p>
                          ) : (
                            <p className="text-orange-400 font-mono">
                              ✓ Safe. Points fully cover total route distance burn. No cash fallback fee.
                            </p>
                          )}
                        </div>

                        <button
                          onClick={handleDispatchAmbulance}
                          disabled={isAmbulanceTransit}
                          className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-[0_4px_12px_rgba(249,115,22,0.15)]"
                          id="dispatch-button"
                        >
                          <Truck size={14} /> {isAmbulanceTransit ? "EMERGENCY DISPATCH IN TRANSIT" : "SUMMON EMS DISPATCH NOW"}
                        </button>
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}

              {/* TAB 5: ORG LEADER DASHBOARD */}
              {activeTab === "org" && currentUser.role === "ORGANIZATION_LEADER" && (
                <motion.div
                  key="org-tab"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  <div className="border-b border-white/5 pb-4">
                    <h2 className="text-xl font-bold font-display text-slate-100">Organization Leader Control Room</h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Launch verification campaigns ($10 fee), check follower registrations, and upload hourly videos.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* PROJECTS PANEL & PROOFS UPLOAD */}
                    <div className="lg:col-span-2 space-y-6">
                      
                      {/* AI Video Scan Feedback alert banner */}
                      {aiScanFeedback && (
                        <div className={`p-4 rounded-3xl border flex items-start gap-3 ${
                          aiScanFeedback.isDeepfake 
                            ? "bg-rose-950/20 border-rose-500/30 text-rose-400" 
                            : "bg-orange-950/20 border border-orange-500/30 text-orange-400"
                        }`}>
                          {aiScanFeedback.isDeepfake ? <ShieldAlert size={20} className="shrink-0 mt-0.5" /> : <ShieldCheck size={20} className="shrink-0 mt-0.5" />}
                          <div>
                            <p className="text-sm font-bold font-mono uppercase">
                              {aiScanFeedback.isDeepfake ? "⚠️ Deepfake Fraud Warning" : "✓ Video Scan Approved"}
                            </p>
                            <p className="text-xs opacity-90 mt-1 leading-normal">{aiScanFeedback.reason}</p>
                          </div>
                        </div>
                      )}

                      {/* LIST OF CURRENT ORGANIZATION DRIVES WITH PROOF SUBMIT FORMS */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold font-mono text-slate-400 uppercase tracking-widest">Active campaigns listings</h3>
                        {projects.map(proj => (
                          <div key={proj.id} className="bg-[#1A1D23] border border-white/5 p-5 rounded-3xl space-y-4">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <h4 className="font-bold font-display text-slate-100">{proj.title}</h4>
                                <p className="text-xs text-slate-400 mt-0.5">Status: <span className="font-mono text-orange-400 font-semibold">{proj.status}</span></p>
                              </div>

                              {proj.status === "PENDING_PAYMENT" && (
                                <button
                                  onClick={() => handlePayListingFee(proj.id)}
                                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <DollarSign size={12} /> Pay $10 Fee
                                </button>
                              )}

                              {proj.status === "ACTIVE" && (
                                <button
                                  onClick={() => {
                                    setUploadingProofFor(proj.id);
                                    setAiScanFeedback(null);
                                  }}
                                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Video size={12} /> Upload Hourly Proof
                                </button>
                              )}
                            </div>

                            {/* Applied workers block */}
                            <div className="bg-[#0A0A0B] p-3 rounded-2xl border border-white/5">
                              <span className="text-[9px] text-slate-500 uppercase font-mono font-semibold block mb-2">Registered Workers list ({proj.assignedWorkers.length} total)</span>
                              {proj.assignedWorkers.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {proj.assignedWorkers.map(wid => {
                                    return (
                                      <span key={wid} className="text-[10px] px-2 py-0.5 rounded-lg bg-[#1A1D23] text-slate-300 border border-white/5 font-mono">
                                        Worker ID: {wid}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-600 italic">No group members have registered for slots yet.</span>
                              )}
                            </div>

                            {/* Dynamic Upload Proof overlay form */}
                            {uploadingProofFor === proj.id && (
                              <form onSubmit={handleSubmitProof} className="bg-[#0A0A0B] p-4 rounded-2xl border border-white/5 space-y-3 shadow-inner">
                                <h5 className="text-xs font-bold text-slate-200">Submit Verification Hourly Proof</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Proof Video URL (HLS/MP4)</label>
                                    <input
                                      type="text"
                                      value={proofVideoUrl}
                                      onChange={(e) => setProofVideoUrl(e.target.value)}
                                      placeholder="https://www.w3schools.com/html/mov_bbb.mp4"
                                      className="w-full text-xs bg-[#1A1D23] border border-white/10 rounded-xl px-2.5 py-1.5 text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-orange-500/50 font-mono"
                                      required
                                    />
                                    <p className="text-[8px] text-slate-500 mt-1 leading-normal font-mono">
                                      💡 Tip: Include "deepfake" in URL to test detection scanner logic!
                                    </p>
                                  </div>
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">After Completion Photo URL</label>
                                    <input
                                      type="text"
                                      value={proofAfterUrl}
                                      onChange={(e) => setProofAfterUrl(e.target.value)}
                                      placeholder="https://images.unsplash.com/photo-..."
                                      className="w-full text-xs bg-[#1A1D23] border border-white/10 rounded-xl px-2.5 py-1.5 text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-orange-500/50 font-mono"
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                                  <button
                                    type="button"
                                    onClick={() => setUploadingProofFor(null)}
                                    className="px-2.5 py-1 border border-white/10 text-slate-400 text-[11px] rounded-lg hover:text-slate-200 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white text-[11px] rounded-lg font-bold cursor-pointer"
                                  >
                                    Submit for AI Scan
                                  </button>
                                </div>
                              </form>
                            )}

                          </div>
                        ))}
                      </div>

                    </div>

                    {/* LAUNCH NEW CAMPAIGN DRIVE FORM */}
                    <div className="bg-[#1A1D23] border border-white/5 p-5 rounded-3xl h-fit shadow-lg">
                      <h3 className="text-sm font-bold font-display uppercase tracking-wider text-slate-100 mb-4 flex items-center gap-1.5">
                        <Plus size={16} className="text-orange-500" />
                        Initiate Campaign Drive
                      </h3>

                      <form onSubmit={handleLaunchProject} className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">CAMPAIGN TITLE</label>
                          <input
                            type="text"
                            required
                            value={newProjectForm.title}
                            onChange={(e) => setNewProjectForm({ ...newProjectForm, title: e.target.value })}
                            placeholder="Versova Garbage Separation"
                            className="w-full text-xs bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-orange-500/50"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">DESCRIPTION</label>
                          <textarea
                            rows={4}
                            required
                            value={newProjectForm.description}
                            onChange={(e) => setNewProjectForm({ ...newProjectForm, description: e.target.value })}
                            placeholder="Detailed physical tasks checklist, hours of operation, and target outcomes..."
                            className="w-full text-xs bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-orange-500/50 resize-none font-sans"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">MAX VOLUNTEERS</label>
                            <input
                              type="number"
                              min={5}
                              max={50}
                              value={newProjectForm.maxWorkers}
                              onChange={(e) => setNewProjectForm({ ...newProjectForm, maxWorkers: parseInt(e.target.value) || 30 })}
                              className="w-full text-xs bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-1.5 text-slate-100 focus:outline-none focus:border-orange-500/50 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">LISTING FEE TARIFF</label>
                            <div className="w-full text-xs bg-[#0A0A0B] border border-white/5 rounded-xl px-3 py-2 text-slate-400 font-mono font-bold">
                              $10.00 USD
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">BEFORE RECON PHOTO (URL)</label>
                          <input
                            type="text"
                            required
                            value={newProjectForm.beforePhotoUrl}
                            onChange={(e) => setNewProjectForm({ ...newProjectForm, beforePhotoUrl: e.target.value })}
                            placeholder="https://images.unsplash.com/photo-..."
                            className="w-full text-xs bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-orange-500/50"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={creatingProject}
                          className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-[0_4px_12px_rgba(249,115,22,0.15)] cursor-pointer"
                        >
                          {creatingProject ? "Saving Campaign Draft..." : "Publish Campaign Drive"}
                        </button>
                      </form>
                    </div>

                  </div>
                </motion.div>
              )}

              {/* TAB 6: PUBLIC PROFILE & IMMUTABLE LEDGER */}
              {activeTab === "profile" && (
                <motion.div
                  key="profile-tab"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  {/* HERO POINT CARD */}
                  <div className="bg-[#111115] border border-white/5 p-6 rounded-[32px] relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-pink-500/5 rounded-full blur-[100px] pointer-events-none" />
                    
                    <div className="flex items-center gap-5">
                      {/* Instagram style gradient story ring around profile page avatar */}
                      <div className="p-[3px] bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] rounded-full shrink-0 shadow-lg">
                        <img
                          src={currentUser.profilePicUrl || "https://api.dicebear.com/7.x/bottts/svg"}
                          alt={currentUser.fullName}
                          className="w-20 h-20 rounded-full border-4 border-[#111115] object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-extrabold font-syne text-slate-100">{currentUser.fullName}</h2>
                          {currentUser.isVerified && (
                            <ShieldCheck className="text-pink-500" size={18} />
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-mono">@{currentUser.username} • Created: {new Date(currentUser.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs text-slate-300 mt-2.5 leading-relaxed max-w-md">{currentUser.bio}</p>
                        
                        <div className="flex gap-2 items-center mt-3">
                          <button
                            onClick={() => {
                              const profileUrl = `${window.location.origin}/?tab=profile&user=${currentUser.username}`;
                              navigator.clipboard.writeText(profileUrl);
                              triggerToast("Profile shareable URL copied to clipboard!");
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-500/10 via-purple-600/10 to-indigo-600/10 hover:opacity-90 border border-pink-500/30 text-pink-400 text-[10px] font-black uppercase tracking-wider rounded-full transition-all cursor-pointer font-mono shadow-sm"
                          >
                            <Copy size={11} className="text-pink-500" />
                            Copy Profile Link
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-start md:items-end gap-2 font-mono">
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Liquid Balance</p>
                      <HumanityPointBadge points={currentUser.humanityPoints} size="lg" />
                      <button
                        onClick={() => setShowBuyModal(true)}
                        className="text-[9px] font-black text-pink-400 hover:text-pink-300 hover:underline flex items-center gap-1 mt-1 font-mono cursor-pointer uppercase tracking-wider"
                      >
                        <Plus size={10} /> Buy Humanity Points Cash-Value
                      </button>
                    </div>
                  </div>

                  {/* DOUBLE COLUMN: LEFT IS ACHIEVEMENTS, RIGHT IS CRYPTO LEDGER TIMELINE */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    <div className="space-y-6">
                      {/* PAY & QR PROFILE CARD */}
                      <div className="bg-[#111115] border border-white/5 p-5 rounded-3xl shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full blur-2xl pointer-events-none" />
                        
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xs font-black font-syne uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
                            <RefreshCw size={13} className="text-pink-500 animate-spin-slow" />
                            Profile QR Pay Badge
                          </h3>
                          <span className="text-[8px] bg-pink-500/10 border border-pink-500/20 text-pink-400 font-mono font-bold px-1.5 py-0.5 rounded uppercase">
                            P2P LEDGER
                          </span>
                        </div>

                        <div className="bg-white p-3 rounded-2xl w-fit mx-auto shadow-xl mb-4 border border-pink-500/10">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`civic-z:tip?username=${currentUser.username}`)}&color=12141a&bgcolor=ffffff`}
                            alt="Your Public Profile Pay QR Code"
                            className="w-36 h-36"
                          />
                        </div>

                        <div className="text-center space-y-3">
                          <div>
                            <span className="text-[8px] text-slate-500 uppercase font-mono tracking-wider font-black block">NODE INCOMING ADDRESS</span>
                            <span className="text-xs font-mono font-bold text-pink-400 block mt-0.5">@{currentUser.username}</span>
                          </div>
                          
                          <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
                            Scan this node code from another node's terminal to tip or transfer Humanity Points instantly.
                          </p>

                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => {
                                setTipTargetUsername("");
                                setTipError("");
                                setTipStatus("idle");
                                setShowTipModal(true);
                              }}
                              className="flex-1 py-2.5 text-[9px] font-extrabold tracking-widest uppercase bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:opacity-95 text-white rounded-xl transition-all shadow-[0_4px_12px_rgba(238,42,123,0.25)] cursor-pointer text-center"
                            >
                              Simulate Tip
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`@${currentUser.username}`);
                                setCopiedKey(true);
                                triggerToast("Node address key copied to clipboard!");
                                setTimeout(() => setCopiedKey(false), 2000);
                              }}
                              className="px-3 py-2.5 text-[9px] font-extrabold border border-white/10 hover:bg-white/5 text-slate-300 rounded-xl transition-all cursor-pointer min-w-[70px] uppercase font-mono"
                              title="Copy Username Node Key"
                            >
                              {copiedKey ? "Copied!" : "Copy Key"}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* ACHIEVEMENTS BLOCK */}
                      <div className="bg-[#111115] border border-white/5 p-5 rounded-3xl h-fit shadow-lg">
                        <h3 className="text-xs font-black font-syne uppercase tracking-wider text-slate-100 mb-4 flex items-center gap-1.5">
                          <Award size={16} className="text-pink-500" />
                          Verified Achievements
                        </h3>

                        <div className="space-y-4">
                          {profileAchievements.length === 0 ? (
                            <p className="text-xs text-slate-500 py-6 text-center italic font-mono">
                              No physical labor achievements verified on ledger yet.
                            </p>
                          ) : (
                            profileAchievements.map(ach => (
                              <div key={ach.id} className="bg-[#030303] border border-white/5 p-3.5 rounded-2xl flex items-start gap-2.5">
                                <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 shrink-0">
                                  <Award size={16} />
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-slate-100">{ach.title}</h4>
                                  <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{ach.description}</p>
                                  <div className="flex items-center gap-2 mt-2 text-[9px] text-slate-500 font-mono">
                                    <span>Issuer: {ach.orgName}</span>
                                    <span>•</span>
                                    <span className="text-pink-400 font-bold">+{ach.pointsEarned} HP</span>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* LEDGER BLOCK TIMELINE */}
                    <div className="lg:col-span-2">
                      <LedgerTimeline
                        userId={currentUser.id}
                        transactions={profileLedger}
                        onRefreshTrigger={reloadUserProfile}
                      />
                    </div>

                  </div>
                </motion.div>
              )}

              {/* TAB 8: GOOGLE WORKSPACE DECENTRALIZED CONNECT HUB */}
              {activeTab === "workspace" && (
                <motion.div
                  key="workspace-tab"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  {accessToken ? (
                    <WorkspaceDashboard
                      currentUser={currentUser}
                      accessToken={accessToken}
                      onRefreshHP={reloadUserProfile}
                      triggerToast={triggerToast}
                    />
                  ) : (
                    <div className="bg-[#111115] border border-white/5 p-12 rounded-[32px] text-center max-w-xl mx-auto space-y-6 shadow-xl my-8">
                      <div className="inline-flex p-4 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400">
                        <Globe size={32} className="animate-spin-slow" />
                      </div>
                      <h3 className="text-xl font-extrabold font-syne text-white">Google Workspace Node Link Required</h3>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">
                        To access files on Google Drive, query volunteer updates from Gmail, register contacts, or post to Google Chat, you must securely bind your active Google account.
                      </p>
                      <button
                        onClick={handleGoogleSignIn}
                        disabled={isGoogleLoading}
                        className="px-6 py-3 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:opacity-95 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Globe size={14} className="animate-spin-slow" />
                        {isGoogleLoading ? "Linking Google Node..." : "Link Google Workspace"}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 7: CRYPTOGRAPHIC LEDGER AUDIT TERMINAL */}
              {activeTab === "ledger" && (
                <motion.div
                  key="ledger-tab"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  {/* Ledger Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-extrabold font-syne text-slate-100 flex items-center gap-2">
                        <Key className="text-pink-500" size={20} />
                        Ledger Cryptographic Audit Panel
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Decentralized zero-trust audit terminal. Monitor block linkages, simulate DB injection vectors, and restore database state under consensus rules.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={runGlobalIntegrityScan}
                        disabled={ledgerAuditLoading}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:opacity-95 text-white text-xs font-black font-mono rounded-2xl transition-all cursor-pointer shadow-md disabled:opacity-50 uppercase tracking-wider"
                      >
                        <RefreshCw size={12} className={ledgerAuditLoading ? "animate-spin" : ""} />
                        {ledgerAuditLoading ? "Scanning Node..." : "Integrity Healthcheck"}
                      </button>
                    </div>
                  </div>

                  {/* Quick DB Topology Info (Postgres vs SQLite from README) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                      onClick={() => {
                        setDbOption("postgres");
                        addBlockchainLog("Configured database driver to Option A: Production PostgreSQL.");
                      }}
                      className={`p-4 rounded-3xl border transition-all cursor-pointer flex justify-between items-start ${
                        dbOption === "postgres" 
                          ? "bg-pink-500/5 border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.03)]" 
                          : "bg-[#111115]/30 border-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-200 font-mono">OPTION A: Postgres (Production-Parity)</p>
                        <p className="text-[10px] text-slate-400">PostgreSQL + Redis topology. Enforces append-only constraints via database trigger.</p>
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        dbOption === "postgres" ? "bg-pink-500/20 text-pink-400 border border-pink-500/30" : "bg-white/5 text-slate-500"
                      }`}>
                        {dbOption === "postgres" ? "ACTIVE" : "STANDBY"}
                      </span>
                    </div>

                    <div 
                      onClick={() => {
                        setDbOption("sqlite");
                        addBlockchainLog("Configured database driver to Option B: Zero-Infra SQLite.");
                      }}
                      className={`p-4 rounded-3xl border transition-all cursor-pointer flex justify-between items-start ${
                        dbOption === "sqlite" 
                          ? "bg-pink-500/5 border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.03)]" 
                          : "bg-[#111115]/30 border-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-200 font-mono">OPTION B: SQLite Local Dev</p>
                        <p className="text-[10px] text-slate-400">Zero-infrastructure SQLite instance. App-level chained protection remains fully active.</p>
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        dbOption === "sqlite" ? "bg-pink-500/20 text-pink-400 border border-pink-500/30" : "bg-white/5 text-slate-500"
                      }`}>
                        {dbOption === "sqlite" ? "ACTIVE" : "STANDBY"}
                      </span>
                    </div>
                  </div>

                  {/* Network Status & Terminal log feed */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Diagnostic Status Box */}
                    <div className="lg:col-span-1 space-y-6">
                      <div className="bg-[#111115] border border-white/5 rounded-[32px] p-5 shadow-lg space-y-4">
                        <h3 className="text-xs font-black font-syne uppercase tracking-wider text-slate-300">
                          Diagnostic Status
                        </h3>

                        {globalVerification ? (
                          <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center py-6 ${
                            globalVerification.secure 
                              ? "bg-emerald-500/5 border-emerald-500/15 text-emerald-400" 
                              : "bg-rose-500/5 border-rose-500/15 text-rose-400 animate-pulse"
                          }`}>
                            {globalVerification.secure ? (
                              <ShieldCheck className="w-12 h-12 text-emerald-400 mb-2 shrink-0" />
                            ) : (
                              <ShieldAlert className="w-12 h-12 text-rose-400 mb-2 shrink-0" />
                            )}
                            <p className="text-sm font-bold uppercase tracking-wider font-mono">
                              {globalVerification.secure ? "SYSTEM INTEGRAL" : "CHAIN MISMATCH!"}
                            </p>
                            <p className="text-[11px] opacity-80 mt-1 leading-normal font-mono">
                              {globalVerification.secure 
                                ? `Scanned ${globalLedger.length} blocks network-wide. All cryptographic hashes securely aligned.` 
                                : "Unapproved manual database edit broke SHA-256 point sequence alignment."}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-white/5 p-4 rounded-2xl text-center py-6 text-slate-400 font-mono text-xs">
                            <RefreshCw size={24} className="mx-auto text-slate-500 mb-2 animate-pulse" />
                            Awaiting cryptographic diagnostic scan trigger...
                          </div>
                        )}

                        {/* Interactive Laboratory Controls */}
                        <div className="pt-2 space-y-2.5">
                          <p className="text-[9px] text-slate-500 font-mono font-black uppercase tracking-widest">
                            VULNERABILITY LABORATORY
                          </p>
                          
                          <button
                            onClick={() => simulateTamper()}
                            disabled={tamperLoading}
                            className="w-full py-2.5 bg-rose-950/20 border border-rose-500/20 hover:border-rose-500 hover:bg-rose-950/40 text-rose-400 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <ShieldAlert size={13} />
                            {tamperLoading ? "Exploiting..." : "Simulate DB-Level Hack"}
                          </button>

                          <button
                            onClick={triggerLedgerRestore}
                            disabled={restoreLoading}
                            className="w-full py-2.5 bg-emerald-950/20 border border-emerald-500/20 hover:border-emerald-500 hover:bg-emerald-950/40 text-emerald-400 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <ShieldCheck size={13} />
                            {restoreLoading ? "Restoring..." : "Consensus Self-Repair"}
                          </button>
                        </div>
                      </div>

                      {/* Log monitor terminal */}
                      <div className="bg-[#030303] border border-white/5 p-4 rounded-3xl shadow-md font-mono">
                        <div className="flex justify-between items-center pb-2.5 border-b border-white/5 mb-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono text-[9px]">Node Diagnoses</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <div className="space-y-2 max-h-[160px] overflow-y-auto text-[10px] text-slate-300 leading-normal pr-1 scrollbar-thin">
                          {blockchainLogs.map((log, index) => (
                            <p key={index} className={log.includes("🚨") || log.includes("compromised") ? "text-rose-400" : log.includes("complete") || log.includes("restored") || log.includes("synchronized") ? "text-emerald-400" : "text-slate-400"}>
                              {log}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Block Ledger Explorer */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="bg-[#111115] border border-white/5 rounded-[32px] p-5 shadow-lg relative overflow-hidden">
                        <div className="flex justify-between items-center border-b border-white/5 pb-3.5 mb-4">
                          <div>
                            <h3 className="text-sm font-bold font-display uppercase tracking-wider text-slate-200">
                              Decentralized Block Explorer
                            </h3>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Network-wide append-only cryptographically chained ledger logs.
                            </p>
                          </div>
                          <span className="text-[10px] font-mono font-black text-pink-400 bg-pink-500/10 px-2.5 py-1 rounded-full border border-pink-500/20">
                            {globalLedger.length} BLOCKS
                          </span>
                        </div>

                        {/* Search and block listing */}
                        <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
                          {globalLedger.length === 0 ? (
                            <p className="text-xs text-slate-500 font-mono text-center py-12 italic">
                              No ledger transaction history loaded.
                            </p>
                          ) : (
                            globalLedger.map((tx, idx) => {
                              // Identify if this transaction has a valid link
                              let isValidLink = true;
                              if (globalVerification?.auditReports) {
                                // Find report for this user, check if corruptedIndex is triggered
                                const report = globalVerification.auditReports.find((r: any) => r.userId === tx.userId);
                                if (report && !report.verified) {
                                  // User is tampered. Sort user's ledger as backend does, check which blocks are compromised
                                  const userTxs = globalLedger
                                    .filter(t => t.userId === tx.userId)
                                    .sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                                  const localIndex = userTxs.findIndex(t => t.id === tx.id);
                                  if (localIndex >= report.corruptedIndex) {
                                    isValidLink = false;
                                  }
                                }
                              }

                              const blockNum = globalLedger.length - idx;
                              const isEarned = tx.amount > 0;
                              const userObj = allUsers.find(u => u.id === tx.userId);

                              return (
                                <div 
                                  key={tx.id} 
                                  className={`p-3.5 rounded-2xl bg-[#0A0A0B]/40 border transition-all ${
                                    isValidLink ? "border-white/5" : "border-rose-500/30 bg-rose-500/[0.01]"
                                  }`}
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#0A0A0B] text-slate-400 border border-white/5 font-mono">
                                        BLOCK #{blockNum}
                                      </span>
                                      {userObj && (
                                        <span className="text-[10px] font-semibold text-slate-300 font-mono">
                                          @{userObj.username}
                                        </span>
                                      )}
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        {new Date(tx.createdAt).toLocaleTimeString()}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                                        isValidLink ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" : "bg-rose-500/10 text-rose-400 border border-rose-500/25 animate-pulse"
                                      }`}>
                                        {isValidLink ? "Link Verified" : "Chain Broken"}
                                      </span>
                                      <span className={`text-xs font-mono font-bold ${isEarned ? "text-orange-400" : "text-rose-400"}`}>
                                        {isEarned ? `+${tx.amount}` : tx.amount} HP
                                      </span>
                                    </div>
                                  </div>

                                  <p className="text-xs text-slate-200 font-mono leading-normal">{tx.description}</p>
                                  <div className="text-[9px] text-slate-400 bg-[#0A0A0B]/60 p-2 rounded-xl border border-white/5 font-mono mt-2.5 space-y-1">
                                    <p className="truncate"><span className="text-slate-600">PREV_HASH:</span> {tx.previousHash}</p>
                                    <p className="truncate"><span className="text-slate-600">BLOCK_SIG:</span> {tx.currentHash}</p>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </main>

        </div>
      )}

      {/* FOOTER METRICS */}
      <footer className="border-t border-white/5 mt-auto py-6 bg-[#0A0A0B]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
          <p>© 2026 Civic Z Platform. Secure digital-physical civic verification ledger.</p>
          <div className="flex gap-4">
            <span>PUBLIC LEDGER</span>
            <span>•</span>
            <span>VERIFIED WORKPROOF</span>
            <span>•</span>
            <span>SECURE TRANSIT</span>
          </div>
        </div>
      </footer>

      {/* MODAL 1: BUY POINTS (UPI/CARD SIMULATOR) */}
      <AnimatePresence>
        {showBuyModal && currentUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1A1D23] border border-white/5 max-w-sm w-full p-6 rounded-3xl shadow-2xl relative"
            >
              <h3 className="text-base font-bold font-display uppercase tracking-wider text-slate-100 mb-3 flex items-center gap-1.5">
                <DollarSign size={18} className="text-orange-500" />
                Buy Humanity Points
              </h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Direct cash point purchase. Tariff: <span className="text-slate-100 font-semibold font-mono">$8.00 USD = 100 Humanity Points</span>. Funds are directly distributed to partner NGOs.
              </p>

              {buyingStatus === "success" ? (
                <div className="py-6 text-center text-orange-400 space-y-2">
                  <CheckCircle size={32} className="mx-auto" />
                  <p className="text-sm font-bold">UPI Payment Verified!</p>
                  <p className="text-xs text-slate-400 font-mono">Cryptographic block signed & added to ledger history.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">PURCHASE AMOUNT ($ USD)</label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={buyAmount}
                      onChange={(e) => setBuyAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full text-sm bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-orange-500/50"
                    />
                  </div>

                  <div className="bg-[#0A0A0B] p-3 rounded-2xl border border-white/5 text-xs font-mono space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">HP MINTED:</span>
                      <span className="text-orange-400 font-bold">+{Math.floor((buyAmount / 8) * 100)} HP</span>
                    </div>
                    <div className="flex justify-between border-t border-white/5 pt-1.5">
                      <span className="text-slate-500">PAYMENT ROUTE:</span>
                      <span className="text-slate-300 font-semibold">Simulated VPA / Stripe QR</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setShowBuyModal(false)}
                      className="flex-1 py-2 rounded-xl text-xs border border-white/10 hover:bg-white/5 transition-all text-slate-400 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBuyPoints}
                      disabled={buyingStatus === "processing"}
                      className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-[0_4px_12px_rgba(249,115,22,0.15)]"
                    >
                      {buyingStatus === "processing" ? "Verifying UPI Gateway..." : "Pay Instantly"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: USER KYC SUBMISSION */}
      <AnimatePresence>
        {showKycModal && currentUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1A1D23] border border-white/5 max-w-sm w-full p-6 rounded-3xl shadow-2xl"
            >
              <h3 className="text-base font-bold font-display uppercase tracking-wider text-slate-100 mb-2 flex items-center gap-1.5">
                <ShieldCheck size={18} className="text-orange-500" />
                Identity KYC Verification
              </h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Unlock official organization drives, community verification tasks, and claim rare blood bag categories by linking your government documentation key.
              </p>

              <form onSubmit={handleSubmitKyc} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">DOCUMENT TYPE</label>
                  <select
                    value={kycForm.docType}
                    onChange={(e) => setKycForm({ ...kycForm, docType: e.target.value })}
                    className="w-full text-xs bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500/50"
                  >
                    <option value="Aadhaar">Aadhaar Card (India)</option>
                    <option value="Passport">International Passport</option>
                    <option value="Voter ID">Election Card ID</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">DOCUMENT UNIQUE NUMBER</label>
                  <input
                    type="text"
                    required
                    value={kycForm.docNumber}
                    onChange={(e) => setKycForm({ ...kycForm, docNumber: e.target.value })}
                    placeholder="XXXX-XXXX-XXXX-8921"
                    className="w-full text-xs bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-orange-500/50 font-mono"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowKycModal(false)}
                    className="flex-1 py-2 rounded-xl text-xs border border-white/10 hover:bg-white/5 transition-all text-slate-400 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-[0_4px_12px_rgba(249,115,22,0.15)]"
                  >
                    Authenticate Identity
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: P2P TIPPING & QR SCANNER */}
      <AnimatePresence>
        {showTipModal && currentUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1A1D23] border border-white/5 max-w-md w-full p-6 rounded-3xl shadow-2xl relative my-8"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-base font-bold font-display uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
                    <Send size={18} className="text-orange-500" />
                    P2P Ledger Tip
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Transfer secure Humanity Points directly to another citizen's node ledger.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowTipModal(false);
                    setTipStatus("idle");
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <LogOut size={16} className="rotate-180" />
                </button>
              </div>

              {tipStatus === "success" ? (
                <div className="py-8 text-center text-orange-400 space-y-3">
                  <div className="w-16 h-16 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(249,115,22,0.2)]">
                    <CheckCircle size={36} className="text-orange-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-bold text-slate-100">Ledger Block Verified!</p>
                    <p className="text-xs text-slate-400">
                      Transferred <span className="text-orange-400 font-bold font-mono">{tipAmount} HP</span> successfully.
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono bg-[#0A0A0B] p-2.5 rounded-xl border border-white/5 max-w-xs mx-auto leading-normal">
                    SHA-256 Ledger link signed & appended. Node chain validated successfully.
                  </p>
                </div>
              ) : (
                <form onSubmit={(e) => handleSendTip(e)} className="space-y-4">
                  {tipError && (
                    <div className="p-3 bg-[#1A1D23] border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2 font-mono">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{tipError}</span>
                    </div>
                  )}

                  {/* SIMULATED SCANNING WINDOW */}
                  <div className="bg-[#0A0A0B] border border-white/5 rounded-2xl p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-xl pointer-events-none" />
                    
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                        📷 QR Camera Emulator
                      </span>
                      {tipStatus === "scanning" && (
                        <span className="text-[9px] text-orange-400 animate-pulse font-mono">
                          ⚡ Aligning Node Payload...
                        </span>
                      )}
                    </div>

                    {tipStatus === "scanning" ? (
                      <div className="h-32 bg-[#1A1D23]/50 rounded-xl relative flex flex-col items-center justify-center border border-orange-500/10">
                        {/* Red Scanning Laser Line */}
                        <motion.div
                          animate={{ y: [0, 110, 0] }}
                          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                          className="absolute left-0 right-0 h-0.5 bg-orange-500 shadow-[0_0_10px_#f97316] z-10"
                        />
                        <RefreshCw size={24} className="text-orange-500/40 animate-spin mb-2" />
                        <span className="text-[10px] text-slate-400 font-mono">Decoding cryptographic QR address...</span>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
                          To simulate a QR scan, select an active node (other citizen) below to trigger their QR scan payload:
                        </p>
                        
                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
                          {allUsers
                            .filter(u => u.id !== currentUser.id)
                            .map(u => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => {
                                  setTipStatus("scanning");
                                  setTipError("");
                                  setTimeout(() => {
                                    setTipTargetUsername(u.username);
                                    setTipStatus("idle");
                                  }, 1200);
                                }}
                                className="flex items-center gap-2 p-1.5 rounded-xl bg-[#1A1D23] border border-white/5 hover:border-orange-500/30 transition-all cursor-pointer text-left group"
                              >
                                <img
                                  src={u.profilePicUrl || "https://api.dicebear.com/7.x/bottts/svg"}
                                  alt={u.username}
                                  className="w-6 h-6 rounded-lg object-cover border border-white/10 group-hover:border-orange-500/30"
                                />
                                <div className="min-w-0">
                                  <p className="text-[10px] font-bold text-slate-300 truncate leading-tight group-hover:text-orange-400">
                                    {u.fullName}
                                  </p>
                                  <p className="text-[9px] text-slate-500 font-mono truncate">
                                    @{u.username}
                                  </p>
                                </div>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RECIPIENT USERNAME */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                      RECIPIENT NODE USERNAME
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-500 text-xs font-mono">@</span>
                      <input
                        type="text"
                        required
                        value={tipTargetUsername}
                        onChange={(e) => setTipTargetUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                        placeholder="recipient_username"
                        className="w-full text-xs bg-[#0A0A0B] border border-white/10 rounded-xl pl-7 pr-3 py-2 text-slate-200 focus:outline-none focus:border-orange-500/50 font-mono"
                      />
                    </div>
                  </div>

                  {/* TIP AMOUNT */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5 font-mono">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        TIP AMOUNT (HP)
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Available: <span className="text-orange-400 font-bold">{currentUser.humanityPoints} HP</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {[5, 15, 50, 100].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTipAmount(amt)}
                          className={`py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                            tipAmount === amt 
                              ? "bg-orange-500/10 border-orange-500/40 text-orange-400" 
                              : "bg-[#0A0A0B] border-white/5 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          +{amt} HP
                        </button>
                      ))}
                    </div>

                    <input
                      type="number"
                      min={1}
                      max={currentUser.humanityPoints}
                      value={tipAmount}
                      onChange={(e) => setTipAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full text-xs bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-orange-500/50 font-mono"
                    />
                  </div>

                  {/* LEDGER DETAILS PANEL */}
                  <div className="bg-[#0A0A0B] p-3 rounded-2xl border border-white/5 text-[10px] font-mono space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">MOCK TRANSACTION:</span>
                      <span className="text-slate-300 font-semibold">P2P TIPPING PROTOCOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">LIQUID HP REMAINING:</span>
                      <span className={`font-bold ${currentUser.humanityPoints - tipAmount < 0 ? 'text-rose-500' : 'text-slate-300'}`}>
                        {currentUser.humanityPoints - tipAmount} HP
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-white/5 pt-1.5">
                      <span className="text-slate-500">BLOCK VERIFICATION:</span>
                      <span className="text-orange-400 font-semibold">AUTOMATIC CONSENSUS</span>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTipModal(false);
                        setTipStatus("idle");
                      }}
                      className="flex-1 py-2 rounded-xl text-xs border border-white/10 hover:bg-white/5 transition-all text-slate-400 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={tipStatus === "processing" || tipStatus === "scanning" || currentUser.humanityPoints < tipAmount}
                      className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-[0_4px_12px_rgba(249,115,22,0.15)] disabled:opacity-50"
                    >
                      {tipStatus === "processing" ? "Verifying Block..." : "Authorize Tip"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST NOTIFICATION FEEDBACK */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#1A1D23] border border-orange-500/20 text-slate-100 p-4 rounded-2xl shadow-2xl flex items-center gap-3 font-sans"
          >
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20 shrink-0">
              <CheckCircle size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">Ledger Node Alert</p>
              <p className="text-xs text-slate-300 mt-0.5 truncate leading-tight font-mono">{toastMessage}</p>
            </div>
            <button 
              onClick={() => setShowToast(false)}
              className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-white/5 cursor-pointer text-xs font-bold font-mono"
            >
              DISMISS
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
