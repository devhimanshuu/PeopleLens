// PeopleLens database seed. Provisions a realistic demo workspace inside a single transaction: - Departments…
// with an org hierarchy. - Teams inside departments. - ~40 employees across the org with varied…
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Gender } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('[seed] DATABASE_URL is required to seed the database.');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const GENDERS: Gender[] = ['female', 'male', 'non_binary', 'prefer_not_to_say'];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function dateWithin(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
): Date {
  const start = new Date(Date.UTC(startYear, startMonth, 1));
  const end = new Date(Date.UTC(endYear, endMonth + 1, 1));
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main(): Promise<void> {
  console.log('[seed] Seeding PeopleLens demo workspace…');
  // ── Departments (with hierarchy) ────────────────────────────────────────── No managerUserId is assigned:…
  // departments can be linked to a platform account (which defines manager RBAC scope) from the Users & Roles…
  const deptDefs = [
    { name: 'Engineering', description: 'Builds the core product platform' },
    { name: 'Product', description: 'Product strategy and design' },
    { name: 'Design', description: 'Product and brand design' },
    { name: 'Sales', description: 'Revenue and account growth' },
    { name: 'Marketing', description: 'Brand, demand and comms' },
    { name: 'Operations', description: 'People, finance and workplace' },
    { name: 'Finance', description: 'Financial planning and analysis' },
    { name: 'People', description: 'People operations and culture' },
  ];

  const deptIds: Record<string, string> = {};
  for (const d of deptDefs) {
    const existing = await prisma.department.findFirst({
      where: { name: d.name, deletedAt: null },
    });
    const department = existing
      ? await prisma.department.update({
          where: { id: existing.id },
          data: { description: d.description, isActive: true },
        })
      : await prisma.department.create({
          data: { name: d.name, description: d.description },
        });
    deptIds[d.name] = department.id;
    console.log(`  department: ${d.name}`);
  }

  // Add a parent/child relation: Engineering → Platform + Data sub-units.
  const ensureDept = async (name: string, parentId: string): Promise<string> => {
    const existing = await prisma.department.findFirst({ where: { name, deletedAt: null } });
    const department = existing
      ? await prisma.department.update({ where: { id: existing.id }, data: { parentId } })
      : await prisma.department.create({ data: { name, parentId } });
    return department.id;
  };
  deptIds['Platform Engineering'] = await ensureDept('Platform Engineering', deptIds.Engineering!);
  deptIds['Data & Analytics'] = await ensureDept('Data & Analytics', deptIds.Engineering!);

  // ── Teams ─────────────────────────────────────────────────────────────────
  const teamDefs: Array<{ name: string; department: string }> = [
    { name: 'Platform', department: 'Platform Engineering' },
    { name: 'Backend', department: 'Engineering' },
    { name: 'Frontend', department: 'Engineering' },
    { name: 'Data Platform', department: 'Data & Analytics' },
    { name: 'Product Strategy', department: 'Product' },
    { name: 'Brand & Content', department: 'Marketing' },
    { name: 'Enterprise Sales', department: 'Sales' },
    { name: 'People Ops', department: 'People' },
  ];

  const teamIds: Record<string, string> = {};
  for (const t of teamDefs) {
    const departmentId = deptIds[t.department]!;
    const existing = await prisma.team.findFirst({
      where: { name: t.name, departmentId, deletedAt: null },
    });
    const team = existing
      ? await prisma.team.update({ where: { id: existing.id }, data: { isActive: true } })
      : await prisma.team.create({ data: { name: t.name, departmentId } });
    teamIds[t.name] = team.id;
    console.log(`  team: ${t.name} (${t.department})`);
  }
  // Teams grouped by department — employees may only join a team inside their
  // own department (the API enforces this on create/update).
  const teamsByDept: Record<string, string[]> = {};
  for (const t of teamDefs) {
    const departmentId = deptIds[t.department]!;
    teamsByDept[departmentId] = [...(teamsByDept[departmentId] ?? []), teamIds[t.name]!];
  }

  // ── Employees ─────────────────────────────────────────────────────────────
  const firstNames = [
    'Alex',
    'Jordan',
    'Taylor',
    'Casey',
    'Morgan',
    'Riley',
    'Sam',
    'Jamie',
    'Avery',
    'Quinn',
    'Skyler',
    'Drew',
    'Reese',
    'Emery',
    'Rowan',
    'Finley',
    'Harper',
    'Blake',
    'Parker',
    'Elliot',
    'Nora',
    'Liam',
    'Maya',
    'Ethan',
    'Zoe',
    'Noah',
    'Aria',
    'Lucas',
    'Isla',
    'Miles',
  ];
  const lastNames = [
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Miller',
    'Davis',
    'Rodriguez',
    'Martinez',
    'Hernandez',
    'Lopez',
    'Gonzalez',
    'Wilson',
    'Anderson',
    'Thomas',
    'Taylor',
    'Moore',
    'Jackson',
    'Martin',
  ];
  const titles = [
    'Software Engineer',
    'Senior Engineer',
    'Staff Engineer',
    'Product Manager',
    'Product Designer',
    'Data Analyst',
    'Data Scientist',
    'Sales Executive',
    'Account Executive',
    'Marketing Manager',
    'Content Strategist',
    'People Partner',
    'Finance Analyst',
    'Operations Lead',
    'QA Engineer',
  ];
  const statuses: Array<'active' | 'on_leave' | 'probation' | 'terminated'> = [
    'active',
    'active',
    'active',
    'active',
    'active',
    'active',
    'on_leave',
    'probation',
    'terminated',
  ];

  const emails = new Set<string>();
  const codes = new Set<string>();

  const employeeRows: Array<{
    employeeCode: string;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
    gender: Gender;
    hiredAt: Date;
    status: (typeof statuses)[number];
    departmentId: string;
    teamId: string | null;
  }> = [];

  const allDepartmentIds = Object.values(deptIds);

  for (let i = 0; i < 42; i += 1) {
    let code: string;
    do {
      code = `EMP-${String(i + 1).padStart(4, '0')}`;
    } while (codes.has(code));
    codes.add(code);

    const firstName = firstNames[i % firstNames.length]!;
    const lastName = lastNames[i % lastNames.length]!;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i > 20 ? `.${i}` : ''}@peoplelens.com`;
    const emailKey = email.toLowerCase();
    if (emails.has(emailKey)) continue;
    emails.add(emailKey);

    // Roughly 60% Engineering-family for a realistic tech-heavy distribution.
    const departmentId =
      i % 5 === 0 ? allDepartmentIds[i % allDepartmentIds.length]! : deptIds.Engineering!;
    // Team must belong to the chosen department — never a cross-department team.
    const deptTeams = teamsByDept[departmentId] ?? [];
    const teamId = Math.random() < 0.75 && deptTeams.length > 0 ? pick(deptTeams) : null;

    employeeRows.push({
      employeeCode: code,
      firstName,
      lastName,
      email,
      jobTitle: titles[i % titles.length]!,
      gender: GENDERS[i % GENDERS.length]!,
      hiredAt: dateWithin(2019, 0, 2026, 5),
      status: statuses[i % statuses.length]!,
      departmentId,
      teamId,
    });
  }

  // Insert employees and build reporting lines afterwards (managers must exist).
  const employeeIds: string[] = [];
  for (const row of employeeRows) {
    const employee = await prisma.employee.upsert({
      where: { employeeCode: row.employeeCode },
      update: {
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        jobTitle: row.jobTitle,
        gender: row.gender,
        hiredAt: row.hiredAt,
        status: row.status,
        departmentId: row.departmentId,
        teamId: row.teamId,
        deletedAt: null,
      },
      create: {
        employeeCode: row.employeeCode,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        jobTitle: row.jobTitle,
        gender: row.gender,
        hiredAt: row.hiredAt,
        status: row.status,
        departmentId: row.departmentId,
        teamId: row.teamId,
      },
    });
    employeeIds.push(employee.id);
  }

  // Assign managers: roughly every 4th employee manages the next 3.
  for (let i = 0; i < employeeIds.length; i += 1) {
    const managerIndex = i % 4 === 0 && i + 1 < employeeIds.length ? i : i - (i % 4) - 1;
    if (managerIndex < 0 || managerIndex === i) continue;
    await prisma.employee.update({
      where: { id: employeeIds[i]! },
      data: { managerId: employeeIds[managerIndex]! },
    });
  }

  const counts = await Promise.all([
    prisma.user.count(),
    prisma.department.count(),
    prisma.team.count(),
    prisma.employee.count(),
  ]);
  console.log('[seed] Done. Counts:', {
    users: counts[0],
    departments: counts[1],
    teams: counts[2],
    employees: counts[3],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('[seed] Failed:', error);
    process.exit(1);
  });
