import { barY, defineChart } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Fuel, Wallet } from "lucide-react";
import { useState } from "react";
import { FundDialog } from "@/components/admin/fund-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppSponsorStatus, useRelayerInfo } from "@/hooks/use-sponsor";
import { formatMicrosUsd, formatYoctoNear, parseNumber } from "@/lib/sponsor";

export const Route = createFileRoute("/_admin/_dashboard/admin/sponsor")({
  component: SponsorPage,
});

type Health = "ok" | "warn" | "empty";

const HEALTH_STYLE: Record<Health, string> = {
  ok: "border-border",
  warn: "border-amber-500/60 bg-amber-500/5",
  empty: "border-destructive/60 bg-destructive/5",
};

function SponsorPage() {
  const { data: status, isLoading } = useAppSponsorStatus();
  const { data: relayer } = useRelayerInfo();
  const [fundWalletOpen, setFundWalletOpen] = useState(false);
  const [fundRelayerOpen, setFundRelayerOpen] = useState(false);

  const nearBalance = parseNumber(status?.nearBalanceNear);
  const warnNear = parseNumber(status?.thresholds.warnNear);
  const walletHealth: Health =
    nearBalance === null
      ? "warn"
      : nearBalance <= 0
        ? "empty"
        : warnNear !== null && nearBalance < warnNear
          ? "warn"
          : "ok";

  const keyRemaining = parseNumber(status?.outlayerKeyRemainingUsd);
  const warnUsd = parseNumber(status?.thresholds.warnUsd);
  const keyHealth: Health =
    keyRemaining === null
      ? "warn"
      : keyRemaining <= 0
        ? "empty"
        : warnUsd !== null && keyRemaining < warnUsd
          ? "warn"
          : "ok";

  const walletCardHealth: Health =
    [walletHealth, keyHealth].find((health) => health !== "ok") ?? "ok";

  const relayerBalance = relayer ? parseNumber(formatYoctoNear(relayer.balance)) : null;
  const relayerHealth: Health | null =
    relayer === undefined
      ? null
      : relayer === null
        ? "warn"
        : !relayer.enabled
          ? "warn"
          : relayerBalance === null
            ? "warn"
            : relayerBalance <= 0
              ? "empty"
              : relayerBalance < 5
                ? "warn"
                : "ok";

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading sponsor status…</p>;
  }

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Sponsor wallet & relayer</h1>
        <p className="text-sm text-muted-foreground">
          The app pays OutLayer compute for sponsored posting and relays gasless NEAR Social posts.
          Fund both from your own wallet — nothing here holds keys.
        </p>
      </header>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className={walletCardHealth !== "ok" ? HEALTH_STYLE[walletCardHealth] : undefined}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" aria-hidden />
              Sponsor wallet (OutLayer)
            </CardTitle>
            {walletCardHealth !== "ok" ? (
              <Badge variant={walletCardHealth === "empty" ? "destructive" : "secondary"}>
                <AlertTriangle className="mr-1 h-3 w-3" aria-hidden />
                {walletHealth === "empty" ? "empty" : "low"}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {status?.configured ? (
              <>
                <dl className="space-y-1">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Wallet owner</dt>
                    <dd className="truncate font-mono text-xs">{status.walletOwner}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Key nonce</dt>
                    <dd className="font-mono text-xs">{status.keyNonce}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">NEAR balance</dt>
                    <dd className="font-mono text-xs">
                      {status.nearBalanceNear ?? "unreadable"} NEAR
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Key remaining (OutLayer)</dt>
                    <dd className="font-mono text-xs">
                      {status.outlayerKeyRemainingUsd
                        ? `$${status.outlayerKeyRemainingUsd}`
                        : "unreadable"}
                    </dd>
                  </div>
                </dl>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <SpendCell label="24h" window={status.windows.day} />
                  <SpendCell label="7d" window={status.windows.week} />
                  <SpendCell label="30d" window={status.windows.month} />
                </div>
                <Button size="sm" onClick={() => setFundWalletOpen(true)}>
                  Fund sponsor wallet
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">
                OUTLAYER_APP_PAYMENT_KEY is not configured — app-paid dispatch is unavailable.
              </p>
            )}
          </CardContent>
        </Card>

        <Card
          className={
            relayerHealth && relayerHealth !== "ok" ? HEALTH_STYLE[relayerHealth] : undefined
          }
        >
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Fuel className="h-4 w-4" aria-hidden />
              NEAR Social relayer
            </CardTitle>
            {relayerHealth && relayerHealth !== "ok" ? (
              <Badge variant={relayerHealth === "empty" ? "destructive" : "secondary"}>
                <AlertTriangle className="mr-1 h-3 w-3" aria-hidden />
                {relayerHealth === "empty" ? "empty" : relayerHealth === "warn" ? "low" : "off"}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {relayer ? (
              <>
                <dl className="space-y-1">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Account</dt>
                    <dd className="truncate font-mono text-xs">{relayer.accountId ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Balance</dt>
                    <dd className="font-mono text-xs">{formatYoctoNear(relayer.balance)} NEAR</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Available</dt>
                    <dd className="font-mono text-xs">{formatYoctoNear(relayer.available)} NEAR</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Last used</dt>
                    <dd className="text-xs">
                      {relayer.lastUsedAt ? new Date(relayer.lastUsedAt).toLocaleString() : "never"}
                    </dd>
                  </div>
                </dl>
                <Button size="sm" onClick={() => setFundRelayerOpen(true)}>
                  Fund relayer
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">Relayer info unavailable.</p>
            )}
          </CardContent>
        </Card>
      </section>
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Sponsored posts — last 30 days
        </h2>
        {status && status.daily.length > 0 ? (
          <div className="rounded-lg border bg-background p-4">
            <SpendChart daily={status.daily} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No sponsored calls recorded yet.</p>
        )}
      </section>
      <FundDialog
        open={fundWalletOpen}
        onOpenChange={setFundWalletOpen}
        title="Fund the sponsor wallet"
        description="NEAR sent to the OutLayer custody wallet backs the app's shared payment key — deposits convert to sponsored-call credit."
        target={status?.walletOwner ?? null}
        explorerPath="address"
      />
      <FundDialog
        open={fundRelayerOpen}
        onOpenChange={setFundRelayerOpen}
        title="Fund the relayer"
        description="NEAR sent to the relayer account pays the gas for gasless NEAR Social posts."
        target={relayer?.accountId ?? null}
      />{" "}
    </div>
  );
}

function SpendCell({
  label,
  window: spend,
}: {
  label: string;
  window: { posts: number; usdMicros: string };
}) {
  return (
    <div className="rounded-md border border-border p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{spend.posts} posts</p>
      <p className="text-xs text-muted-foreground">{formatMicrosUsd(spend.usdMicros)}</p>
    </div>
  );
}

type DailyPoint = { date: string; posts: number; usdMicros: string };

function SpendChart({ daily }: { daily: DailyPoint[] }) {
  const definition = defineChart({
    marks: [
      barY(daily, {
        x: "date",
        y: "posts",
        fill: "var(--primary)",
        key: "date",
      }),
    ],
    scales: {
      x: { scale: scaleBand, grid: false },
      y: {
        scale: scaleLinear,
        axis: { label: "Sponsored posts", ticks: { count: 4 } },
        grid: true,
      },
    },
    tooltip,
  });

  return (
    <Chart
      definition={definition}
      ariaLabel="Sponsored posts per day over the last 30 days"
      height={240}
    />
  );
}
