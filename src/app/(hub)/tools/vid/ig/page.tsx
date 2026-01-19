import { VideoDownloader } from "@/components/tools/vid/video-downloader";

export const metadata = {
  title: "Instagram Downloader | EKD Digital Resource Hub",
  description:
    "Download Instagram videos, Reels, and IGTV. Save posts and stories without watermarks.",
};

export default function InstagramDownloaderPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <VideoDownloader />
    </div>
  );
}
