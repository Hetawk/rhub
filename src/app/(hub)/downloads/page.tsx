import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { DownloadCard } from "@/components/downloads/download-card";
import { Download } from "lucide-react";

export const metadata: Metadata = {
  title: "Downloads - EKD Digital Resource Hub",
  description:
    "Access important documents and files from EKD Digital and A.N.D Group of Companies",
};

async function getDownloadableFiles() {
  try {
    const files = await prisma.downloadableFile.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return files;
  } catch (error) {
    console.error("Failed to fetch downloadable files:", error);
    return [];
  }
}

export default async function DownloadsPage() {
  const files = await getDownloadableFiles();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Download className="w-8 h-8 text-gold" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Downloads
          </h1>
        </div>

        <p className="text-lg text-gray-600 dark:text-gray-300 mb-12">
          Access important documents, forms, and resources from EKD Digital and
          A.N.D Group of Companies.
        </p>

        {/* Files Grid */}
        {files.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {files.map((file) => (
              <DownloadCard key={file.id} file={file} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="inline-block p-6 bg-gradient-to-br from-ekd-gold/10 to-ekd-light-gold/10 rounded-2xl mb-6">
              <Download className="w-16 h-16 text-ekd-gold mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Coming Soon
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
              We're preparing important documents and resources for you. Check
              back soon for corporate documents, forms, and educational
              materials.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
