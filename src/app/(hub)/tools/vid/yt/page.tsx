import { VideoDownloader } from "@/components/tools/vid/video-downloader";

export const metadata = {
  title: "YouTube Downloader | EKD Digital Resource Hub",
  description:
    "Download YouTube videos in multiple qualities and formats. Extract audio as MP3 or M4A.",
};

export default function YouTubeDownloaderPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <VideoDownloader />
    </div>
  );
}
