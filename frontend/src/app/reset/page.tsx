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

type Step = "phone" | "code" | "password";

export default function ResetPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("+7 ");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const t = useTranslations();

  const raw = rawPhone(phone);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (raw.length !== 12) {
      toast.error(t("auth.errors.invalidPhone"));
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset/request", { phone: raw });
      toast.success(t("auth.success.codeSent"));
      setStep("code");
    } catch (err: unknown) {
      toast.error(getApiError(err, t("auth.fail.generic")));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error(t("auth.errors.invalidCode"));
      return;
    }
    setStep("password");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error(t("auth.errors.minPassword"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("auth.errors.passwordsMismatch"));
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset/confirm", {
        phone: raw,
        code,
        newPassword,
      });
      toast.success(t("auth.success.passwordChanged"));
      router.push("/login");
    } catch (err: unknown) {
      toast.error(getApiError(err, t("auth.fail.reset")));
    } finally {
      setLoading(false);
    }
  };

  const stepTitle = {
    phone: t("auth.resetTitle.phone"),
    code: t("auth.resetTitle.code"),
    password: t("auth.resetTitle.password"),
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <AuthControls />
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Onay Mebel
          </CardTitle>
          <CardDescription>{stepTitle[step]}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === "phone" && (
            <form onSubmit={handleRequestCode} className="space-y-4">
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("auth.sending") : t("auth.sendCode")}
              </Button>
            </form>
          )}
          {step === "code" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">{t("auth.smsLabel")}</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {t("auth.next")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep("phone")}
              >
                {t("auth.back")}
              </Button>
            </form>
          )}
          {step === "password" && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t("auth.newPassword")}</Label>
                <PasswordInput
                  id="newPassword"
                  placeholder={t("auth.minPassword")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
                {loading ? t("auth.saving") : t("auth.changePassword")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep("code")}
              >
                {t("auth.back")}
              </Button>
            </form>
          )}
          <div className="mt-4 text-center text-sm text-muted-foreground space-y-1">
            <p>
              <Link href="/login" className="underline hover:text-foreground">
                {t("auth.login")}
              </Link>
            </p>
            <p>
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
    </div>
  );
}
