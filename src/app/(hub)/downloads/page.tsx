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
          <div className="text-center py-12">
            <Download className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No downloads available at the moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
