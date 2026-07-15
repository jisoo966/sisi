import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · Sísí",
  description: "How Sísí handles your data.",
};

/**
 * /privacy — Privacy Policy.
 * Warm, plain-English. Not corporate legalese.
 * Last updated when we launch.
 */
export default function PrivacyPage() {
  return (
    <main className="min-h-svh bg-[#f7f2e3] px-[24px] py-[52px] pb-[80px]">
      <div className="max-w-[640px] mx-auto">
        <Link
          href="/"
          className="font-sentient text-[13px] text-journey-navy/60 hover:text-journey-navy transition-colors"
        >
          ← back
        </Link>

        <h1 className="font-fraunces text-[36px] text-journey-navy mt-[24px] mb-[8px]">
          Privacy Policy
        </h1>
        <p className="font-sentient italic text-[14px] text-journey-navy/60 mb-[36px]">
          Last updated: July 14, 2026
        </p>

        <div className="font-sentient text-[16px] text-journey-navy leading-[1.7] space-y-[24px]">
          <p>
            Sísí is a place for your inner life. We treat your data the way
            we&apos;d want ours treated — quietly, carefully, and only for the
            purposes you signed up for.
          </p>

          <Section title="What we collect">
            <ul className="space-y-[8px] pl-[20px] list-disc">
              <li>
                <b>Email address</b> — to sign you in with a magic link.
              </li>
              <li>
                <b>Your wishes (stars)</b> — what you want to manifest, when.
              </li>
              <li>
                <b>Postcards</b> — moments you choose to capture (image + your
                reflection text).
              </li>
              <li>
                <b>Chat messages with Sísí</b> — so the conversation feels
                continuous.
              </li>
              <li>
                <b>A display name</b> — whatever you told Sísí to call you.
              </li>
            </ul>
            <p>
              We don&apos;t collect location, contacts, camera roll, or anything
              else outside the app.
            </p>
          </Section>

          <Section title="Where it lives">
            <p>
              Your data is stored on{" "}
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Supabase
              </a>{" "}
              (Amazon AWS servers, US East region). Every table has{" "}
              <em>row-level security</em> — meaning your rows are technically
              only accessible with your login. Not even our other users, and
              not even accidentally by us in code.
            </p>
          </Section>

          <Section title="Who we share it with">
            <p>Only two third parties ever see any of your data:</p>
            <ul className="space-y-[8px] pl-[20px] list-disc">
              <li>
                <b>Anthropic (Claude)</b> — your chat messages go through
                Claude to generate Sísí&apos;s replies. Anthropic&apos;s policy
                is not to train on API-sent data.
              </li>
              <li>
                <b>Supabase</b> — for auth, database, and file storage.
              </li>
            </ul>
            <p>
              We don&apos;t sell your data. We don&apos;t share it with
              advertisers. We don&apos;t run ads.
            </p>
          </Section>

          <Section title="What we use it for">
            <ul className="space-y-[8px] pl-[20px] list-disc">
              <li>Making Sísí feel personal to you</li>
              <li>Remembering your wishes and postcards across devices</li>
              <li>
                Giving Sísí context so she doesn&apos;t ask you the same thing
                every day
              </li>
            </ul>
            <p>
              That&apos;s it. No analytics packaging for third parties. No
              marketing profiles.
            </p>
          </Section>

          <Section title="Your rights">
            <ul className="space-y-[8px] pl-[20px] list-disc">
              <li>
                <b>Delete anything, any time</b> — release a star, delete a
                postcard, or write us to delete your whole account.
              </li>
              <li>
                <b>Export your data</b> — email us and we&apos;ll send you
                everything.
              </li>
              <li>
                <b>Ask questions</b> — email{" "}
                <a href="mailto:hello@hellosisi.co" className="underline">
                  hello@hellosisi.co
                </a>
              </li>
            </ul>
          </Section>

          <Section title="Age">
            <p>
              Sísí is meant for people 13 and older. If you&apos;re younger, we
              can&apos;t serve you here yet — try again in a few years.
            </p>
          </Section>

          <Section title="When this changes">
            <p>
              If we change how any of this works, we&apos;ll update this page
              and — for meaningful changes — email you.
            </p>
          </Section>

          <p className="italic text-journey-navy/70 pt-[24px] border-t border-journey-navy/10">
            Questions, worries, or corrections? We answer every email.{" "}
            <a href="mailto:hello@hellosisi.co" className="underline">
              hello@hellosisi.co
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-[12px]">
      <h2 className="font-fraunces text-[22px] text-journey-navy mt-[16px]">
        {title}
      </h2>
      {children}
    </section>
  );
}
