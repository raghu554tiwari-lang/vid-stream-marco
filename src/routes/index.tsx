import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-lg text-center space-y-4">
        <h1 className="text-3xl font-bold">Video Player Proxy</h1>
        <p className="text-muted-foreground">
          Open a lecture by visiting{" "}
          <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">/play.php?…</code>{" "}
          with the same query parameters used on the source site.
        </p>
        <p className="text-sm text-muted-foreground">
          Example: <code>/play.php?video_url=…&amp;video_name=…</code>
        </p>
      </div>
    </div>
  );
}
