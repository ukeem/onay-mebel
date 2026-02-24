export default function GlobalLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/30 border-t-muted-foreground" />
    </div>
  );
}
