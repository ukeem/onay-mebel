"use client";

import { Instagram, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

const NAV_LINKS = [
  { key: "features", href: "#features" },
  { key: "howItWorks", href: "#how-it-works" },
  { key: "pricing", href: "#pricing" },
  { key: "faq", href: "#faq" },
];

const SOCIAL_LINKS = [
  { key: "whatsapp", Icon: MessageCircle, href: "https://wa.me/77071512424" },
  {
    key: "instagram",
    Icon: Instagram,
    href: "https://www.instagram.com/onaymebel.kz",
  },
];

export function LandingFooter() {
  const t = useTranslations("landing.footer");
  const nav = useTranslations("landing.nav");

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="border-t border-border/50 bg-muted/30 pb-20 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo & description */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative flex items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold h-9 w-9 text-sm shadow-sm shadow-primary/20">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-[18px] w-[18px]"
                >
                  <path d="M4 12V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
                  <path d="M2 14a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2z" />
                  <path d="M4 17v2" />
                  <path d="M20 17v2" />
                </svg>
              </div>
              <div className="flex flex-col leading-none justify-center items-center gap-0.5">
                <span className="font-extrabold uppercase leading-none! tracking-tighter text-base">
                  Onay
                </span>
                <span className="flex w-full justify-between px-[2px] font-medium uppercase text-muted-foreground text-[8px]">
                  {"MEBEL".split("").map((ch, i) => (
                    <span key={i}>{ch}</span>
                  ))}
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">
              {t("sections")}
            </h4>
            <ul className="space-y-2">
              {NAV_LINKS.map(({ key, href }) => (
                <li key={key}>
                  <a
                    href={href}
                    onClick={(e) => handleNavClick(e, href)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {nav(key)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacts */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">
              {t("contacts")}
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="tel:+77071512424"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("phone")}
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/77071512424"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("whatsapp")}
                </a>
              </li>
            </ul>
          </div>

          {/* Socials */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">
              {t("socials")}
            </h4>
            <div className="flex gap-3">
              {SOCIAL_LINKS.map(({ key, Icon, href }) => (
                <a
                  key={key}
                  href={href}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-all hover:scale-105"
                  aria-label={t(key)}
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground">{t("copyright")}</p>
        </div>
      </div>
    </footer>
  );
}
