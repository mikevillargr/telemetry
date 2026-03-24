import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@growthrocket.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  // Create organization
  const org = await prisma.organization.upsert({
    where: { id: 'org-growth-rocket' },
    update: {},
    create: {
      id: 'org-growth-rocket',
      name: 'Growth Rocket',
    },
  });

  console.log(`✓ Organization: ${org.name} (${org.id})`);

  // Create admin user
  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      orgId: org.id,
      email: adminEmail,
      name: 'Admin',
      hashedPassword,
      role: 'admin',
    },
  });

  console.log(`✓ Admin user: ${admin.email} (${admin.id})`);

  // Create default agent configs
  const agentDefaults: Array<{
    agentType: 'data' | 'visualization' | 'strategy' | 'trends';
    model: string;
    systemPrompt: string;
  }> = [
    {
      agentType: 'data',
      model: 'claude-sonnet-4-6',
      systemPrompt:
        'You are the Data Agent for Growth Rocket BI. You pull, normalize, and analyze marketing data from connected sources. Always scope your analysis to the specific client context provided. Be precise with metrics and data points.',
    },
    {
      agentType: 'visualization',
      model: 'claude-sonnet-4-6',
      systemPrompt: `You are the Visualization Agent for Growth Rocket BI. You create clear, insightful data visualizations.

VISUALIZATION OUTPUT FORMAT:
When asked to create a chart or visualization, output ONE of these fenced code blocks:

1. SVG (preferred for simple charts):
\`\`\`svg
<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">...</svg>
\`\`\`

2. Chart JSON (for interactive recharts rendering):
\`\`\`chart-json
{"type":"bar","title":"Monthly Traffic","xKey":"month","yKeys":["sessions","conversions"],"data":[{"month":"Jan","sessions":4200,"conversions":320}]}
\`\`\`
Supported types: bar, line, pie. Include xKey, yKeys, data array, and optional title/colors.

3. HTML (for complex/custom visualizations):
\`\`\`html
<div>...</div>
\`\`\`

RULES:
- Use the platform color palette: #E8450A (orange/primary), #3B82F6 (blue), #10B981 (green), #8B5CF6 (purple), #F59E0B (amber), #EC4899 (pink)
- Always label axes, include legends, and add a title
- Keep SVGs self-contained with no external dependencies
- You may include markdown text before or after the visualization to explain the data
- Use markdown tables (| col | col |) for tabular data that doesn't need a chart
- For chart-json, the data array must contain objects with consistent keys`,
    },
    {
      agentType: 'strategy',
      model: 'claude-sonnet-4-6',
      systemPrompt:
        'You are the Strategy Agent for Growth Rocket BI. You provide strategic marketing recommendations based on data analysis and industry context. Be specific, actionable, and prioritize recommendations by impact.',
    },
    {
      agentType: 'trends',
      model: 'claude-sonnet-4-6',
      systemPrompt:
        'You are the Trends Agent for Growth Rocket BI. You monitor industry trends, algorithm updates, and market shifts relevant to digital marketing. Assess impact on specific clients and recommend proactive actions.',
    },
  ];

  for (const config of agentDefaults) {
    const agentConfig = await prisma.agentConfig.upsert({
      where: {
        orgId_agentType: {
          orgId: org.id,
          agentType: config.agentType,
        },
      },
      update: { model: config.model, systemPrompt: config.systemPrompt },
      create: {
        orgId: org.id,
        agentType: config.agentType,
        model: config.model,
        systemPrompt: config.systemPrompt,
      },
    });
    console.log(`✓ Agent config: ${agentConfig.agentType} → ${agentConfig.model}`);
  }

  console.log('\n✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
