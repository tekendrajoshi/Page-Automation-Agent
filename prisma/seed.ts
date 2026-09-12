import { prisma } from "../src/lib/db";
import { processRawItems } from "../src/lib/workflows/pipeline";

async function main() {
  await processRawItems([
    {
      sourceType: "IOE_EXAM",
      sourceName: "IOE Exam Control Division",
      sourceUrl: "https://exam.ioe.tu.edu.np/",
      externalId: "demo-ioe-result",
      title: "BE/BArch Regular Examination Result Notice",
      body: "The examination control division has published a result notice. Students are requested to check the official page for details."
    },
    {
      sourceType: "GMAIL",
      sourceName: "Student Gmail Inbox",
      externalId: "demo-student-problem",
      title: "Student issue: admit card correction help",
      body: "A student reported an admit card name correction problem and requested a public reminder about checking details before the exam."
    }
  ]);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
