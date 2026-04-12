import { cn } from "./utils";

/**
 * Default loading rectangle for sidebar / menus.
 * Uses the shared `eggs-skeleton-block` sweep from `src/styles/tailwind.css` (same family as
 * archive + episode shell placeholders) so it does not rely on low-contrast `animate-pulse`.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("eggs-skeleton-block rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
