import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Indian first names
const firstNames = [
    'Rahul', 'Priya', 'Amit', 'Sneha', 'Vijay', 'Pooja', 'Arun', 'Kavitha', 'Ravi', 'Anjali',
    'Suresh', 'Deepika', 'Rajesh', 'Meera', 'Sanjay', 'Divya', 'Karthik', 'Shruti', 'Vishal', 'Neha',
    'Manoj', 'Rashmi', 'Akash', 'Swati', 'Nikhil', 'Pallavi', 'Rohit', 'Shalini', 'Varun', 'Rekha',
    'Prakash', 'Anita', 'Gaurav', 'Shweta', 'Sachin', 'Nisha', 'Ajay', 'Geeta', 'Vikram', 'Sunita',
    'Harish', 'Lavanya', 'Dinesh', 'Archana', 'Pankaj', 'Vidya', 'Ashok', 'Bhavana', 'Naveen', 'Jyoti'
];

// Indian last names
const lastNames = [
    'Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Reddy', 'Joshi', 'Mehta', 'Verma', 'Iyer',
    'Nair', 'Rao', 'Pillai', 'Menon', 'Desai', 'Shah', 'Malhotra', 'Chopra', 'Kapoor', 'Saxena',
    'Agarwal', 'Mishra', 'Pandey', 'Tiwari', 'Dubey', 'Chatterjee', 'Banerjee', 'Mukherjee', 'Das', 'Ghosh'
];

// Clients
const clients = [
    'Kotak Mahindra Bank', 'Geocon Products', 'ProAffluence Advisory Services Pvt Ltd',
    'Tech Mahindra', 'Infosys', 'TCS', 'Wipro', 'HCL Technologies', 'Reliance Industries',
    'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Bajaj Finance', 'Mahindra & Mahindra'
];

// Positions
const positions = [
    'Branch Manager', 'Marketing Executive', 'Sales Coordinator', 'Software Engineer',
    'Product Manager', 'Business Analyst', 'HR Executive', 'Operations Manager',
    'Customer Service Executive', 'Financial Analyst', 'Relationship Manager',
    'Senior Developer', 'Team Lead', 'Project Manager', 'Quality Analyst'
];

// Recruiters
const recruiters = [
    'Pooja Vardani', 'Harish Suknale', 'Amit Kumar', 'Priya Sharma', 'Ravi Mehta',
    'Sneha Patel', 'Vijay Reddy', 'Anjali Nair'
];

function randomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateCandidateId(index: number): string {
    return `ZR_${170430 + index}_CAND`;
}

function generateInterviewId(index: number): string {
    return String(6980 + index);
}

function generateEmail(firstName: string, lastName: string): string {
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}@gmail.com`;
}

// Generate pending approvals (future interview dates)
function generatePendingApprovals(count: number) {
    const approvals = [];
    const today = new Date();

    for (let i = 0; i < count; i++) {
        const firstName = randomElement(firstNames);
        const lastName = randomElement(lastNames);
        const daysAhead = Math.floor(Math.random() * 30) + 1; // 1 to 30 days in future
        const interviewDate = new Date(today);
        interviewDate.setDate(today.getDate() + daysAhead);

        const submittedAt = new Date(today);
        submittedAt.setDate(today.getDate() - Math.floor(Math.random() * 7)); // 0-7 days ago
        submittedAt.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60));

        approvals.push({
            tenantId: 'tenant_123',
            candidateId: generateCandidateId(i),
            candidateFirstName: firstName,
            candidateLastName: lastName,
            candidateEmail: generateEmail(firstName, lastName),
            recruiterName: randomElement(recruiters),
            interviewId: generateInterviewId(i),
            interviewDate,
            clientName: randomElement(clients),
            positionAppliedFor: randomElement(positions),
            submissionStatus: 'Submission Pending',
            submittedAt,
        });
    }

    return approvals;
}

// Generate missed approvals (past interview dates)
function generateMissedApprovals(count: number) {
    const approvals = [];
    const today = new Date();

    for (let i = 0; i < count; i++) {
        const firstName = randomElement(firstNames);
        const lastName = randomElement(lastNames);
        const daysAgo = Math.floor(Math.random() * 14) + 1; // 1 to 14 days in past
        const interviewDate = new Date(today);
        interviewDate.setDate(today.getDate() - daysAgo);

        const submittedAt = new Date(interviewDate);
        submittedAt.setDate(interviewDate.getDate() - Math.floor(Math.random() * 5) - 1); // Before interview
        submittedAt.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60));

        approvals.push({
            tenantId: 'tenant_123',
            candidateId: `ZR_MISSED_${String(i + 1).padStart(3, '0')}_CAND`,
            candidateFirstName: firstName,
            candidateLastName: lastName,
            candidateEmail: generateEmail(firstName, lastName),
            recruiterName: randomElement(recruiters),
            interviewId: String(6900 + i),
            interviewDate,
            clientName: randomElement(clients),
            positionAppliedFor: randomElement(positions),
            submissionStatus: 'Submission Pending',
            submittedAt,
        });
    }

    return approvals;
}

async function seedApprovals() {
    console.log('🌱 Seeding approval requests...');

    // Clear existing data
    await prisma.approvalRequest.deleteMany({
        where: { tenantId: 'tenant_123' },
    });

    const pendingApprovals = generatePendingApprovals(50);
    const missedApprovals = generateMissedApprovals(50);
    const allApprovals = [...pendingApprovals, ...missedApprovals];

    // Insert all data
    for (const approval of allApprovals) {
        await prisma.approvalRequest.create({
            data: approval,
        });
    }

    console.log(`✅ Seeded ${allApprovals.length} approval requests`);
    console.log(`   - ${pendingApprovals.length} pending (future interview dates)`);
    console.log(`   - ${missedApprovals.length} missed (past interview dates)`);
}

seedApprovals()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
