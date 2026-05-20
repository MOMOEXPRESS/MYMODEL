// Seed: one fake agency + owner + 20 models + a little availability so the
// Board has something to show on first load.
//
// Non-destructive: if the demo agency already exists we skip entirely. This
// makes it safe to run from a Vercel build hook on every deploy without
// wiping out real data the user has created through the UI.
//
// Pass LUXLANE_SEED_FORCE=1 to re-seed (deletes and re-creates the demo
// agency). Useful locally.

import { loadEnvFile } from "node:process";
try {
  // Best-effort — in prod the env comes from the platform.
  loadEnvFile(".env");
} catch {
  /* ignore */
}

import { PrismaClient, Division, ModelStatus, AvailabilityStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { syncHoldsForJob } from "../src/lib/holds";

const prisma = new PrismaClient();

const DEMO_CODE = "PARIS001";
const DEMO_OWNER_EMAIL = "owner@mademoiselle.demo";
const DEMO_PASSWORD = "luxlane-demo";

const firstNames = [
  "Inès", "Camille", "Léa", "Manon", "Chloé", "Juliette", "Anaïs", "Zoé",
  "Margaux", "Louise", "Emma", "Alice", "Jade", "Sarah", "Lina",
  "Nathan", "Hugo", "Louis", "Gabriel", "Raphaël",
];
const lastNames = [
  "Moreau", "Laurent", "Bernard", "Dubois", "Martin", "Rousseau", "Garnier",
  "Faure", "Leclerc", "Girard", "Mercier", "Blanc", "Guerin", "Muller",
  "Lemoine", "Roche", "Fontaine", "Chevalier", "Perrin", "Barbier",
];

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const existing = await prisma.agency.findUnique({ where: { signupCode: DEMO_CODE } });
  const force = process.env.LUXLANE_SEED_FORCE === "1";

  if (existing && !force) {
    console.log(`ℹ️   Demo agency (${DEMO_CODE}) already exists — skipping seed.`);
    console.log("    Set LUXLANE_SEED_FORCE=1 to wipe and re-create.");
    return;
  }

  if (existing && force) {
    console.log("🧹  LUXLANE_SEED_FORCE=1 — resetting demo database...");
    await prisma.$executeRawUnsafe("DROP SCHEMA IF EXISTS public CASCADE");
    await prisma.$executeRawUnsafe("CREATE SCHEMA public");
    await prisma.$executeRawUnsafe("GRANT ALL ON SCHEMA public TO public");
    await prisma.$executeRawUnsafe("GRANT ALL ON SCHEMA public TO luxlane");
    const { execSync } = await import("node:child_process");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    execSync("npx prisma db push --accept-data-loss", {
      cwd: join(dirname(fileURLToPath(import.meta.url)), ".."),
      stdio: "inherit",
    });
  }

  console.log("🏢  Creating demo agency (Mademoiselle Paris)...");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const agency = await prisma.agency.create({
    data: {
      name: "Mademoiselle Paris",
      city: "Paris",
      country: "FR",
      signupCode: DEMO_CODE,
      defaultCommissionPercent: 20,
      currency: "EUR",
    },
  });

  const owner = await prisma.user.create({
    data: {
      email: DEMO_OWNER_EMAIL,
      passwordHash,
      displayName: "Chloé Brami",
      role: "AGENCY_STAFF",
      agencyId: agency.id,
    },
  });
  await prisma.agencyMember.create({
    data: { userId: owner.id, agencyId: agency.id, role: "OWNER" },
  });

  const staff = [
    { email: "booker@mademoiselle.demo", name: "Alex Martin", role: "BOOKER" as const },
    { email: "production@mademoiselle.demo", name: "Sam Dupont", role: "PRODUCTION" as const },
    { email: "accounts@mademoiselle.demo", name: "Julie Renard", role: "ACCOUNTS" as const },
  ];
  console.log("👥  Creating demo staff (booker, production, accounts)...");
  for (const s of staff) {
    const u = await prisma.user.create({
      data: {
        email: s.email,
        passwordHash,
        displayName: s.name,
        role: "AGENCY_STAFF",
        agencyId: agency.id,
      },
    });
    await prisma.agencyMember.create({
      data: { userId: u.id, agencyId: agency.id, role: s.role },
    });
  }

  console.log("👯  Creating 20 demo models...");
  const divisions: Division[] = [
    Division.WOMEN, Division.WOMEN, Division.WOMEN, Division.WOMEN, Division.WOMEN,
    Division.WOMEN, Division.WOMEN, Division.WOMEN, Division.WOMEN, Division.WOMEN,
    Division.WOMEN, Division.WOMEN,
    Division.MEN, Division.MEN, Division.MEN, Division.MEN,
    Division.NEW_FACES, Division.NEW_FACES,
    Division.CURVE, Division.TALENTS,
  ];

  for (let i = 0; i < 20; i++) {
    const first = rand(firstNames);
    const last = rand(lastNames);
    const email = `model${i + 1}@mademoiselle.demo`;
    const division = divisions[i]!;
    const isMale = division === Division.MEN;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: `${first} ${last}`,
        role: "MODEL",
        agencyId: agency.id,
      },
    });

    await prisma.model.create({
      data: {
        userId: user.id,
        agencyId: agency.id,
        division,
        status: ModelStatus.ACTIVE,
        measurements: {
          heightCm: isMale ? randInt(182, 192) : randInt(172, 182),
          bustCm: isMale ? null : randInt(80, 88),
          waistCm: isMale ? randInt(74, 82) : randInt(58, 64),
          hipsCm: isMale ? null : randInt(86, 92),
          shoeEu: isMale ? randInt(42, 45) : randInt(38, 41),
          dressEu: isMale ? null : randInt(34, 38),
          suitEu: isMale ? randInt(46, 50) : null,
          inseamCm: randInt(78, 88),
          hair: rand(["Blond", "Brown", "Dark brown", "Black", "Auburn"]),
          eyes: rand(["Blue", "Green", "Brown", "Hazel", "Grey"]),
        },
      },
    });
  }

  console.log("📅  Sprinkling some availability so the Board has life...");
  const allModels = await prisma.model.findMany({ where: { agencyId: agency.id } });
  const today = new Date();
  const today0 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  for (const m of allModels) {
    // ~30% chance per model of a 2-5 day traveling block somewhere in the next 45 days.
    if (Math.random() < 0.3) {
      const startOffset = randInt(1, 40);
      const span = randInt(2, 5);
      for (let d = 0; d < span; d++) {
        const date = new Date(today0);
        date.setUTCDate(date.getUTCDate() + startOffset + d);
        await prisma.availability.create({
          data: {
            modelId: m.userId,
            date,
            status: AvailabilityStatus.TRAVELING,
            reason: "Milan",
          },
        });
      }
    }
    // A few scattered unavailable days.
    for (let i = 0; i < randInt(0, 3); i++) {
      const date = new Date(today0);
      date.setUTCDate(date.getUTCDate() + randInt(1, 40));
      try {
        await prisma.availability.create({
          data: {
            modelId: m.userId,
            date,
            status: AvailabilityStatus.UNAVAILABLE,
          },
        });
      } catch {
        // dupe date — ignore
      }
    }
  }

  console.log("🏢  Demo client + booking for client portal...");
  const DEMO_CLIENT_TOKEN = "demo-client-luxlane-portal";
  const clientUser = await prisma.user.create({
    data: {
      email: "client@luxlane.demo",
      passwordHash,
      displayName: "LVMH Creative",
      role: "CLIENT",
    },
  });
  await prisma.clientProfile.create({
    data: {
      userId: clientUser.id,
      subtype: "BRAND",
      companyName: "LVMH",
      city: "Paris",
    },
  });

  const client = await prisma.client.create({
    data: {
      agencyId: agency.id,
      name: "LVMH Creative",
      companyName: "LVMH",
      email: "client@luxlane.demo",
      subtype: "BRAND",
      platformUserId: clientUser.id,
      portalEnabled: true,
      portalToken: DEMO_CLIENT_TOKEN,
      portalTokenIssuedAt: new Date(),
      createdByUserId: owner.id,
    },
  });

  const jobStart = new Date(today0);
  const jobEnd = new Date(today0);
  jobEnd.setUTCDate(jobEnd.getUTCDate() + 2);

  const demoJob = await prisma.job.create({
    data: {
      agencyId: agency.id,
      title: "SS26 Beauty — Paris",
      type: "CAMPAIGN",
      status: "OPEN",
      startDate: jobStart,
      endDate: jobEnd,
      location: "Studio 8, Paris",
      locationCity: "Paris",
      defaultRate: 1200,
      rateType: "DAY",
      currency: "EUR",
      clientId: client.id,
      ownerUserId: owner.id,
    },
  });

  const lineup = allModels.slice(0, 4);
  for (const m of lineup) {
    await prisma.jobAssignment.create({
      data: {
        jobId: demoJob.id,
        modelId: m.userId,
        status: "OPTION_1",
        proposedByUserId: owner.id,
      },
    });
  }
  await syncHoldsForJob(demoJob.id);

  console.log("🌐  Platform accounts (creative, member)...");
  const creativeUser = await prisma.user.create({
    data: {
      email: "photographer@luxlane.demo",
      passwordHash,
      displayName: "Marie Legrand",
      role: "CREATIVE",
    },
  });
  await prisma.creativeProfile.create({
    data: { userId: creativeUser.id, subtype: "PHOTOGRAPHER", city: "Paris" },
  });

  const memberUser = await prisma.user.create({
    data: {
      email: "member@luxlane.demo",
      passwordHash,
      displayName: "Alex Explore",
      role: "MEMBER",
    },
  });
  await prisma.memberProfile.create({
    data: { userId: memberUser.id, city: "Paris" },
  });

  await prisma.connection.create({
    data: {
      fromUserId: owner.id,
      toUserId: clientUser.id,
      status: "ACCEPTED",
      respondedAt: new Date(),
    },
  });
  await prisma.connection.create({
    data: {
      fromUserId: creativeUser.id,
      toUserId: owner.id,
      status: "ACCEPTED",
      respondedAt: new Date(),
    },
  });

  const groupEvent = await prisma.groupEvent.create({
    data: {
      hostUserId: creativeUser.id,
      type: "SHOOT",
      status: "OPEN",
      title: "Editorial test — Marais",
      city: "Paris",
      startDate: jobStart,
      description: "Demo group event for network collaboration.",
    },
  });
  await prisma.groupEventMember.createMany({
    data: [
      { eventId: groupEvent.id, userId: creativeUser.id, role: "HOST", status: "ACCEPTED" },
      { eventId: groupEvent.id, userId: owner.id, role: "CLIENT", status: "ACCEPTED" },
    ],
  });

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  console.log("");
  console.log("✅  Seed complete.");
  console.log("");
  console.log("   Agency:       Mademoiselle Paris");
  console.log(`   Signup code:  ${DEMO_CODE}`);
  console.log(`   Password:     ${DEMO_PASSWORD} (all demo users)`);
  console.log("");
  console.log("   Agency staff:");
  console.log(`     Owner:      ${DEMO_OWNER_EMAIL}`);
  console.log("     Booker:     booker@mademoiselle.demo");
  console.log("     Production: production@mademoiselle.demo");
  console.log("     Accounts:   accounts@mademoiselle.demo");
  console.log("   Models:       model1@mademoiselle.demo .. model20@mademoiselle.demo");
  console.log("");
  console.log(`   Client portal (no password):`);
  console.log(`     ${origin}/client/${DEMO_CLIENT_TOKEN}`);
  console.log("");
  console.log("   Platform accounts:");
  console.log("     Client:    client@luxlane.demo");
  console.log("     Creative:  photographer@luxlane.demo");
  console.log("     Member:    member@luxlane.demo");
  console.log(`     Network:   ${origin}/network`);
  console.log(`     Events:    ${origin}/events`);
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
