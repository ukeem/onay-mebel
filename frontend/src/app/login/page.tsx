"use client";

import { AuthControls } from "@/components/auth-controls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import api from "@/lib/api";
import { getApiError } from "@/lib/api-error";
import { formatPhone, rawPhone } from "@/lib/phone-mask";
import { useAuthStore } from "@/stores/auth.store";
import {
  ArrowLeft,
  Check,
  Clock,
  CreditCard,
  MessageCircle,
  ShieldX,
  Star,
  TrendingDown,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [phone, setPhone] = useState("+7 ");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [stub, setStub] = useState<"INACTIVE" | "BLOCKED" | null>(null);
  const t = useTranslations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStub(null);

    const raw = rawPhone(phone);
    if (raw.length !== 12) {
      toast.error(t("auth.errors.invalidPhone"));
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { phone: raw, password });
      setUser(data.user);
      toast.success(t("auth.success.login"));
      router.push("/dashboard");
    } catch (err: unknown) {
      const msgStr = getApiError(err, t("auth.fail.login"));
      if (msgStr === "INACTIVE") {
        setStub("INACTIVE");
      } else if (msgStr === "BLOCKED") {
        setStub("BLOCKED");
      } else {
        toast.error(msgStr);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <AuthControls />
      {stub === "INACTIVE" ? (
        <div className="w-full max-w-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <Clock className="h-10 w-10 text-amber-500 mx-auto" />
            <h2 className="text-xl font-semibold">{t("status.inactive")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("status.inactiveDescription")}
            </p>
          </div>

          {/* Tariff cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Monthly */}
            <Card className="relative border-primary shadow-lg ring-1 ring-primary/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold">
                  <Star className="h-3 w-3 fill-current" />
                  {t("status.plans.popular")}
                </span>
              </div>
              <CardContent className="pt-7 pb-5 text-center space-y-4">
                <h3 className="font-semibold">
                  {t("status.plans.monthly.name")}
                </h3>
                <div>
                  <span className="text-3xl font-bold">25 000 ₸</span>
                  <span className="text-sm text-muted-foreground">
                    /{t("status.plans.monthly.period")}
                  </span>
                </div>
                <ul className="space-y-2 text-sm text-left">
                  {(t.raw("status.plans.monthly.features") as string[]).map(
                    (f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 shrink-0">
                          <Check className="h-3 w-3 text-primary" />
                        </span>
                        {f}
                      </li>
                    ),
                  )}
                </ul>
              </CardContent>
            </Card>

            {/* Yearly */}
            <Card className="relative border-emerald-500/60 shadow-lg ring-1 ring-emerald-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-3 py-1 text-xs font-semibold whitespace-nowrap">
                  <TrendingDown className="h-3 w-3" />
                  {t("status.plans.saving")}
                </span>
              </div>
              <CardContent className="pt-7 pb-5 text-center space-y-4">
                <h3 className="font-semibold">
                  {t("status.plans.yearly.name")}
                </h3>
                <div>
                  <span className="text-3xl font-bold">240 000 ₸</span>
                  <span className="text-sm text-muted-foreground">
                    /{t("status.plans.yearly.period")}
                  </span>
                </div>
                <ul className="space-y-2 text-sm text-left">
                  {(t.raw("status.plans.yearly.features") as string[]).map(
                    (f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 shrink-0">
                          <Check className="h-3 w-3 text-emerald-600" />
                        </span>
                        {f}
                      </li>
                    ),
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* How to pay */}
          <Card>
            <CardContent className="pt-5 pb-5 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                {t("status.howToPay.title")}
              </h3>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                {(t.raw("status.howToPay.steps") as string[]).map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button asChild className="flex-1 gap-2">
                  <a
                    href="https://pay.kaspi.kz/pay/1pffbpeg"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <CreditCard className="h-4 w-4" />
                    {t("status.howToPay.ctaPay")}
                  </a>
                </Button>
                <Button asChild variant="outline" className="flex-1 gap-2">
                  <a
                    href="https://wa.me/77071512424"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {t("status.howToPay.ctaReceipt")}
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Back */}
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setStub(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            {t("status.backToLogin")}
          </Button>
        </div>
      ) : stub === "BLOCKED" ? (
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Onay Mebel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2">
                <ShieldX className="h-10 w-10 text-destructive" />
                <h3 className="text-base font-semibold text-center">
                  {t("status.blocked")}
                </h3>
                <p className="text-sm text-center text-muted-foreground">
                  {t("status.blockedDescription")}
                </p>
              </div>
              <div className="grid gap-2">
                <Button variant="outline" className="w-full" asChild>
                  <a
                    href="https://wa.me/77071512424"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-4 w-4 mr-1.5 text-green-600" />
                    +7 (707) 151 24 24
                  </a>
                </Button>
              </div>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStub(null)}
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                {t("status.backToLogin")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Onay Mebel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{t("auth.phone")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+7 799 999 99 99"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <PasswordInput
                  id="password"
                  placeholder={t("auth.minPassword")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("auth.loggingIn") : t("auth.login")}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground space-y-1">
              <p>
                {t("auth.noAccount")}{" "}
                <Link
                  href="/register"
                  className="underline hover:text-foreground"
                >
                  {t("auth.register")}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
