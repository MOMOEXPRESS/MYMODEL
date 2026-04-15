// Seed: one fake agency + owner + 20 models.
// Idempotent — safe to re-run. Deletes the demo agency first, then recreates.

import { PrismaClient, Division, ModelStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

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
  console.log("🧹  Clearing existing demo data...");
  const existing = await prisma.agency.findUnique({ where: { signupCode: DEMO_CODE } });
  if (existing) {
    await prisma.agency.delete({ where: { id: existing.id } });
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

  console.log("");
  console.log("✅  Seed complete.");
  console.log("");
  console.log("   Agency:       Mademoiselle Paris");
  console.log(`   Signup code:  ${DEMO_CODE}`);
  console.log(`   Owner login:  ${DEMO_OWNER_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`   Model logins: model1@mademoiselle.demo .. model20@... (same password)`);
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
