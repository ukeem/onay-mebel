"use client";

import { AuthControls } from "@/components/auth-controls";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import api from "@/lib/api";
import { getApiError } from "@/lib/api-error";
import { formatPhone, rawPhone } from "@/lib/phone-mask";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("+7 ");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const t = useTranslations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const raw = rawPhone(phone);
    if (raw.length !== 12) {
      toast.error(t("auth.errors.invalidPhone"));
      return;
    }
    if (password.length < 8) {
      toast.error(t("auth.errors.minPassword"));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t("auth.errors.passwordsMismatch"));
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/register", { phone: raw, password });
      toast.success(t("auth.success.register"));
      router.push("/login");
    } catch (err: unknown) {
      toast.error(getApiError(err, t("auth.fail.register")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <AuthControls />
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Onay Mebel
          </CardTitle>
          <CardDescription>{t("auth.registerTitle")}</CardDescription>
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
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {t("auth.confirmPassword")}
              </Label>
              <PasswordInput
                id="confirmPassword"
                placeholder={t("auth.repeatPassword")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("auth.sending") : t("auth.register")}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground space-y-1">
            <p>
              {t("auth.hasAccount")}{" "}
              <Link href="/login" className="underline hover:text-foreground">
                {t("auth.login")}
              </Link>
            </p>
            {/* <p>
              <Link href="/reset" className="underline hover:text-foreground">
                {t("auth.resetPassword")}
              </Link>
            </p> */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
