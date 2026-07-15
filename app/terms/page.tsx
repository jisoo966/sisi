import Link from "next/link";

export const metadata = {
  title: "Terms of Service · Sísí",
  description: "The basics of using Sísí.",
};

/**
 * /terms — Terms of Service.
 * Plain-language. Kind but clear.
 */
export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="font-sentient italic text-[14px] text-journey-navy/60 mb-[36px]">
          Last updated: July 14, 2026
        </p>

        <div className="font-sentient text-[16px] text-journey-navy leading-[1.7] space-y-[24px]">
          <p>
            By using Sísí, you agree to these terms. They&apos;re short. Read
            them once — that&apos;s enough.
          </p>

          <Section title="What Sísí is">
            <p>
              Sísí is a companion app for manifestation, reflection, and inner
              life. She&apos;s built to be warm, honest, and quiet — not to
              replace friends, therapists, doctors, or any professional care.
            </p>
            <p>
              Sísí is <b>not medical or mental health advice</b>. If
              you&apos;re in crisis, please reach out to a crisis line or a
              qualified professional. In the US: 988. In Korea: 1577-0199.
            </p>
          </Section>

          <Section title="Your account">
            <ul className="space-y-[8px] pl-[20px] list-disc">
              <li>
                One person, one account. Please don&apos;t share your login.
              </li>
              <li>You&apos;re responsible for what you write in Sísí.</li>
              <li>
                You can delete your account any time — email{" "}
                <a
                  href="mailto:hello@hellosisi.co"
                  className="underline"
                >
                  hello@hellosisi.co
                </a>
                .
              </li>
              <li>You must be 13 or older to use Sísí.</li>
            </ul>
          </Section>

          <Section title="Your content">
            <p>
              Your wishes, postcards, and reflections are <b>yours</b>. We
              never claim ownership. You give us permission only to store and
              display them back to you inside the app.
            </p>
            <p>
              If you release a star or delete a postcard, it&apos;s gone from
              our database. We may keep backup copies for up to 30 days for
              disaster recovery, then those are erased too.
            </p>
          </Section>

          <Section title="What Sísí says">
            <p>
              Sísí is powered by Claude (Anthropic). She responds
              conversationally in Sísí&apos;s voice, but the underlying model
              may sometimes be inaccurate or unhelpful. Treat her words like a
              friend&apos;s — thoughtful, but not gospel.
            </p>
            <p>
              You&apos;re responsible for your own decisions. Sísí is here to
              hold space, not to tell you what to do.
            </p>
          </Section>

          <Section title="What you can't do">
            <ul className="space-y-[8px] pl-[20px] list-disc">
              <li>Use Sísí to harm yourself, others, or Sísí herself.</li>
              <li>
                Try to break the app, scrape it, reverse-engineer, or overload
                servers.
              </li>
              <li>
                Use Sísí for anything illegal in your country or in the US.
              </li>
              <li>
                Impersonate others or pretend to be Sísí somewhere else.
              </li>
            </ul>
            <p>
              If any of this happens, we may suspend the account without
              notice.
            </p>
          </Section>

          <Section title="Payments (when we launch them)">
            <p>
              Sísí is currently free. If we introduce paid features, we&apos;ll
              give you clear notice and let you continue with the free tier if
              you don&apos;t want to pay. We won&apos;t auto-charge without
              your explicit consent.
            </p>
          </Section>

          <Section title="Changes to these terms">
            <p>
              We may update these terms occasionally. For anything material,
              we&apos;ll email you. Continued use after changes means you
              accept them.
            </p>
          </Section>

          <Section title="Endings">
            <p>
              You can stop using Sísí any time. We can also end the service to
              anyone who violates these terms, or shut down the app entirely
              if we can no longer run it — in which case we&apos;ll help you
              export your data first.
            </p>
          </Section>

          <Section title="The legal bits">
            <p>
              Sísí is provided <i>as-is</i>, without warranties of any kind.
              We&apos;re not liable for damages arising from your use of the
              app beyond what applicable consumer-protection law allows.
            </p>
            <p>
              These terms are governed by the laws of the Republic of Korea.
              If there&apos;s a dispute, we&apos;ll first try to resolve it
              through good-faith conversation.
            </p>
          </Section>

          <p className="italic text-journey-navy/70 pt-[24px] border-t border-journey-navy/10">
            Questions? Concerns? Feedback?{" "}
            <a href="mailto:hello@hellosisi.co" className="underline">
              hello@hellosisi.co
            </a>
            . We read every one.
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
