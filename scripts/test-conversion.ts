import { readFileSync } from "fs";
import { join } from "path";
import { runConversion } from "../src/lib/conversion/engine";
import { prisma } from "../src/lib/db";

async function testConversion() {
  console.log("🧪 Testing Reference Converter\n");

  // Read test file
  const testFile = join(process.cwd(), "zdoc", "meddef1.0.xml");
  console.log("📄 Loading test file:", testFile);

  const content = readFileSync(testFile, "utf-8");
  console.log(`📊 File size: ${(content.length / 1024).toFixed(2)} KB\n`);

  // Test conversion with options
  const options = {
    includeAbstract: true,
    includeKeywords: true,
    includeNotes: false,
    escapeLatex: true,
    citationStyle: "bibtex" as const,
  };

  console.log(
    "⚙️  Conversion options:",
    JSON.stringify(options, null, 2),
    "\n"
  );
  console.log("🔄 Converting...\n");

  const startTime = Date.now();
  const result = await runConversion(content, options);
  const duration = Date.now() - startTime;

  // Display results
  console.log("✅ Conversion completed!\n");
  console.log("📈 Statistics:");
  console.log(`  • Entries: ${result.entryCount}`);
  console.log(`  • Duration: ${duration} ms`);
  console.log(
    `  • Output size: ${(result.bibtex.length / 1024).toFixed(2)} KB`
  );
  console.log(`  • Warnings: ${result.warnings?.length ?? 0}`);

  if (result.warnings && result.warnings.length > 0) {
    console.log("\n⚠️  Warnings:");
    result.warnings.forEach((warning: string, i: number) => {
      console.log(`  ${i + 1}. ${warning}`);
    });
  }

  // Show sample entries
  const entries = result.bibtex.split("\n\n").filter((e: string) => e.trim());
  console.log(`\n📚 Sample entries (showing first 3 of ${entries.length}):\n`);
  entries.slice(0, 3).forEach((entry: string, i: number) => {
    console.log(`--- Entry ${i + 1} ---`);
    console.log(entry.substring(0, 400) + (entry.length > 400 ? "..." : ""));
    console.log();
  });

  // Test database logging
  console.log("💾 Testing database logging...\n");

  try {
    const job = await prisma.conversionJob.create({
      data: {
        resourceSlug: "ref",
        inputFormat: "xml",
        outputFormat: "bibtex",
        status: "COMPLETED",
        sourceName: "meddef1.0.xml",
        sourceSize: content.length,
        entryCount: result.entryCount,
        warningCount: result.warnings?.length ?? 0,
        errorCount: 0,
        durationMs: duration,
        metadata: { options, testRun: true },
      },
    });

    console.log("✅ Logged to database:");
    console.log(`  • Job ID: ${job.id}`);
    console.log(`  • Created: ${job.createdAt.toISOString()}`);
  } catch (err) {
    console.error("❌ Database logging failed:", err);
  }

  // Get recent jobs
  try {
    const recentJobs = await prisma.conversionJob.findMany({
      where: { resourceSlug: "ref" },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    console.log(`\n📋 Recent conversion jobs (${recentJobs.length})`);
    recentJobs.forEach((job, i: number) => {
      console.log(
        `  ${i + 1}. ${job.sourceName ?? "Unknown"} - ${
          job.entryCount
        } entries - ${job.status} (${job.durationMs}ms)`
      );
    });
  } catch (err) {
    console.error("❌ Failed to fetch recent jobs:", err);
  }

  await prisma.$disconnect();
  console.log("\n🎉 Test complete!");
}

testConversion().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
