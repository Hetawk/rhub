import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import { createHash } from "crypto";

function hashPwd(pwd: string): string {
  return createHash("sha256").update(pwd).digest("hex");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const pwd = searchParams.get("pwd");

    // Get file metadata from database
    const file = await prisma.downloadableFile.findUnique({
      where: { id },
    });

    if (!file || !file.isActive) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Check if file should be protected based on time
    const now = new Date();
    const isTimeProtected = file.publicUntil && now > file.publicUntil;
    const needsPassword =
      (file.accessLevel === "protected" || isTimeProtected) && file.password;

    // Check password for protected files
    if (needsPassword) {
      if (!pwd) {
        return NextResponse.json(
          { error: "Password required", requiresPassword: true },
          { status: 401 }
        );
      }
      if (hashPwd(pwd) !== file.password) {
        return NextResponse.json(
          { error: "Invalid password" },
          { status: 403 }
        );
      }
    }

    // Block private files
    if (file.accessLevel === "private") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Increment download count
    await prisma.downloadableFile.update({
      where: { id },
      data: { downloads: { increment: 1 } },
    });

    // Read file from filesystem
    const filePath = path.join(process.cwd(), file.filePath);

    try {
      const fileBuffer = await fs.readFile(filePath);

      // Return file with appropriate headers
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": file.fileType || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${file.fileName}"`,
          "Content-Length": fileBuffer.length.toString(),
        },
      });
    } catch (fileError) {
      console.error("File read error:", fileError);
      return NextResponse.json(
        { error: "File not accessible" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Failed to process download" },
      { status: 500 }
    );
  }
}
