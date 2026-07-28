// ============================================================
// Affiliate fraud & anomaly detection.
//   - IP collision:      several affiliates sharing an IP hash
//   - Self-referral:     affiliate's own IP hash appears in their clicks
//   - Fingerprint reuse: identical device fingerprint across affiliates
//   - Rapid signups:     many attributed customers in a short window
// Results are read-only signals for the admin dashboard.
// ============================================================
import { prisma } from "./prisma.js";

export type FraudSeverity = "LOW" | "MEDIUM" | "HIGH";

export interface FraudAlert {
  id: string;
  severity: FraudSeverity;
  type:
    | "IP_COLLISION"
    | "SELF_REFERRAL"
    | "FINGERPRINT_REUSE"
    | "RAPID_SIGNUPS"
    | "BOT_TRAFFIC";
  affiliateIds: string[];
  detail: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
}

/**
 * Cross-affiliate IP collisions — two or more distinct affiliates receiving
 * clicks from the same hashed IP within the given window.
 */
async function detectIpCollisions(days: number): Promise<FraudAlert[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<
    Array<{ ipHash: string; affiliateIds: string[]; total: bigint; firstSeen: Date; lastSeen: Date }>
  >`
    SELECT "ipHash",
           array_agg(DISTINCT "affiliateId") AS "affiliateIds",
           COUNT(*)::bigint                   AS "total",
           MIN("createdAt")                   AS "firstSeen",
           MAX("createdAt")                   AS "lastSeen"
    FROM "AffiliateClick"
    WHERE "ipHash" IS NOT NULL AND "createdAt" >= ${since}
    GROUP BY "ipHash"
    HAVING COUNT(DISTINCT "affiliateId") > 1
    ORDER BY MAX("createdAt") DESC
    LIMIT 100
  `;
  return rows.map((r) => ({
    id: `ip:${r.ipHash.slice(0, 12)}`,
    severity: (r.affiliateIds.length >= 4 ? "HIGH" : r.affiliateIds.length >= 3 ? "MEDIUM" : "LOW") as FraudSeverity,
    type: "IP_COLLISION" as const,
    affiliateIds: r.affiliateIds,
    detail: `عنوان IP واحد (${r.ipHash.slice(0, 10)}…) تم استخدامه من ${r.affiliateIds.length} مسوّقين مختلفين.`,
    count: Number(r.total),
    firstSeen: r.firstSeen,
    lastSeen: r.lastSeen,
  }));
}

/**
 * Device fingerprint reused across multiple affiliates.
 */
async function detectFingerprintReuse(days: number): Promise<FraudAlert[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<
    Array<{ fingerprint: string; affiliateIds: string[]; total: bigint; firstSeen: Date; lastSeen: Date }>
  >`
    SELECT "fingerprint",
           array_agg(DISTINCT "affiliateId") AS "affiliateIds",
           COUNT(*)::bigint                   AS "total",
           MIN("createdAt")                   AS "firstSeen",
           MAX("createdAt")                   AS "lastSeen"
    FROM "AffiliateClick"
    WHERE "fingerprint" IS NOT NULL AND "createdAt" >= ${since}
    GROUP BY "fingerprint"
    HAVING COUNT(DISTINCT "affiliateId") > 1
    ORDER BY MAX("createdAt") DESC
    LIMIT 50
  `;
  return rows.map((r) => ({
    id: `fp:${r.fingerprint.slice(0, 12)}`,
    severity: "HIGH" as FraudSeverity,
    type: "FINGERPRINT_REUSE" as const,
    affiliateIds: r.affiliateIds,
    detail: `بصمة جهاز واحدة مشتركة بين ${r.affiliateIds.length} مسوّقين — احتمال حسابات مكررة.`,
    count: Number(r.total),
    firstSeen: r.firstSeen,
    lastSeen: r.lastSeen,
  }));
}

/**
 * Rapid signups — a single affiliate accrued an abnormal number of
 * attributed customers in a short window (possible fake conversions).
 */
async function detectRapidSignups(hours: number, threshold: number): Promise<FraudAlert[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<
    Array<{ affiliateId: string; total: bigint; firstSeen: Date; lastSeen: Date }>
  >`
    SELECT "affiliateId",
           COUNT(*)::bigint AS "total",
           MIN("createdAt") AS "firstSeen",
           MAX("createdAt") AS "lastSeen"
    FROM "AffiliateReferral"
    WHERE "createdAt" >= ${since}
    GROUP BY "affiliateId"
    HAVING COUNT(*) >= ${threshold}
    ORDER BY COUNT(*) DESC
    LIMIT 20
  `;
  return rows.map((r) => ({
    id: `rapid:${r.affiliateId}`,
    severity: (Number(r.total) >= threshold * 2 ? "HIGH" : "MEDIUM") as FraudSeverity,
    type: "RAPID_SIGNUPS" as const,
    affiliateIds: [r.affiliateId],
    detail: `${r.total} تحويل خلال ${hours} ساعة — نمط غير طبيعي.`,
    count: Number(r.total),
    firstSeen: r.firstSeen,
    lastSeen: r.lastSeen,
  }));
}

/**
 * Bot-flagged clicks aggregated per affiliate.
 */
async function detectBotTraffic(days: number, threshold: number): Promise<FraudAlert[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.affiliateClick.groupBy({
    by: ["affiliateId"],
    where: { isBot: true, createdAt: { gte: since } },
    _count: { _all: true },
    _min: { createdAt: true },
    _max: { createdAt: true },
    having: { affiliateId: { _count: { gte: threshold } } },
    orderBy: { _count: { affiliateId: "desc" } },
    take: 20,
  });
  return rows.map((r) => ({
    id: `bot:${r.affiliateId}`,
    severity: (r._count._all >= threshold * 3 ? "HIGH" : "MEDIUM") as FraudSeverity,
    type: "BOT_TRAFFIC" as const,
    affiliateIds: [r.affiliateId],
    detail: `${r._count._all} نقرة موسومة كبوت خلال ${days} يوم.`,
    count: r._count._all,
    firstSeen: r._min.createdAt ?? since,
    lastSeen: r._max.createdAt ?? new Date(),
  }));
}

export async function runFraudScan(opts?: {
  windowDays?: number;
  rapidHours?: number;
  rapidThreshold?: number;
  botThreshold?: number;
}): Promise<FraudAlert[]> {
  const windowDays = opts?.windowDays ?? 30;
  const rapidHours = opts?.rapidHours ?? 24;
  const rapidThreshold = opts?.rapidThreshold ?? 10;
  const botThreshold = opts?.botThreshold ?? 20;
  const [a, b, c, d] = await Promise.all([
    detectIpCollisions(windowDays),
    detectFingerprintReuse(windowDays),
    detectRapidSignups(rapidHours, rapidThreshold),
    detectBotTraffic(windowDays, botThreshold),
  ]);
  const rank: Record<FraudSeverity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return [...a, ...b, ...c, ...d].sort(
    (x, y) => rank[x.severity] - rank[y.severity] || y.lastSeen.getTime() - x.lastSeen.getTime()
  );
}
