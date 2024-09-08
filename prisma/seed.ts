import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://dev@localhost:5432/propertyos?host=/var/run/postgresql";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create demo organization & owner user
  const org = await prisma.organization.upsert({
    where: { slug: "acme-properties" },
    update: {},
    create: { name: "Acme Properties", slug: "acme-properties" },
  });

  const passwordHash = await bcrypt.hash("password123", 12);

  const ownerUser = await prisma.user.upsert({
    where: { email: "admin@acme.com" },
    update: {},
    create: { name: "Admin User", email: "admin@acme.com", passwordHash },
  });

  await prisma.membership.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: ownerUser.id } },
    update: {},
    create: { organizationId: org.id, userId: ownerUser.id, role: "OWNER" },
  });

  // Create a property
  const property = await prisma.property.upsert({
    where: { id: "seed-property-1" },
    update: {},
    create: {
      id: "seed-property-1",
      organizationId: org.id,
      name: "Sunset Apartments",
      address: "123 Main Street",
      city: "Los Angeles",
      state: "CA",
      zip: "90001",
      propertyType: "RESIDENTIAL",
      status: "ACTIVE",
    },
  });

  // Create units
  const unit1 = await prisma.unit.upsert({
    where: { propertyId_unitNumber: { propertyId: property.id, unitNumber: "101" } },
    update: {},
    create: {
      propertyId: property.id,
      unitNumber: "101",
      bedrooms: 2,
      bathrooms: 1,
      monthlyRent: 1800,
      status: "OCCUPIED",
    },
  });

  const unit2 = await prisma.unit.upsert({
    where: { propertyId_unitNumber: { propertyId: property.id, unitNumber: "102" } },
    update: {},
    create: {
      propertyId: property.id,
      unitNumber: "102",
      bedrooms: 1,
      bathrooms: 1,
      monthlyRent: 1200,
      status: "VACANT",
    },
  });

  // Create tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: "seed-tenant-1" },
    update: {},
    create: {
      id: "seed-tenant-1",
      organizationId: org.id,
      name: "Jane Smith",
      email: "jane@example.com",
      phone: "(555) 123-4567",
      status: "ACTIVE",
    },
  });

  // Create active lease for unit 101
  const lease = await prisma.lease.upsert({
    where: { id: "seed-lease-1" },
    update: {},
    create: {
      id: "seed-lease-1",
      organizationId: org.id,
      unitId: unit1.id,
      tenantId: tenant.id,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-12-31"),
      monthlyRent: 1800,
      securityDeposit: 1800,
      status: "ACTIVE",
    },
  });

  // Create a rent charge
  const now = new Date();
  const billingPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  await prisma.rentCharge.upsert({
    where: { leaseId_billingPeriod: { leaseId: lease.id, billingPeriod } },
    update: {},
    create: {
      organizationId: org.id,
      leaseId: lease.id,
      billingPeriod,
      amount: 1800,
      dueDate: new Date(now.getFullYear(), now.getMonth(), 1),
      status: "PENDING",
    },
  });

  // Create maintenance request
  await prisma.maintenanceRequest.upsert({
    where: { id: "seed-maintenance-1" },
    update: {},
    create: {
      id: "seed-maintenance-1",
      organizationId: org.id,
      propertyId: property.id,
      unitId: unit1.id,
      submittedBy: ownerUser.id,
      tenantId: tenant.id,
      title: "Leaking kitchen faucet",
      description: "The kitchen faucet has been dripping for the past week.",
      priority: "MEDIUM",
      status: "OPEN",
    },
  });

  console.log("✓ Seed complete");
  console.log("  Login: admin@acme.com / password123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
