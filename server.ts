import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { eq, desc } from "drizzle-orm";
import { db as pgDb } from "./src/db/index.ts";
import * as schema from "./src/db/schema.ts";

import { 
  Role, User, Organization, Group, Project, HourlyProof, Comment, Post, PointLedger, 
  BloodBank, BloodRedemption, AmbulanceRide, Story, Achievement 
} from "./src/types.ts";

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

// Define in-memory state structure for non-durable components
interface DBState {
  organizations: Organization[];
  groups: Group[];
  posts: Post[];
  bloodBanks: BloodBank[];
  bloodRedemptions: BloodRedemption[];
  ambulanceRides: AmbulanceRide[];
  stories: Story[];
  achievements: Achievement[];
}

let db: DBState = {
  organizations: [],
  groups: [],
  posts: [],
  bloodBanks: [],
  bloodRedemptions: [],
  ambulanceRides: [],
  stories: [],
  achievements: []
};

// Initialize Gemini SDK with telemetry header
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    })
  : null;

// Cryptographic hash helper for the point ledger
function computeLedgerHash(ledgerEntry: {
  amount: number;
  type: string;
  description: string;
  previousHash: string;
  userId: number;
  createdAt: string;
}): string {
  const payload = `${ledgerEntry.amount}|${ledgerEntry.type}|${ledgerEntry.description}|${ledgerEntry.previousHash}|${ledgerEntry.userId}|${ledgerEntry.createdAt}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

// Add transaction with cryptographic hash chaining in Postgres
async function addLedgerEntryInDB(userId: number, amount: number, type: string, description: string): Promise<any> {
  const [user] = await pgDb.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!user) throw new Error("User not found");

  const userTransactions = await pgDb
    .select()
    .from(schema.pointLedger)
    .where(eq(schema.pointLedger.userId, userId))
    .orderBy(schema.pointLedger.createdAt);

  let previousHash = "0000000000000000000000000000000000000000000000000000000000000000";
  if (userTransactions.length > 0) {
    previousHash = userTransactions[userTransactions.length - 1].currentHash;
  }

  const createdAt = new Date();
  const partialEntry = {
    amount,
    type,
    description,
    previousHash,
    userId,
    createdAt: createdAt.toISOString()
  };

  const currentHash = computeLedgerHash(partialEntry);
  const newId = crypto.randomUUID();

  await pgDb.insert(schema.pointLedger).values({
    id: newId,
    userId,
    amount,
    type,
    description,
    previousHash,
    currentHash,
    createdAt,
  });

  const newPoints = Math.max(0, (user.humanityPoints || 0) + amount);
  await pgDb.update(schema.users).set({ humanityPoints: newPoints }).where(eq(schema.users.id, userId));

  return {
    id: newId,
    userId,
    amount,
    type,
    description,
    previousHash,
    currentHash,
    createdAt: createdAt.toISOString(),
  };
}

// Load and Save helpers for in-memory JSON state
function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      db = JSON.parse(data);
      console.log("Loaded existing state database from disk.");
      return;
    }
  } catch (err) {
    console.error("Error loading db.json, generating mock data...", err);
  }
  generateMockData();
  saveDB();
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing db.json to disk", err);
  }
}

// Seed Database in Cloud SQL
async function seedCloudSQL() {
  try {
    const existingUsers = await pgDb.select().from(schema.users).limit(1);
    if (existingUsers.length > 0) {
      console.log("Cloud SQL database already has records. Skipping seeding.");
      return;
    }

    console.log("Seeding Cloud SQL database with Civic Z starter dataset...");

    // 1. Insert Users
    const usersToInsert = [
      {
        uid: "user-1",
        email: "rohan@civicz.org",
        phoneNumber: "+91 98765 43210",
        fullName: "Rohan Deshmukh",
        username: "rohan_green",
        age: 24,
        profilePicUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop",
        bio: "Environmental activist & community builder. Clean city, healthy life! 🌱 Mumbai Chapter Leader.",
        role: "CITIZEN",
        isVerified: true,
        kycDocType: "Aadhaar",
        kycDocNumber: "XXXX-XXXX-8921",
        humanityPoints: 350,
      },
      {
        uid: "user-2",
        email: "priya@earthsave.org",
        phoneNumber: "+91 87654 32109",
        fullName: "Dr. Priya Sharma",
        username: "priya_leader",
        age: 32,
        profilePicUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop",
        bio: "Founder of Green Mumbai Initiative. Coordinating safai drives and direct blood bank collaborations.",
        role: "ORGANIZATION_LEADER",
        isVerified: true,
        kycDocType: "Passport",
        kycDocNumber: "Z9102931",
        humanityPoints: 1250,
      },
      {
        uid: "user-3",
        email: "admin@redcross-mumbai.org",
        phoneNumber: "+91 76543 21098",
        fullName: "Inspector Vikram Singh",
        username: "blood_bank_central",
        age: 45,
        profilePicUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop",
        bio: "Red Cross Blood Bank Coordinator, Mumbai Central.",
        role: "BLOOD_BANK_ADMIN",
        isVerified: true,
        kycDocType: "Voter ID",
        kycDocNumber: "VTR-9021-392",
        humanityPoints: 50,
      },
      {
        uid: "user-4",
        email: "driver.arjun@caretransit.com",
        phoneNumber: "+91 65432 10987",
        fullName: "Arjun Yadav",
        username: "ambulance_driver_07",
        age: 29,
        profilePicUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
        bio: "Emergency Ambulance Driver. Serving Mumbai East Region. Fast and safe transit.",
        role: "DRIVER",
        isVerified: true,
        kycDocType: "Driving License",
        kycDocNumber: "MH-43-2019-03921",
        humanityPoints: 120,
      },
    ];

    for (const u of usersToInsert) {
      await pgDb.insert(schema.users).values({
        uid: u.uid,
        email: u.email,
        phoneNumber: u.phoneNumber,
        fullName: u.fullName,
        username: u.username,
        age: u.age,
        profilePicUrl: u.profilePicUrl,
        bio: u.bio,
        role: u.role,
        isVerified: u.isVerified,
        kycDocType: u.kycDocType,
        kycDocNumber: u.kycDocNumber,
        humanityPoints: u.humanityPoints,
      });
    }

    // Get back user primary keys
    const insertedUsers = await pgDb.select().from(schema.users);
    const rohan = insertedUsers.find(u => u.uid === "user-1")!;
    const priya = insertedUsers.find(u => u.uid === "user-2")!;

    // 2. Insert point ledger entries
    const ledgerEntries = [
      {
        amount: 140,
        type: "EARNED_MONEY_PURCHASE",
        description: "Points minted via direct UPI payment purchase ($11.20 equivalent)",
        previousHash: "0000000000000000000000000000000000000000000000000000000000000000",
        userId: rohan.id,
        createdAt: "2026-07-01T12:00:00.000Z",
      },
      {
        amount: 10,
        type: "EARNED_CIVIC_WORK",
        description: "Completed verified Dharavi Community Sanitation program block.",
        previousHash: "", // will compute below
        userId: rohan.id,
        createdAt: "2026-07-02T18:10:00.000Z",
      },
      {
        amount: 200,
        type: "EARNED_BLOOD_DONATION",
        description: "Donated 2 units of O+ blood at Central Blood Bank",
        previousHash: "", // will compute below
        userId: rohan.id,
        createdAt: "2026-07-05T10:30:00.000Z",
      },
      {
        amount: 1250,
        type: "EARNED_MONEY_PURCHASE",
        description: "Corporate sponsorship seed funding humanity points conversion",
        previousHash: "0000000000000000000000000000000000000000000000000000000000000000",
        userId: priya.id,
        createdAt: "2026-04-16T12:00:00.000Z",
      }
    ];

    // Rohan's Chain Seeding
    let hash1 = computeLedgerHash({
      amount: ledgerEntries[0].amount,
      type: ledgerEntries[0].type,
      description: ledgerEntries[0].description,
      previousHash: ledgerEntries[0].previousHash,
      userId: rohan.id,
      createdAt: ledgerEntries[0].createdAt
    });
    await pgDb.insert(schema.pointLedger).values({
      id: "ledger-r1",
      userId: rohan.id,
      amount: ledgerEntries[0].amount,
      type: ledgerEntries[0].type,
      description: ledgerEntries[0].description,
      previousHash: ledgerEntries[0].previousHash,
      currentHash: hash1,
      createdAt: new Date(ledgerEntries[0].createdAt),
    });

    let hash2 = computeLedgerHash({
      amount: ledgerEntries[1].amount,
      type: ledgerEntries[1].type,
      description: ledgerEntries[1].description,
      previousHash: hash1,
      userId: rohan.id,
      createdAt: ledgerEntries[1].createdAt
    });
    await pgDb.insert(schema.pointLedger).values({
      id: "ledger-r2",
      userId: rohan.id,
      amount: ledgerEntries[1].amount,
      type: ledgerEntries[1].type,
      description: ledgerEntries[1].description,
      previousHash: hash1,
      currentHash: hash2,
      createdAt: new Date(ledgerEntries[1].createdAt),
    });

    let hash3 = computeLedgerHash({
      amount: ledgerEntries[2].amount,
      type: ledgerEntries[2].type,
      description: ledgerEntries[2].description,
      previousHash: hash2,
      userId: rohan.id,
      createdAt: ledgerEntries[2].createdAt
    });
    await pgDb.insert(schema.pointLedger).values({
      id: "ledger-r3",
      userId: rohan.id,
      amount: ledgerEntries[2].amount,
      type: ledgerEntries[2].type,
      description: ledgerEntries[2].description,
      previousHash: hash2,
      currentHash: hash3,
      createdAt: new Date(ledgerEntries[2].createdAt),
    });

    // Priya's Chain Seeding
    let hashLeader = computeLedgerHash({
      amount: ledgerEntries[3].amount,
      type: ledgerEntries[3].type,
      description: ledgerEntries[3].description,
      previousHash: ledgerEntries[3].previousHash,
      userId: priya.id,
      createdAt: ledgerEntries[3].createdAt
    });
    await pgDb.insert(schema.pointLedger).values({
      id: "ledger-p1",
      userId: priya.id,
      amount: ledgerEntries[3].amount,
      type: ledgerEntries[3].type,
      description: ledgerEntries[3].description,
      previousHash: ledgerEntries[3].previousHash,
      currentHash: hashLeader,
      createdAt: new Date(ledgerEntries[3].createdAt),
    });

    // 3. Insert Projects
    await pgDb.insert(schema.projects).values({
      id: "proj-1",
      title: "Juhu Beach Plastic Salvage",
      description: "Massive plastic cleanup along the Juhu shoreline following monsoon high tides. We target 500kg of microplastics and fishing nets. Assignments limited to 50 certified volunteers.",
      listingFeePaid: true,
      feeAmount: 10.0,
      maxWorkers: 50,
      status: "ACTIVE",
      beforePhotoUrl: "https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=600&fit=crop",
      assignedWorkers: "user-1",
      pointsEarned: 10,
    });

    await pgDb.insert(schema.projects).values({
      id: "proj-2",
      title: "Dharavi Community Sanitation",
      description: "Community waste audit, trash sorting bins setup, and sanitation awareness workshops. Points funded by direct donations to NGO.",
      listingFeePaid: true,
      feeAmount: 10.0,
      maxWorkers: 30,
      status: "COMPLETED",
      beforePhotoUrl: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&fit=crop",
      afterPhotoUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&fit=crop",
      assignedWorkers: "user-1",
      pointsEarned: 10,
    });

    console.log("Cloud SQL Seeding completed successfully!");
  } catch (error) {
    console.error("Cloud SQL Seeding failed:", error);
  }
}

function generateMockData() {
  console.log("Generating high-fidelity JSON mock data for non-durable assets...");

  db.organizations = [
    {
      id: "org-1",
      name: "Green Mumbai Alliance",
      leaderId: "user-2",
      isKycVerified: true,
      kycDetails: {
        address: "702, Ocean Crest Towers, Bandra West, Mumbai",
        docType: "NGO Certificate",
        docNumber: "NGO-MH-4921-2024"
      }
    }
  ];

  db.groups = [
    {
      id: "group-1",
      orgId: "org-1",
      name: "Bandra Beach Warriors",
      description: "Dedicated to restoring local coastal eco-systems. Weekly plastic collection & sorting drives.",
      memberCount: 45,
      members: ["user-1", "user-3"]
    }
  ];

  db.achievements = [
    {
      id: "ach-1",
      userId: "user-1",
      title: "Dharavi Sanitation Veteran",
      description: "Completed the Dharavi community sorting block with 100% verified hourly presence.",
      orgName: "Green Mumbai Alliance",
      pointsEarned: 10,
      createdAt: "2026-07-02T18:00:00Z"
    },
    {
      id: "ach-2",
      userId: "user-1",
      title: "Lifesaver: O+ Blood Donor",
      description: "Voluntary donation of 2 units of whole blood at Blood Bank Central.",
      orgName: "Red Cross Blood Bank Central",
      pointsEarned: 200,
      createdAt: "2026-07-05T10:00:00Z"
    }
  ];

  db.bloodBanks = [
    {
      id: "bank-1",
      name: "Red Cross Blood Bank Central",
      address: "Ground Floor, Red Cross Building, Fort, Mumbai",
      locationLat: 18.9322,
      locationLng: 72.8354,
      inventory: {
        "A+": 12, "B+": 18, "AB+": 8, "O+": 25,
        "A-": 4, "B-": 3, "AB-": 1, "O-": 5, "Golden Blood": 1
      }
    },
    {
      id: "bank-2",
      name: "Fortis Hiranandani Blood Vault",
      address: "Fortis Hospital, Mini Sea Shore Road, Vashi, Navi Mumbai",
      locationLat: 19.0760,
      locationLng: 72.9975,
      inventory: {
        "A+": 14, "B+": 22, "AB+": 11, "O+": 30,
        "A-": 2, "B-": 4, "AB-": 2, "O-": 6, "Golden Blood": 0
      }
    }
  ];

  db.posts = [
    {
      id: "post-1",
      userId: "user-1",
      user: {
        fullName: "Rohan Deshmukh",
        username: "rohan_green",
        profilePicUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop",
        role: "CITIZEN"
      },
      mediaUrl: "https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=800&fit=crop",
      mediaType: "IMAGE",
      caption: "Incredible turnout today for our Juhu cleanup block! Collected more than 150kgs of discarded microplastics and ocean nets. Truly proving that active work translates directly to life-saving humanity points! 💪🌊",
      isAiGenerated: false,
      likeCount: 24,
      dislikeCount: 1,
      pointsGranted: 10,
      comments: [
        {
          id: "comm-1",
          postId: "post-1",
          userId: "user-2",
          username: "priya_leader",
          userPic: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop",
          text: "Excellent work Rohan! Points credited and secured in the ledger. Keep rolling!",
          createdAt: "2026-07-10T14:30:00Z"
        }
      ],
      likedBy: ["user-2"],
      dislikedBy: [],
      createdAt: "2026-07-10T14:00:00Z"
    },
    {
      id: "post-2",
      userId: "user-2",
      user: {
        fullName: "Dr. Priya Sharma",
        username: "priya_leader",
        profilePicUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop",
        role: "ORGANIZATION_LEADER"
      },
      mediaUrl: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&fit=crop",
      mediaType: "IMAGE",
      caption: "Launching our next mega campaign next week at Ghatkopar. The $10 platform fee is verified, points are pre-funded, and 50 worker slots are open to all active group members. Let's make civic actions transparent!",
      isAiGenerated: false,
      likeCount: 38,
      dislikeCount: 0,
      pointsGranted: 0,
      comments: [],
      likedBy: ["user-1"],
      dislikedBy: [],
      createdAt: "2026-07-12T08:00:00Z"
    }
  ];

  db.stories = [
    {
      id: "story-1",
      userId: "user-1",
      user: {
        fullName: "Rohan Deshmukh",
        username: "rohan_green",
        profilePicUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop"
      },
      mediaUrl: "https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=300&h=500&fit=crop",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: "story-2",
      userId: "user-2",
      user: {
        fullName: "Dr. Priya Sharma",
        username: "priya_leader",
        profilePicUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop"
      },
      mediaUrl: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=300&h=500&fit=crop",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    }
  ];

  db.ambulanceRides = [
    {
      id: "ride-1",
      userId: "user-1",
      pickupLat: 19.0760,
      pickupLng: 72.8777,
      destLat: 18.9322,
      destLng: 72.8354,
      distanceKm: 16.5,
      pointsDeducted: 17,
      overageFeeUsd: 0.0,
      status: "COMPLETED",
      createdAt: "2026-07-06T15:00:00Z"
    }
  ];
}

// Invoke loaders
loadDB();

// Setup Express application
const app = express();
app.use(express.json());

// API: Google / Firebase Authentication and User Registration in Cloud SQL
app.post("/api/auth/google", async (req, res) => {
  try {
    const { uid, email, displayName, photoURL } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ error: "Missing uid or email in auth payload" });
    }

    // Check if user already exists
    let [user] = await pgDb.select().from(schema.users).where(eq(schema.users.uid, uid)).limit(1);

    if (!user) {
      // Register new user row
      const baseUsername = email.split("@")[0] + "_" + Math.floor(Math.random() * 1000);
      const inserted = await pgDb.insert(schema.users).values({
        uid,
        email,
        fullName: displayName || baseUsername,
        username: baseUsername,
        profilePicUrl: photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
        role: "CITIZEN",
        isVerified: false,
        humanityPoints: 150, // Welcome points
        bio: "Civic Z workspace explorer.",
      }).returning();
      
      user = inserted[0];
      // Seed welcome points
      await addLedgerEntryInDB(user.id, 150, "EARNED_MONEY_PURCHASE", "Welcome to Civic Z Integrated Workspace! Welcome bonus HP credited.");
    }

    // Format for response to frontend
    res.json({
      success: true,
      user: {
        id: user.uid, // client expects uid as the 'id' field
        email: user.email,
        fullName: user.fullName,
        username: user.username,
        profilePicUrl: user.profilePicUrl,
        bio: user.bio,
        role: user.role,
        isVerified: user.isVerified,
        humanityPoints: user.humanityPoints,
        createdAt: user.createdAt,
        dbId: user.id // Postgres primary key
      }
    });
  } catch (error: any) {
    console.error("Google Auth SQL Sync Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/signup", async (req, res) => {
  const { email, phoneNumber, fullName, username, age, role } = req.body;
  if (!email || !fullName || !username) {
    return res.status(400).json({ error: "Missing required fields for registration" });
  }

  try {
    // Generate simulated uid
    const fakeUid = "uid-" + crypto.randomUUID();
    const inserted = await pgDb.insert(schema.users).values({
      uid: fakeUid,
      email,
      phoneNumber,
      fullName,
      username,
      age: parseInt(age) || 21,
      role: (role as Role) || "CITIZEN",
      profilePicUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
      bio: `Civic Z explorer. Ready to earn Humanity Points!`,
      isVerified: false,
      humanityPoints: 50,
    }).returning();

    const user = inserted[0];
    await addLedgerEntryInDB(user.id, 50, "EARNED_MONEY_PURCHASE", "Welcome to Civic Z! Bonus HP credited.");

    res.json({ success: true, user: { ...user, id: user.uid } });
  } catch (err: any) {
    res.status(400).json({ error: "Username or email is already registered." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username } = req.body;
  try {
    const [user] = await pgDb.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);
    if (!user) {
      return res.status(401).json({ error: "Invalid username, email, or password" });
    }
    res.json({ success: true, user: { ...user, id: user.uid } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const allUsers = await pgDb.select().from(schema.users);
    res.json(allUsers.map(u => ({ ...u, id: u.uid })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/users/:uid", async (req, res) => {
  try {
    const [user] = await pgDb.select().from(schema.users).where(eq(schema.users.uid, req.params.uid)).limit(1);
    if (!user) return res.status(404).json({ error: "User profile not found" });

    const achievements = db.achievements.filter(a => a.userId === user.uid);
    const ledger = await pgDb
      .select()
      .from(schema.pointLedger)
      .where(eq(schema.pointLedger.userId, user.id))
      .orderBy(desc(schema.pointLedger.createdAt));

    res.json({ user: { ...user, id: user.uid }, achievements, ledger });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/users/:uid/kyc", async (req, res) => {
  const { docType, docNumber } = req.body;
  try {
    const [user] = await pgDb.select().from(schema.users).where(eq(schema.users.uid, req.params.uid)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    await pgDb.update(schema.users).set({
      kycDocType: docType,
      kycDocNumber: docNumber,
      isVerified: true
    }).where(eq(schema.users.id, user.id));

    user.kycDocType = docType;
    user.kycDocNumber = docNumber;
    user.isVerified = true;

    res.json({ success: true, user: { ...user, id: user.uid } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/users/:uid/profile", async (req, res) => {
  const { bio, fullName, profilePicUrl } = req.body;
  try {
    const [user] = await pgDb.select().from(schema.users).where(eq(schema.users.uid, req.params.uid)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    const updates: any = {};
    if (bio !== undefined) updates.bio = bio;
    if (fullName !== undefined) updates.fullName = fullName;
    if (profilePicUrl !== undefined) updates.profilePicUrl = profilePicUrl;

    await pgDb.update(schema.users).set(updates).where(eq(schema.users.id, user.id));

    res.json({ success: true, user: { ...user, ...updates, id: user.uid } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Ledger Verification & Chain Auditing
app.get("/api/ledger/verify/:uid", async (req, res) => {
  try {
    const [user] = await pgDb.select().from(schema.users).where(eq(schema.users.uid, req.params.uid)).limit(1);
    if (!user) return res.json({ verified: false, count: 0, chain: [] });

    const userLedger = await pgDb
      .select()
      .from(schema.pointLedger)
      .where(eq(schema.pointLedger.userId, user.id))
      .orderBy(schema.pointLedger.createdAt);

    if (userLedger.length === 0) {
      return res.json({ verified: true, count: 0, chain: [] });
    }

    const reports = [];
    let chainCorrupted = false;
    let corruptedIndex = -1;

    for (let i = 0; i < userLedger.length; i++) {
      const entry = userLedger[i];
      let expectedPrevHash = "0000000000000000000000000000000000000000000000000000000000000000";
      if (i > 0) {
        expectedPrevHash = userLedger[i - 1].currentHash;
      }

      const prevHashValid = entry.previousHash === expectedPrevHash;

      const payload = {
        amount: entry.amount,
        type: entry.type,
        description: entry.description,
        previousHash: entry.previousHash,
        userId: entry.userId,
        createdAt: entry.createdAt ? entry.createdAt.toISOString() : ""
      };
      const recalculatedHash = computeLedgerHash(payload);
      const selfHashValid = recalculatedHash === entry.currentHash;
      const blockValid = prevHashValid && selfHashValid;

      reports.push({
        id: entry.id,
        amount: entry.amount,
        type: entry.type,
        description: entry.description,
        prevHashValid,
        selfHashValid,
        isValid: blockValid,
        timestamp: entry.createdAt
      });

      if (!blockValid && !chainCorrupted) {
        chainCorrupted = true;
        corruptedIndex = i;
      }
    }

    res.json({
      verified: !chainCorrupted,
      corruptedIndex,
      count: userLedger.length,
      reports
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get All Point Ledger Blocks across the entire network
app.get("/api/ledger/all", async (req, res) => {
  try {
    const allBlocks = await pgDb.select().from(schema.pointLedger).orderBy(desc(schema.pointLedger.createdAt));
    res.json(allBlocks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Simulate Direct Database Tampering (Manual Point Manipulation Hack)
app.post("/api/ledger/tamper", async (req, res) => {
  const { txId, newAmount } = req.body;
  try {
    let targetTx = null;
    if (txId) {
      [targetTx] = await pgDb.select().from(schema.pointLedger).where(eq(schema.pointLedger.id, txId)).limit(1);
    } else {
      // Grab the first transaction
      const txs = await pgDb.select().from(schema.pointLedger).limit(1);
      targetTx = txs[0];
    }

    if (!targetTx) {
      return res.status(404).json({ error: "Target transaction for tampering not found." });
    }

    const oldAmount = targetTx.amount;
    const tamperAmount = newAmount !== undefined ? Number(newAmount) : 99999;

    // Tamper SQL column directly without re-calculating the SHA signature
    await pgDb.update(schema.pointLedger).set({ amount: tamperAmount }).where(eq(schema.pointLedger.id, targetTx.id));

    const [user] = await pgDb.select().from(schema.users).where(eq(schema.users.id, targetTx.userId)).limit(1);
    if (user) {
      const updatedPoints = (user.humanityPoints || 0) + (tamperAmount - oldAmount);
      await pgDb.update(schema.users).set({ humanityPoints: updatedPoints }).where(eq(schema.users.id, user.id));
    }

    res.json({
      success: true,
      message: "Ledger database entry maliciously tampered! The SHA-256 signature chain has been broken.",
      tamperedTx: { ...targetTx, amount: tamperAmount },
      oldAmount,
      newAmount: tamperAmount
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API: Restore/Recover Ledger Database (Clean re-seeding and repair)
app.post("/api/ledger/restore", async (req, res) => {
  try {
    await pgDb.delete(schema.pointLedger);
    await pgDb.delete(schema.users);
    await pgDb.delete(schema.projects);
    await pgDb.delete(schema.workspaceLogs);
    await seedCloudSQL();
    res.json({
      success: true,
      message: "Consensus protocol recovery triggered. Database restored from decentralized backups and hashes verified."
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API: Network-wide Ledger Integrity Scan
app.get("/api/ledger/verify-all", async (req, res) => {
  try {
    const usersList = await pgDb.select().from(schema.users);
    const results = [];
    let globalTampered = false;

    for (const u of usersList) {
      const userLedger = await pgDb
        .select()
        .from(schema.pointLedger)
        .where(eq(schema.pointLedger.userId, u.id))
        .orderBy(schema.pointLedger.createdAt);

      let userCorrupted = false;
      let corruptedIndex = -1;

      for (let i = 0; i < userLedger.length; i++) {
        const entry = userLedger[i];
        let expectedPrevHash = "0000000000000000000000000000000000000000000000000000000000000000";
        if (i > 0) {
          expectedPrevHash = userLedger[i - 1].currentHash;
        }

        const prevHashValid = entry.previousHash === expectedPrevHash;

        const payload = {
          amount: entry.amount,
          type: entry.type,
          description: entry.description,
          previousHash: entry.previousHash,
          userId: entry.userId,
          createdAt: entry.createdAt ? entry.createdAt.toISOString() : ""
        };
        const recalculatedHash = computeLedgerHash(payload);
        const selfHashValid = recalculatedHash === entry.currentHash;

        if (!prevHashValid || !selfHashValid) {
          userCorrupted = true;
          globalTampered = true;
          corruptedIndex = i;
          break;
        }
      }

      results.push({
        userId: u.uid,
        fullName: u.fullName,
        username: u.username,
        blockCount: userLedger.length,
        verified: !userCorrupted,
        corruptedIndex
      });
    }

    res.json({
      secure: !globalTampered,
      usersScanned: results.length,
      auditReports: results
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API: Social Feed, Stories & Posts
app.get("/api/posts", (req, res) => {
  const sorted = [...db.posts].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(sorted);
});

app.get("/api/stories", (req, res) => {
  res.json(db.stories);
});

app.post("/api/posts", async (req, res) => {
  const { userId, mediaUrl, mediaType, caption } = req.body;
  try {
    const [user] = await pgDb.select().from(schema.users).where(eq(schema.users.uid, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    let isAiGenerated = false;
    let validationReason = "Approved automatically.";

    if (ai) {
      try {
        const geminiRes = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Analyze the following user-submitted civic claim and caption. Determine if this describes a real civic activity or looks fake, generated, or spam.
          Caption: "${caption || ''}"
          Image reference url: "${mediaUrl || ''}"
          
          Provide JSON output with structure:
          {
            "isAiGenerated": boolean,
            "isSpam": boolean,
            "confidence": float,
            "reason": string
          }`,
          config: {
            responseMimeType: "application/json"
          }
        });
        const responseText = geminiRes.text;
        if (responseText) {
          const parsed = JSON.parse(responseText.trim());
          isAiGenerated = parsed.isAiGenerated || parsed.isSpam;
          validationReason = parsed.reason || "Scanned by Gemini Vision Filter.";
        }
      } catch (e) {
        console.error("Gemini AI Content Filter Error:", e);
      }
    }

    const newPost: Post = {
      id: `post-${crypto.randomUUID()}`,
      userId,
      user: {
        fullName: user.fullName,
        username: user.username,
        profilePicUrl: user.profilePicUrl,
        role: user.role as any
      },
      mediaUrl: mediaUrl || "https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=800&fit=crop",
      mediaType: mediaType || "IMAGE",
      caption: caption || "",
      isAiGenerated,
      likeCount: 0,
      dislikeCount: 0,
      pointsGranted: 0,
      comments: [],
      likedBy: [],
      dislikedBy: [],
      createdAt: new Date().toISOString()
    };

    db.posts.push(newPost);
    saveDB();
    res.json({ success: true, post: newPost, validationReason });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/posts/:id/react", async (req, res) => {
  const { userId, reaction } = req.body;
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  if (reaction === "LIKE") {
    if (post.likedBy.includes(userId)) {
      post.likedBy = post.likedBy.filter(id => id !== userId);
    } else {
      post.likedBy.push(userId);
      post.dislikedBy = post.dislikedBy.filter(id => id !== userId);
    }
  } else if (reaction === "DISLIKE") {
    if (post.dislikedBy.includes(userId)) {
      post.dislikedBy = post.dislikedBy.filter(id => id !== userId);
    } else {
      post.dislikedBy.push(userId);
      post.likedBy = post.likedBy.filter(id => id !== userId);
    }
  }

  post.likeCount = post.likedBy.length;
  post.dislikeCount = post.dislikedBy.length;

  try {
    const [user] = await pgDb.select().from(schema.users).where(eq(schema.users.uid, post.userId)).limit(1);
    if (user) {
      if (post.dislikeCount >= post.likeCount && post.pointsGranted > 0) {
        const earlierPoints = post.pointsGranted;
        await addLedgerEntryInDB(user.id, -earlierPoints, "SPENT_BLOOD_REDEMPTION", `Reversal: Points invalidated due to community consensus on post ${post.id}`);
        post.pointsGranted = 0;
      } else if (post.likeCount >= 3 && post.pointsGranted === 0 && post.dislikeCount < post.likeCount) {
        post.pointsGranted = 15;
        await addLedgerEntryInDB(user.id, 15, "EARNED_CIVIC_WORK", `Community consensus approval bonus for civic action feed post`);
      }
    }
    saveDB();
    res.json({ success: true, post });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/posts/:id/comments", (req, res) => {
  const { userId, text } = req.body;
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const newComment: Comment = {
    id: `comm-${crypto.randomUUID()}`,
    postId: post.id,
    userId,
    username: "user_" + userId.slice(0, 5),
    userPic: "https://api.dicebear.com/7.x/bottts/svg?seed=" + userId,
    text,
    createdAt: new Date().toISOString()
  };

  post.comments.push(newComment);
  saveDB();
  res.json({ success: true, comment: newComment });
});

