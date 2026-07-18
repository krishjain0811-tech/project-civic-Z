export type Role = 'CITIZEN' | 'ORGANIZATION_LEADER' | 'BLOOD_BANK_ADMIN' | 'DRIVER' | 'SYSTEM_ADMIN';

export type ProjectStatus = 'DRAFT' | 'PENDING_PAYMENT' | 'ACTIVE' | 'UNDER_REVIEW' | 'COMPLETED' | 'FAILED';

export type ProofStatus = 'PENDING' | 'AI_VERIFYING' | 'APPROVED' | 'REJECTED';

export type TransactionType =
  | 'EARNED_BLOOD_DONATION'
  | 'EARNED_ORGAN_DONATION'
  | 'EARNED_CIVIC_WORK'
  | 'EARNED_MONEY_PURCHASE'
  | 'SPENT_BLOOD_REDEMPTION'
  | 'SPENT_AMBULANCE_RIDE'
  | 'EARNED_P2P_TIP'
  | 'SPENT_P2P_TIP';

export interface User {
  id: string;
  email: string;
  phoneNumber: string;
  fullName: string;
  username: string;
  age: number;
  profilePicUrl: string | null;
  bio: string | null;
  role: Role;
  isVerified: boolean;
  kycDocType: string | null;
  kycDocNumber: string | null;
  humanityPoints: number;
  createdAt: string;
  passwordHash?: string;
}

export interface Organization {
  id: string;
  name: string;
  leaderId: string;
  isKycVerified: boolean;
  kycDetails: {
    address: string;
    docType: string;
    docNumber: string;
  } | null;
}

export interface Group {
  id: string;
  orgId: string;
  name: string;
  description: string;
  memberCount: number;
  members: string[]; // userIds
}

export interface Project {
  id: string;
  orgId: string;
  title: string;
  description: string;
  listingFeePaid: boolean;
  feeAmount: number;
  maxWorkers: number;
  status: ProjectStatus;
  beforePhotoUrl: string;
  afterPhotoUrl: string | null;
  assignedWorkers: string[]; // userIds who are assigned
  pointsEarned: number;
  createdAt: string;
  updatedAt: string;
}

export interface HourlyProof {
  id: string;
  projectId: string;
  videoUrl: string;
  timestamp: string;
  aiIsDeepfake: boolean;
  aiConfidence: number;
  status: ProofStatus;
  failureReason: string | null;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  userPic: string | null;
  text: string;
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  user: {
    fullName: string;
    username: string;
    profilePicUrl: string | null;
    role: Role;
  };
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO';
  caption: string | null;
  isAiGenerated: boolean;
  likeCount: number;
  dislikeCount: number;
  pointsGranted: number;
  comments: Comment[];
  createdAt: string;
  likedBy: string[]; // userIds
  dislikedBy: string[]; // userIds
}

export interface PointLedger {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  description: string;
  previousHash: string;
  currentHash: string;
  createdAt: string;
}

export interface BloodBank {
  id: string;
  name: string;
  address: string;
  locationLat: number;
  locationLng: number;
  inventory: { [bloodGroup: string]: number };
}

export interface BloodRedemption {
  id: string;
  userId: string;
  bloodBankId: string;
  bloodGroup: string;
  units: number;
  pointsDeducted: number;
  createdAt: string;
}

export interface AmbulanceRide {
  id: string;
  userId: string;
  pickupLat: number;
  pickupLng: number;
  destLat: number;
  destLng: number;
  distanceKm: number;
  pointsDeducted: number;
  overageFeeUsd: number;
  status: 'SEARCHING' | 'DISPATCHED' | 'COMPLETED';
  createdAt: string;
}

export interface Story {
  id: string;
  userId: string;
  user: {
    fullName: string;
    username: string;
    profilePicUrl: string | null;
  };
  mediaUrl: string;
  expiresAt: string;
  createdAt: string;
}

export interface Achievement {
  id: string;
  userId: string;
  title: string;
  description: string;
  orgName: string;
  pointsEarned: number;
  createdAt: string;
}
