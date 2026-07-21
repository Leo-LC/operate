import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Operate",
  description: "Privacy policy for the Operate internal operations platform.",
};

const LAST_UPDATED = "July 21, 2026";
const CONTACT_EMAIL = "contact@capybaracoffeethailand.com";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 px-6 py-4 sm:px-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground">
              Op
            </div>
            <span className="font-serif text-[16px]">Operate</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 sm:px-10 sm:py-16">
        <article className="prose prose-neutral max-w-none dark:prose-invert prose-headings:font-serif prose-headings:font-normal prose-a:text-primary">
          <h1>Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

          <p>
            This Privacy Policy describes how Capybara Coffee Thailand (&quot;we&quot;, &quot;us&quot;, or
            &quot;our&quot;) collects, uses, and protects information when you use Operate, our
            internal operations platform (the &quot;Service&quot;).
          </p>

          <h2>Information We Collect</h2>
          <p>When you sign in to the Service, we may collect:</p>
          <ul>
            <li>
              <strong>Account information</strong> — such as your name, email address, and
              profile picture from your Google account.
            </li>
            <li>
              <strong>Usage data</strong> — such as pages visited, actions taken within the
              platform, and timestamps of activity.
            </li>
            <li>
              <strong>Business data</strong> — operational information entered or synced into
              the platform by authorized users (for example, reviews, documents, schedules, and
              location data).
            </li>
          </ul>

          <h2>How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Authenticate users and control access to the Service.</li>
            <li>Provide, operate, and maintain the platform for authorized team members.</li>
            <li>Improve functionality, security, and reliability.</li>
            <li>Respond to support requests and administrative needs.</li>
          </ul>

          <h2>Third-Party Services</h2>
          <p>
            The Service integrates with third-party providers to deliver its features, including:
          </p>
          <ul>
            <li>
              <strong>Google</strong> — for sign-in (OAuth) and, where enabled, Google Business
              Profile data.
            </li>
            <li>
              <strong>Supabase</strong> — for secure data storage and backend services.
            </li>
            <li>
              <strong>Vercel</strong> — for hosting and delivery of the application.
            </li>
          </ul>
          <p>
            These providers process data according to their own privacy policies. We only share
            information necessary to operate the Service.
          </p>

          <h2>Data Retention</h2>
          <p>
            We retain information for as long as needed to provide the Service, comply with
            legal obligations, resolve disputes, and enforce our agreements. Operational data
            is kept while accounts remain active or as required for business purposes.
          </p>

          <h2>Security</h2>
          <p>
            We take reasonable measures to protect information against unauthorized access,
            alteration, disclosure, or destruction. Access to the Service is restricted to
            authorized users approved by an administrator.
          </p>

          <h2>Your Rights</h2>
          <p>
            Depending on your location, you may have rights to access, correct, or delete
            personal information we hold about you. To make a request, contact us using the
            details below.
          </p>

          <h2>Children&apos;s Privacy</h2>
          <p>
            The Service is intended for authorized business users and is not directed at
            children under 13. We do not knowingly collect personal information from children.
          </p>

          <h2>Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date at
            the top of this page will reflect any changes. Continued use of the Service after
            changes are posted constitutes acceptance of the updated policy.
          </p>

          <h2>Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or our data practices, please
            contact us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </article>
      </main>

      <footer className="border-t border-border/60 px-6 py-4 text-[11px] text-muted-foreground/50 sm:px-10">
        <div className="mx-auto max-w-3xl text-center sm:text-left">
          <span>Operate · Capybara Coffee Thailand</span>
        </div>
      </footer>
    </div>
  );
}