// API: Organizations, Groups & Projects
app.get("/api/groups", (req, res) => {
  res.json(db.groups);
});

app.post("/api/groups/:id/join", (req, res) => {
  const { userId } = req.body;
  const group = db.groups.find(g => g.id === req.params.id);
  if (!group) return res.status(404).json({ error: "Group not found" });

  if (group.members.includes(userId)) {
    group.members = group.members.filter(id => id !== userId);
  } else {
    group.members.push(userId);
  }
  group.memberCount = group.members.length;

  saveDB();
  res.json({ success: true, group });
});

app.get("/api/projects", async (req, res) => {
  try {
    const list = await pgDb.select().from(schema.projects);
    const parsedList = list.map(p => ({
      ...p,
      assignedWorkers: p.assignedWorkers ? p.assignedWorkers.split(",") : []
    }));
    res.json(parsedList);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/projects", async (req, res) => {
  const { title, description, maxWorkers, beforePhotoUrl } = req.body;
  try {
    const newId = `proj-${crypto.randomUUID()}`;
    await pgDb.insert(schema.projects).values({
      id: newId,
      title,
      description,
      maxWorkers: parseInt(maxWorkers) || 50,
      status: "PENDING_PAYMENT",
      beforePhotoUrl: beforePhotoUrl || "https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=600&fit=crop",
      pointsEarned: 10,
    });

    const [proj] = await pgDb.select().from(schema.projects).where(eq(schema.projects.id, newId)).limit(1);
    res.json({ success: true, project: { ...proj, assignedWorkers: [] } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/projects/:id/pay", async (req, res) => {
  try {
    await pgDb.update(schema.projects).set({
      listingFeePaid: true,
      status: "ACTIVE",
      updatedAt: new Date()
    }).where(eq(schema.projects.id, req.params.id));

    const [proj] = await pgDb.select().from(schema.projects).where(eq(schema.projects.id, req.params.id)).limit(1);
    res.json({ success: true, project: { ...proj, assignedWorkers: proj.assignedWorkers ? proj.assignedWorkers.split(",") : [] } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/projects/:id/apply", async (req, res) => {
  const { userId } = req.body;
  try {
    const [proj] = await pgDb.select().from(schema.projects).where(eq(schema.projects.id, req.params.id)).limit(1);
    if (!proj) return res.status(404).json({ error: "Project not found" });

    let workers = proj.assignedWorkers ? proj.assignedWorkers.split(",").filter(Boolean) : [];
    if (workers.includes(userId)) {
      workers = workers.filter(id => id !== userId);
    } else {
      if (workers.length >= (proj.maxWorkers || 50)) {
        return res.status(400).json({ error: "Project recruitment limit reached" });
      }
      workers.push(userId);
    }

    const workersStr = workers.join(",");
    await pgDb.update(schema.projects).set({
      assignedWorkers: workersStr,
      updatedAt: new Date()
    }).where(eq(schema.projects.id, proj.id));

    res.json({ success: true, project: { ...proj, assignedWorkers: workers } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/projects/:id/proof", async (req, res) => {
  const { videoUrl, afterPhotoUrl } = req.body;
  try {
    const [proj] = await pgDb.select().from(schema.projects).where(eq(schema.projects.id, req.params.id)).limit(1);
    if (!proj) return res.status(404).json({ error: "Project not found" });

    let aiIsDeepfake = false;
    let aiConfidence = 0.95;
    let failureReason = null;

    if (ai) {
      try {
        const geminiRes = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `You are an automated fraud-prevention AI. Inspect this project proof submission:
          Project Title: "${proj.title}"
          Project Description: "${proj.description}"
          Submission Proof Video URL: "${videoUrl || ''}"
          
          Evaluate whether this is a valid report or a deepfake.
          Return a JSON structure:
          {
            "isDeepfake": boolean,
            "confidence": float,
            "failureReason": string (null if passed, otherwise reason)
          }`,
          config: {
            responseMimeType: "application/json"
          }
        });
        const text = geminiRes.text;
        if (text) {
          const parsed = JSON.parse(text.trim());
          aiIsDeepfake = parsed.isDeepfake;
          aiConfidence = parsed.confidence;
          failureReason = parsed.failureReason;
        }
      } catch (e) {
        console.error("Gemini AI Deepfake Scanning Error:", e);
      }
    }

    const proofStatus = aiIsDeepfake ? "REJECTED" : "APPROVED";

    if (proofStatus === "APPROVED") {
      await pgDb.update(schema.projects).set({
        status: "COMPLETED",
        afterPhotoUrl,
        updatedAt: new Date()
      }).where(eq(schema.projects.id, proj.id));

      const workers = proj.assignedWorkers ? proj.assignedWorkers.split(",").filter(Boolean) : [];
      for (const workerId of workers) {
        const [u] = await pgDb.select().from(schema.users).where(eq(schema.users.uid, workerId)).limit(1);
        if (u) {
          await addLedgerEntryInDB(u.id, 10, "EARNED_CIVIC_WORK", `Completed physical labor on: ${proj.title}`);
          db.achievements.push({
            id: `ach-${crypto.randomUUID()}`,
            userId: workerId,
            title: `Hero: ${proj.title}`,
            description: `Verified labor contribution for ${proj.title}. Tracked on cryptographic ledger.`,
            orgName: "Green Mumbai Alliance",
            pointsEarned: 10,
            createdAt: new Date().toISOString()
          });
        }
      }
    } else {
      await pgDb.update(schema.projects).set({
        status: "FAILED",
        updatedAt: new Date()
      }).where(eq(schema.projects.id, proj.id));
    }

    const [updatedProj] = await pgDb.select().from(schema.projects).where(eq(schema.projects.id, req.params.id)).limit(1);
    res.json({
      success: true,
      project: { ...updatedProj, assignedWorkers: updatedProj.assignedWorkers ? updatedProj.assignedWorkers.split(",") : [] },
      proof: {
        id: `proof-${crypto.randomUUID()}`,
        projectId: proj.id,
        videoUrl: videoUrl || "",
        timestamp: new Date().toISOString(),
        aiIsDeepfake,
        aiConfidence,
        status: proofStatus,
        failureReason
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API: Blood Banks and Redemptions
app.get("/api/blood-banks", (req, res) => {
  res.json(db.bloodBanks);
});

app.post("/api/blood-banks/redeem", async (req, res) => {
  const { userId, bloodBankId, bloodGroup, units } = req.body;
  try {
    const [user] = await pgDb.select().from(schema.users).where(eq(schema.users.uid, userId)).limit(1);
    const bank = db.bloodBanks.find(b => b.id === bloodBankId);

    if (!user || !bank) {
      return res.status(404).json({ error: "User or Blood Bank not found" });
    }

    const availableUnits = bank.inventory[bloodGroup] || 0;
    if (availableUnits < units) {
      return res.status(400).json({ error: `Insufficient inventory of ${bloodGroup} blood group bags` });
    }

    let costPerUnit = 125;
    if (["A-", "B-", "AB-", "O-"].includes(bloodGroup)) {
      costPerUnit = 250;
    } else if (bloodGroup === "Golden Blood") {
      costPerUnit = 1000;
    }

    const totalCost = costPerUnit * units;

    if ((user.humanityPoints || 0) < totalCost) {
      return res.status(400).json({ error: `Insufficient Humanity Points. Required: ${totalCost} pts. Available: ${user.humanityPoints} pts.` });
    }

    bank.inventory[bloodGroup] -= units;
    await addLedgerEntryInDB(user.id, -totalCost, "SPENT_BLOOD_REDEMPTION", `Redeemed ${units} unit(s) of rare ${bloodGroup} blood at ${bank.name}`);

    const [updatedUser] = await pgDb.select().from(schema.users).where(eq(schema.users.id, user.id)).limit(1);

    const redemption: BloodRedemption = {
      id: `red-${crypto.randomUUID()}`,
      userId,
      bloodBankId,
      bloodGroup,
      units,
      pointsDeducted: totalCost,
      createdAt: new Date().toISOString()
    };

    db.bloodRedemptions.push(redemption);
    saveDB();

    res.json({ success: true, redemption, userPoints: updatedUser.humanityPoints });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API: Ambulance dispatch simulation
app.post("/api/ambulance/request", async (req, res) => {
  const { userId, pickupLat, pickupLng, destLat, destLng, distanceKm } = req.body;
  try {
    const [user] = await pgDb.select().from(schema.users).where(eq(schema.users.uid, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    const pointsDeducted = Math.ceil(distanceKm || 5);
    let overageFeeUsd = 0.0;
    let pointDeductionAmount = pointsDeducted;

    if ((user.humanityPoints || 0) < pointsDeducted) {
      pointDeductionAmount = user.humanityPoints || 0;
      const unmetKm = pointsDeducted - pointDeductionAmount;
      overageFeeUsd = parseFloat((unmetKm * 0.10).toFixed(2));
    }

    if (pointDeductionAmount > 0) {
      await addLedgerEntryInDB(user.id, -pointDeductionAmount, "SPENT_AMBULANCE_RIDE", `Dispatched Emergency Ambulance. Route: ${distanceKm} km transit.`);
    }

    const [updatedUser] = await pgDb.select().from(schema.users).where(eq(schema.users.id, user.id)).limit(1);

    const ride: AmbulanceRide = {
      id: `ride-${crypto.randomUUID()}`,
      userId,
      pickupLat: parseFloat(pickupLat) || 19.0760,
      pickupLng: parseFloat(pickupLng) || 72.8777,
      destLat: parseFloat(destLat) || 18.9322,
      destLng: parseFloat(destLng) || 72.8354,
      distanceKm: parseFloat(distanceKm) || 5,
      pointsDeducted: pointDeductionAmount,
      overageFeeUsd,
      status: "DISPATCHED",
      createdAt: new Date().toISOString()
    };

    db.ambulanceRides.push(ride);
    saveDB();

    res.json({ success: true, ride, userPoints: updatedUser.humanityPoints });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ambulance/complete/:id", (req, res) => {
  const ride = db.ambulanceRides.find(r => r.id === req.params.id);
  if (!ride) return res.status(404).json({ error: "Active ride dispatch not found" });

  ride.status = "COMPLETED";
  saveDB();
  res.json({ success: true, ride });
});

// API: Instant direct cash point deposit
app.post("/api/payments/purchase-points", async (req, res) => {
  const { userId, amountUsd } = req.body;
  try {
    const [user] = await pgDb.select().from(schema.users).where(eq(schema.users.uid, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    const pointsToMint = Math.floor((amountUsd / 8) * 100);
    if (pointsToMint <= 0) {
      return res.status(400).json({ error: "Minimum purchase amount is $0.50" });
    }

    await addLedgerEntryInDB(user.id, pointsToMint, "EARNED_MONEY_PURCHASE", `Bought ${pointsToMint} Humanity Points via UPI/Debit Card instant transaction`);

    const [updatedUser] = await pgDb.select().from(schema.users).where(eq(schema.users.id, user.id)).limit(1);

    res.json({ success: true, minted: pointsToMint, newBalance: updatedUser.humanityPoints });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API: Peer-to-peer Humanity Points tipping via QR Code scan / Username
app.post("/api/users/tip", async (req, res) => {
  const { senderId, recipientUsername, amount } = req.body;
  if (!senderId || !recipientUsername || amount === undefined) {
    return res.status(400).json({ error: "Missing required tipping fields" });
  }

  const tipAmount = parseInt(amount);
  if (isNaN(tipAmount) || tipAmount <= 0) {
    return res.status(400).json({ error: "Invalid tip amount. Must be greater than 0." });
  }

  try {
    const [sender] = await pgDb.select().from(schema.users).where(eq(schema.users.uid, senderId)).limit(1);
    if (!sender) {
      return res.status(404).json({ error: "Sender account not found" });
    }

    const [recipient] = await pgDb.select().from(schema.users).where(eq(schema.users.username, recipientUsername)).limit(1);
    if (!recipient) {
      return res.status(404).json({ error: `Recipient @${recipientUsername} not found` });
    }

    if (sender.id === recipient.id) {
      return res.status(400).json({ error: "You cannot tip yourself!" });
    }

    if ((sender.humanityPoints || 0) < tipAmount) {
      return res.status(400).json({ error: `Insufficient Humanity Points balance. You need ${tipAmount} HP, but only have ${sender.humanityPoints} HP.` });
    }

    await addLedgerEntryInDB(sender.id, -tipAmount, "SPENT_P2P_TIP", `Sent P2P tip of ${tipAmount} HP to @${recipient.username}`);
    await addLedgerEntryInDB(recipient.id, tipAmount, "EARNED_P2P_TIP", `Received P2P tip of ${tipAmount} HP from @${sender.username}`);

    const [updatedSender] = await pgDb.select().from(schema.users).where(eq(schema.users.id, sender.id)).limit(1);

    res.json({
      success: true,
      senderBalance: updatedSender.humanityPoints,
      recipientName: recipient.fullName
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// ============================================================================
// GOOGLE WORKSPACE API PROXY ENDPOINTS (Real Integrations with OAuth AccToken)
// ============================================================================

// Helper to log workspace operations to Cloud SQL
async function logWorkspaceAction(userId: string, serviceName: string, actionType: string, details: string) {
  try {
    await pgDb.insert(schema.workspaceLogs).values({
      userId,
      serviceName,
      actionType,
      details
    });
  } catch (error) {
    console.error("Failed to log workspace action:", error);
  }
}

// 1. Google Drive Proxies
app.get("/api/workspace/drive/files", async (req, res) => {
  const token = req.headers.authorization;
  const userUid = req.query.uid as string || "unknown-user";
  if (!token) return res.status(401).json({ error: "Missing authorization token" });

  try {
    const response = await fetch("https://www.googleapis.com/drive/v3/files?pageSize=15&fields=files(id,name,mimeType,modifiedTime,size,iconLink,webViewLink)", {
      headers: { "Authorization": token }
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || "Failed to fetch files from Google Drive");

    await logWorkspaceAction(userUid, "DRIVE", "LIST", `Retrieved ${data.files?.length || 0} files from Google Drive.`);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/workspace/drive/files", async (req, res) => {
  const token = req.headers.authorization;
  const { name, content, uid } = req.body;
  if (!token) return res.status(401).json({ error: "Missing authorization token" });

  try {
    // Multipart upload request
    const metadata = { name, mimeType: "text/plain" };
    const boundary = "foo_bar_boundary";
    const body = [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      JSON.stringify(metadata),
      `--${boundary}`,
      "Content-Type: text/plain",
      "",
      content || "Empty volunteering report content.",
      `--${boundary}--`
    ].join("\r\n");

    const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: {
        "Authorization": token,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || "Failed to create file on Google Drive");

    await logWorkspaceAction(uid, "DRIVE", "CREATE", `Created plain text file '${name}' with ID: ${data.id}`);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/workspace/drive/files/:id", async (req, res) => {
  const token = req.headers.authorization;
  const fileId = req.params.id;
  const userUid = req.query.uid as string || "unknown-user";
  if (!token) return res.status(401).json({ error: "Missing authorization token" });

  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: "DELETE",
      headers: { "Authorization": token }
    });

    if (response.status !== 204) {
      const data = await response.json();
      throw new Error(data.error?.message || "Failed to delete file from Google Drive");
    }

    await logWorkspaceAction(userUid, "DRIVE", "DELETE", `Deleted file ID: ${fileId} permanently.`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// 2. Gmail Proxies
app.get("/api/workspace/gmail/messages", async (req, res) => {
  const token = req.headers.authorization;
  const userUid = req.query.uid as string || "unknown-user";
  if (!token) return res.status(401).json({ error: "Missing authorization token" });

  try {
    const listRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10", {
      headers: { "Authorization": token }
    });
    const listData = await listRes.json();
    if (listData.error) throw new Error(listData.error.message || "Failed to list emails");

    const messages = listData.messages || [];
    const detailedMessages = [];

    for (const msg of messages) {
      const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, {
        headers: { "Authorization": token }
      });
      const msgData = await msgRes.json();
      const subjectHeader = msgData.payload?.headers?.find((h: any) => h.name === "Subject")?.value || "(No Subject)";
      const fromHeader = msgData.payload?.headers?.find((h: any) => h.name === "From")?.value || "Unknown Sender";
      const dateHeader = msgData.payload?.headers?.find((h: any) => h.name === "Date")?.value || "";

      detailedMessages.push({
        id: msg.id,
        threadId: msg.threadId,
        snippet: msgData.snippet,
        subject: subjectHeader,
        from: fromHeader,
        date: dateHeader
      });
    }

    await logWorkspaceAction(userUid, "GMAIL", "LIST", `Fetched list of ${detailedMessages.length} Gmail messages.`);
    res.json({ messages: detailedMessages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/workspace/gmail/messages", async (req, res) => {
  const token = req.headers.authorization;
  const { to, subject, body, uid } = req.body;
  if (!token) return res.status(401).json({ error: "Missing authorization token" });

  try {
    const emailContent = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      body
    ].join("\r\n");

    const encodedRaw = Buffer.from(emailContent)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ raw: encodedRaw })
    });

    const data = await sendRes.json();
    if (data.error) throw new Error(data.error.message || "Failed to send email");

    await logWorkspaceAction(uid, "GMAIL", "SEND", `Sent volunteering email to: ${to}, Subject: '${subject}'`);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/workspace/gmail/messages/:id", async (req, res) => {
  const token = req.headers.authorization;
  const messageId = req.params.id;
  const userUid = req.query.uid as string || "unknown-user";
  if (!token) return res.status(401).json({ error: "Missing authorization token" });

  try {
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {
      method: "POST",
      headers: { "Authorization": token }
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || "Failed to trash email");

    await logWorkspaceAction(userUid, "GMAIL", "DELETE", `Trashed email message with ID: ${messageId}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// 3. Contacts / People API Proxies
app.get("/api/workspace/contacts", async (req, res) => {
  const token = req.headers.authorization;
  const userUid = req.query.uid as string || "unknown-user";
  if (!token) return res.status(401).json({ error: "Missing authorization token" });

  try {
    const response = await fetch("https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,photos&pageSize=30", {
      headers: { "Authorization": token }
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || "Failed to fetch Google Contacts");

    const formatted = (data.connections || []).map((conn: any) => {
      const name = conn.names?.[0]?.displayName || "No Name";
      const email = conn.emailAddresses?.[0]?.value || "";
      const phone = conn.phoneNumbers?.[0]?.value || "";
      const photo = conn.photos?.[0]?.url || "";
      return { resourceName: conn.resourceName, name, email, phone, photo };
    });

    await logWorkspaceAction(userUid, "CONTACTS", "LIST", `Retrieved ${formatted.length} contacts from Google Contacts.`);
    res.json({ contacts: formatted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/workspace/contacts", async (req, res) => {
  const token = req.headers.authorization;
  const { name, email, phone, uid } = req.body;
  if (!token) return res.status(401).json({ error: "Missing authorization token" });

  try {
    const response = await fetch("https://people.googleapis.com/v1/people:createContact", {
      method: "POST",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        names: [{ givenName: name }],
        emailAddresses: email ? [{ value: email }] : [],
        phoneNumbers: phone ? [{ value: phone }] : []
      })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || "Failed to create Google Contact");

    await logWorkspaceAction(uid, "CONTACTS", "CREATE", `Created connection contact '${name}' (${email || "no-email"})`);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/workspace/contacts/*", async (req, res) => {
  const token = req.headers.authorization;
  const resourceName = req.params[0]; // will be 'people/cXXXXX'
  const userUid = req.query.uid as string || "unknown-user";
  if (!token) return res.status(401).json({ error: "Missing authorization token" });

  try {
    const response = await fetch(`https://people.googleapis.com/v1/${resourceName}:deleteContact`, {
      method: "DELETE",
      headers: { "Authorization": token }
    });

    if (response.status !== 200 && response.status !== 204) {
      const data = await response.json();
      throw new Error(data.error?.message || "Failed to delete contact from Google Contacts");
    }

    await logWorkspaceAction(userUid, "CONTACTS", "DELETE", `Deleted Google Contact: ${resourceName}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// 4. Google Chat Proxies
app.get("/api/workspace/chat/spaces", async (req, res) => {
  const token = req.headers.authorization;
  const userUid = req.query.uid as string || "unknown-user";
  if (!token) return res.status(401).json({ error: "Missing authorization token" });

  try {
    const response = await fetch("https://chat.googleapis.com/v1/spaces", {
      headers: { "Authorization": token }
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || "Failed to fetch Google Chat Spaces");

    await logWorkspaceAction(userUid, "CHAT", "LIST", `Listed Google Chat spaces (${data.spaces?.length || 0} found)`);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/workspace/chat/spaces/:spaceId/messages", async (req, res) => {
  const token = req.headers.authorization;
  const { spaceId } = req.params;
  const { text, uid } = req.body;
  if (!token) return res.status(401).json({ error: "Missing authorization token" });

  try {
    const response = await fetch(`https://chat.googleapis.com/v1/spaces/${spaceId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || "Failed to post message to Google Chat Space");

    await logWorkspaceAction(uid, "CHAT", "SEND", `Sent Chat Message into Space ${spaceId}: "${text.slice(0, 40)}..."`);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Retrieve Workspace Logs for auditing
app.get("/api/workspace/logs/:uid", async (req, res) => {
  try {
    const logs = await pgDb
      .select()
      .from(schema.workspaceLogs)
      .where(eq(schema.workspaceLogs.userId, req.params.uid))
      .orderBy(desc(schema.workspaceLogs.createdAt));
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// Serve React app in dev and production
async function startServer() {
  // Seed database tables on launch
  await seedCloudSQL();

  if (process.env.NODE_ENV !== "production") {
    // Integration of Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
