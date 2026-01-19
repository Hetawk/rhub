import { Metadata } from 'next';
import { UrlShortenerShell } from '@/components/tools/shortener/url-shortener-shell';
import { Link2, Zap, Shield, BarChart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'URL Shortener | EKD Digital Resource Hub',
  description:
    'Shorten long URLs with custom slugs, track clicks, and manage your links. Free URL shortener by EKD Digital.',
};

export default function UrlShortenerPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-ekd-gold/10 mb-4">
          <Link2 className="h-8 w-8 text-ekd-gold" />
        </div>
        <h1 className="text-4xl font-bold mb-4 text-ekd-charcoal dark:text-ekd-light-gray">
          URL Shortener
        </h1>
        <p className="text-lg text-ekd-charcoal/70 dark:text-ekd-light-gray/70 max-w-2xl mx-auto">
          Transform long, unwieldy URLs into short, memorable links. Perfect for sharing on
          social media, email campaigns, or anywhere you need a clean, professional link.
        </p>
      </div>

      {/* Main Tool */}
      <UrlShortenerShell />

      {/* Features */}
      <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="text-center p-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-ekd-gold/10 mb-4">
            <Link2 className="h-6 w-6 text-ekd-gold" />
          </div>
          <h3 className="font-semibold mb-2 text-ekd-charcoal dark:text-ekd-light-gray">
            Custom Slugs
          </h3>
          <p className="text-sm text-ekd-charcoal/70 dark:text-ekd-light-gray/70">
            Create memorable, branded short links with custom slugs of your choice
          </p>
        </div>

        <div className="text-center p-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-ekd-maroon/10 mb-4">
            <BarChart className="h-6 w-6 text-ekd-maroon" />
          </div>
          <h3 className="font-semibold mb-2 text-ekd-charcoal dark:text-ekd-light-gray">
            Click Tracking
          </h3>
          <p className="text-sm text-ekd-charcoal/70 dark:text-ekd-light-gray/70">
            Monitor how many times your links are clicked and when they were last accessed
          </p>
        </div>

        <div className="text-center p-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-ekd-deep-navy/10 mb-4">
            <Zap className="h-6 w-6 text-ekd-deep-navy" />
          </div>
          <h3 className="font-semibold mb-2 text-ekd-charcoal dark:text-ekd-light-gray">
            Lightning Fast
          </h3>
          <p className="text-sm text-ekd-charcoal/70 dark:text-ekd-light-gray/70">
            Instant URL shortening with ultra-fast redirects for a seamless user experience
          </p>
        </div>

        <div className="text-center p-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-4">
            <Shield className="h-6 w-6 text-green-600 dark:text-green-500" />
          </div>
          <h3 className="font-semibold mb-2 text-ekd-charcoal dark:text-ekd-light-gray">
            Secure & Reliable
          </h3>
          <p className="text-sm text-ekd-charcoal/70 dark:text-ekd-light-gray/70">
            Your links are stored securely and served with industry-standard protocols
          </p>
        </div>
      </div>

      {/* Use Cases */}
      <div className="mt-16 bg-ekd-charcoal/5 dark:bg-ekd-light-gray/5 rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6 text-center text-ekd-charcoal dark:text-ekd-light-gray">
          Perfect For
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-semibold mb-2 text-ekd-gold">Social Media</h3>
            <p className="text-sm text-ekd-charcoal/70 dark:text-ekd-light-gray/70">
              Share clean, professional links on Twitter, LinkedIn, Facebook, and other
              platforms where character count matters.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-ekd-maroon">Marketing Campaigns</h3>
            <p className="text-sm text-ekd-charcoal/70 dark:text-ekd-light-gray/70">
              Create memorable campaign URLs that are easy to remember and track performance
              with click analytics.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-ekd-deep-navy">Professional Communication</h3>
            <p className="text-sm text-ekd-charcoal/70 dark:text-ekd-light-gray/70">
              Include tidy, branded links in emails, presentations, and documentation for a
              polished appearance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
