"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";

const isPreviewMode = process.env.NEXT_PUBLIC_PREVIEW_MODE === "true";

interface LoginCardProps {
  minimal?: boolean;
}

function PreviewLoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const result = await signIn("preview", { password, callbackUrl: "/", redirect: false });
    if (result?.error) {
      setError(true);
      setLoading(false);
    } else if (result?.url) {
      window.location.href = result.url;
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        type="password"
        placeholder="Preview password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{
          height: 36, borderRadius: "var(--r-sm)", border: `1px solid ${error ? "var(--bad)" : "var(--line-strong)"}`,
          background: "var(--bg)", color: "var(--fg)", padding: "0 12px", fontSize: 13,
          outline: "none", width: "100%", boxSizing: "border-box",
        }}
        autoFocus
      />
      {error && <p style={{ fontSize: 12, color: "var(--bad)", margin: 0 }}>Incorrect password.</p>}
      <Button type="submit" size="lg" className="w-full" disabled={loading || !password}>
        {loading ? "Signing in…" : "Enter preview"}
        <ArrowRightIcon className="size-4" />
      </Button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  height: 36, borderRadius: "var(--r-sm)", border: "1px solid var(--line-strong)",
  background: "var(--bg)", color: "var(--fg)", padding: "0 12px", fontSize: 13,
  outline: "none", width: "100%", boxSizing: "border-box",
};

function CredentialsLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn("credentials", { email, password, callbackUrl: "/", redirect: false });
    if (result?.error) {
      setError("Incorrect email or password.");
      setLoading(false);
    } else if (result?.url) {
      window.location.href = result.url;
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
        autoComplete="email"
        required
        style={inputStyle}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
        style={inputStyle}
      />
      {error && <p style={{ fontSize: 12, color: "var(--bad)", margin: 0 }}>{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={loading || !email || !password}>
        {loading ? "Signing in…" : "Sign in"}
        <ArrowRightIcon className="size-4" />
      </Button>
    </form>
  );
}

export function LoginCard({ minimal }: LoginCardProps) {
  const googleButton = (
    <Button
      size="lg"
      variant="outline"
      className="group w-full gap-2 font-medium"
      onClick={() => signIn("google", { callbackUrl: "/" })}
    >
      Sign in with Google
      <ArrowRightIcon className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
    </Button>
  );

  if (isPreviewMode) {
    if (minimal) return <PreviewLoginForm />;
    return (
      <Card className="h-full w-full border-border/70 bg-card shadow-lg backdrop-blur">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="font-serif text-xl font-normal">Preview access</CardTitle>
          <CardDescription>Enter the preview password to browse the UI.</CardDescription>
        </CardHeader>
        <CardContent>
          <PreviewLoginForm />
        </CardContent>
      </Card>
    );
  }

  if (minimal) {
    return (
      <div className="flex flex-col gap-3">
        <CredentialsLoginForm />
        <div className="flex items-center gap-2">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 border-t border-border" />
        </div>
        {googleButton}
      </div>
    );
  }

  return (
    <Card className="h-full w-full border-border/70 bg-card shadow-lg backdrop-blur">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="font-serif text-xl font-normal">Sign in to continue</CardTitle>
        <CardDescription>Use your credentials or Google account.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <CredentialsLoginForm />
        <div className="flex items-center gap-2">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 border-t border-border" />
        </div>
        {googleButton}
      </CardContent>
    </Card>
  );
}
