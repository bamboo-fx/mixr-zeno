import { db } from '../src/db.js';

const COLLEGE_ID = 'hmc01';
const BADMINTON_CLUB_ID = 'cmmboyhi20007139hwq2be4w3';
const BADMINTON_GROUP_ID = 'cmmboz1rt000c139hn6iad70j';

const clubUsers = [
  { id: 'test-bc-001', name: 'Aiden Park',  email: 'aiden.park@test.com',  yearInSchool: 'Junior' },
  { id: 'test-bc-002', name: 'Mia Chen',    email: 'mia.chen@test.com',    yearInSchool: 'Sophomore' },
  { id: 'test-bc-003', name: 'Jordan Lee',  email: 'jordan.lee@test.com',  yearInSchool: 'Senior' },
  { id: 'test-bc-004', name: 'Sofia Ruiz',  email: 'sofia.ruiz@test.com',  yearInSchool: 'Freshman' },
  { id: 'test-bc-005', name: 'Ethan Kim',   email: 'ethan.kim@test.com',   yearInSchool: 'Junior' },
];

const groupUsers = [
  { id: 'test-bg-001', name: 'Priya Nair',    email: 'priya.nair@test.com',    yearInSchool: 'Sophomore' },
  { id: 'test-bg-002', name: 'Marcus Webb',   email: 'marcus.webb@test.com',   yearInSchool: 'Senior' },
  { id: 'test-bg-003', name: 'Yuna Tanaka',   email: 'yuna.tanaka@test.com',   yearInSchool: 'Junior' },
  { id: 'test-bg-004', name: 'Carlos Mendez', email: 'carlos.mendez@test.com', yearInSchool: 'Freshman' },
  { id: 'test-bg-005', name: 'Lily Zhang',    email: 'lily.zhang@test.com',    yearInSchool: 'Sophomore' },
];

for (const u of [...clubUsers, ...groupUsers]) {
  await db.user.upsert({
    where: { id: u.id },
    create: { id: u.id, email: u.email, name: u.name, emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
    update: {},
  });
  await db.profile.upsert({
    where: { id: u.id },
    create: { id: u.id, userId: u.id, email: u.email, name: u.name, collegeId: COLLEGE_ID, yearInSchool: u.yearInSchool },
    update: {},
  });
  console.log('✓ User:', u.name);
}

for (const u of clubUsers) {
  await db.groupMember.upsert({
    where: { groupId_userId: { groupId: BADMINTON_CLUB_ID, userId: u.id } },
    create: { groupId: BADMINTON_CLUB_ID, userId: u.id, role: 'member' },
    update: {},
  });
  console.log('  → Badminton Club:', u.name);
}

for (const u of groupUsers) {
  await db.groupMember.upsert({
    where: { groupId_userId: { groupId: BADMINTON_GROUP_ID, userId: u.id } },
    create: { groupId: BADMINTON_GROUP_ID, userId: u.id, role: 'member' },
    update: {},
  });
  console.log('  → Badminton Group:', u.name);
}

console.log('\nDone! 5 members in each badminton group.');
await db.$disconnect();
