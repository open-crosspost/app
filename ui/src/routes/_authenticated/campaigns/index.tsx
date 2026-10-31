import type { AccountPost } from "@crosspost/plugin/types";
import { TimePeriod } from "@crosspost/plugin/types";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  columnVisibilityFeature,
  createColumnHelper,
  createSortedRowModel,
  flexRender,
  rowSortingFeature,
  type SortingState,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useApiClient, useAuthClient } from "@/app";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCampaigns } from "@/hooks/use-campaigns";
import {
  CAMPAIGN_DESTINATION_PLATFORM,
  campaignDestinations,
  postsMatchingCampaign,
} from "@/lib/campaigns";
import {
  fetchSocialAccountPosts,
  fetchSocialLeaderboard,
  nearAccountIdQueryOptions,
} from "@/lib/social";
import { capitalize } from "@/lib/utils/string";

type CampaignEntry = {
  rank: number;
  signerId: string;
  totalPosts?: number;
};

export const Route = createFileRoute("/_authenticated/campaigns/")({
  validateSearch: (search: Record<string, unknown>): { timeframe?: TimePeriod } => ({
    timeframe: Object.values(TimePeriod).includes(search.timeframe as TimePeriod)
      ? (search.timeframe as TimePeriod)
      : undefined,
  }),
  component: CampaignsPage,
});

function CampaignsPage() {
  const apiClient = useApiClient();
  const authClient = useAuthClient();
  const navigate = useNavigate({ from: Route.fullPath });
  const { timeframe } = Route.useSearch();
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const { campaigns } = useCampaigns();

  const { data: nearAccountId, isLoading: isLoadingNearAccountId } = useQuery(
    nearAccountIdQueryOptions(authClient, !!session?.user),
  );
  const { data: myPosts = [] } = useQuery({
    queryKey: ["social", "account-posts", nearAccountId],
    queryFn: () => fetchSocialAccountPosts(apiClient, nearAccountId as string),
    enabled: !!nearAccountId,
  });

  const { data: leaderboard, isLoading: isLoadingLeaderboard } = useQuery({
    queryKey: ["social", "leaderboard", { timeframe }],
    queryFn: () =>
      fetchSocialLeaderboard(apiClient, {
        limit: 10,
        offset: 0,
        timeframe: timeframe ?? TimePeriod.WEEK,
      }),
    staleTime: 30000,
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <p className="text-muted-foreground">
          Pick a campaign and post from your connected accounts.
        </p>
      </div>

      <div className="space-y-4">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="rounded-md border-2 border-primary bg-card p-4 text-card-foreground"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold">{campaign.name}</h2>
                <p className="text-sm text-muted-foreground">{campaign.description}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {campaign.actions.map((action) => `Posts “${action.text}”`).join(", ")}
                </p>
              </div>
              <Button variant="secondary" className="shrink-0" disabled>
                Join soon
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {campaignDestinations(campaign).map((destination) => (
                <Badge key={destination} variant="secondary">
                  {capitalize(CAMPAIGN_DESTINATION_PLATFORM[destination])}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>

      {session?.user ? (
        <div className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Your recent campaign posts</h2>
          {isSessionPending || isLoadingNearAccountId ? (
            <p className="text-sm text-muted-foreground">Loading your posts…</p>
          ) : nearAccountId && myPosts.length > 0 ? (
            <ul className="space-y-2">
              {campaigns.map((campaign) => {
                const matches = postsMatchingCampaign(myPosts, campaign);
                if (matches.length === 0) return null;
                return matches
                  .slice(0, 5)
                  .map((post) => (
                    <MyPostRow key={post.id} campaignName={campaign.name} post={post} />
                  ));
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No campaign posts found for your account yet.
            </p>
          )}
        </div>
      ) : null}

      <div className="mt-10">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Top participants</h2>
          <div className="w-40">
            <Select
              value={timeframe ?? TimePeriod.WEEK}
              onValueChange={(v) =>
                navigate({ search: { timeframe: v as TimePeriod }, replace: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TimePeriod.DAY}>Last 24 Hours</SelectItem>
                <SelectItem value={TimePeriod.WEEK}>Last Week</SelectItem>
                <SelectItem value={TimePeriod.MONTH}>Last Month</SelectItem>
                <SelectItem value={TimePeriod.ALL}>All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <ParticipantsTable
          entries={(leaderboard?.entries ?? []).map((entry, index) => ({
            rank: index + 1,
            signerId: entry.signerId,
            totalPosts: entry.postCount,
          }))}
          isLoading={isLoadingLeaderboard}
        />
      </div>
    </div>
  );
}

function MyPostRow({ campaignName, post }: { campaignName: string; post: AccountPost }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border-2 border-primary bg-card p-3">
      <div className="min-w-0">
        <p className="truncate text-sm text-foreground">{post.content}</p>
        <p className="text-xs text-muted-foreground">
          {campaignName} • {capitalize(post.platform)} •{" "}
          {new Date(post.createdAt).toLocaleDateString()}
        </p>
      </div>
      {post.url ? (
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-sm text-primary hover:text-primary/80"
        >
          view
        </a>
      ) : null}
    </li>
  );
}

function ParticipantsTable({
  entries,
  isLoading,
}: {
  entries: CampaignEntry[];
  isLoading: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "rank", desc: false }]);

  const features = useMemo(
    () =>
      tableFeatures({
        columnVisibilityFeature,
        rowSortingFeature,
        sortedRowModel: createSortedRowModel(),
      }),
    [],
  );

  const columnHelper = createColumnHelper<typeof features, CampaignEntry>();
  const columns = columnHelper.columns([
    columnHelper.accessor("rank", {
      header: "Rank",
      cell: (info) => <div className="w-[20px]">{info.getValue()}</div>,
    }),
    columnHelper.accessor("signerId", {
      header: "NEAR Account",
      cell: (info) => (
        <Link
          to="/profile/$accountId"
          params={{ accountId: info.getValue() }}
          className="block truncate text-primary transition-colors hover:text-primary/80 hover:underline"
        >
          {info.getValue()}
        </Link>
      ),
    }),
    columnHelper.accessor("totalPosts", {
      header: "Posts",
      cell: (info) => info.getValue() ?? 0,
    }),
  ]);

  const rankedEntries = useMemo(
    () => entries.map((entry, index) => ({ ...entry, rank: index + 1 })),
    [entries],
  );

  const table = useTable({
    features,
    data: rankedEntries,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading participants...</p>;
  }
  if (rankedEntries.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity found for this timeframe.</p>;
  }

  return (
    <div className="base-component relative overflow-x-auto rounded-lg border-2 border-primary bg-background">
      <Table>
        <TableHeader className="bg-background [&_tr]:border-b-2 [&_tr]:border-primary [&_tr]:hover:bg-transparent">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  <button
                    type="button"
                    className="flex items-center gap-1"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className="divide-y divide-border bg-background">
          {" "}
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className="hover:bg-muted">
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="px-6 py-4 text-sm whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
