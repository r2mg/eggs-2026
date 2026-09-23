/**
 * Build-time quality control for RSS ↔ YouTube matches.
 *
 * Catches the failures that look “fine” until a human opens the page:
 * - two episodes sharing one video
 * - a locked id whose YouTube title is a different Eggs number or guest
 *
 * Repairs in place, then rematches the losers without reusing claimed videos.
 */
import type { Episode } from '../types/episode';
import type { YoutubeEpisodeOverlay } from '../types/youtubeOverlay';
import type { YouTubeChannelData } from './youtube';
import {
  computeEpisodeYoutubeOverlay,
  youtubeCandidatesFromChannelData,
} from './computeEpisodeYoutubeOverlay';
import {
  episodeNumberFromYoutubeTitle,
  youtubeAssignmentConflicts,
  type YoutubeCandidate,
} from './youtubeMatching';

export type YoutubeMatchQcResult = {
  repaired: number;
  droppedSlugs: string[];
  notes: string[];
};

function candidateForVideo(
  data: YouTubeChannelData,
  videoId: string,
): YoutubeCandidate | undefined {
  const yv = data.videosById.get(videoId);
  if (!yv) return { videoId, title: '' };
  return {
    videoId,
    title: yv.title,
    description: yv.description,
    publishedAt: yv.publishedAt,
  };
}

function slugsByVideoId(
  overlays: Record<string, YoutubeEpisodeOverlay | null>,
): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [slug, overlay] of Object.entries(overlays)) {
    const id = overlay?.youtubeVideoId?.trim();
    if (!id) continue;
    const list = out.get(id) ?? [];
    list.push(slug);
    out.set(id, list);
  }
  return out;
}

function pickDuplicateWinner(
  slugs: string[],
  videoId: string,
  episodesBySlug: Map<string, Episode>,
  data: YouTubeChannelData,
): string {
  const ytNum = episodeNumberFromYoutubeTitle(data.videosById.get(videoId)?.title);
  if (ytNum !== undefined) {
    const numbered = slugs.find((slug) => episodesBySlug.get(slug)?.episodeNumber === ytNum);
    if (numbered) return numbered;
  }

  let best = slugs[0]!;
  let bestDate = Number.POSITIVE_INFINITY;
  for (const slug of slugs) {
    const ep = episodesBySlug.get(slug);
    const rss = ep?.publishedAt ? Date.parse(ep.publishedAt) : Number.NaN;
    const ytPublished = data.videosById.get(videoId)?.publishedAt;
    const yt = ytPublished ? Date.parse(ytPublished) : Number.NaN;
    const delta =
      Number.isFinite(rss) && Number.isFinite(yt) ? Math.abs(rss - yt) : Number.POSITIVE_INFINITY;
    if (delta < bestDate) {
      best = slug;
      bestDate = delta;
    }
  }
  return best;
}

/**
 * Drop impossible assignments and make video ids unique. Rematch cleared episodes
 * against whatever videos are still free.
 */
export function auditAndRepairYoutubeOverlays(
  episodes: Episode[],
  overlays: Record<string, YoutubeEpisodeOverlay | null>,
  data: YouTubeChannelData,
): YoutubeMatchQcResult {
  const notes: string[] = [];
  const droppedSlugs: string[] = [];
  const episodesBySlug = new Map(episodes.map((ep) => [ep.slug, ep]));
  let repaired = 0;

  for (const ep of episodes) {
    const overlay = overlays[ep.slug];
    const videoId = overlay?.youtubeVideoId?.trim();
    if (!videoId) continue;
    const conflict = youtubeAssignmentConflicts(ep, candidateForVideo(data, videoId));
    if (!conflict) continue;
    notes.push(`${ep.slug}: dropped ${videoId} (${conflict})`);
    overlays[ep.slug] = null;
    droppedSlugs.push(ep.slug);
    repaired += 1;
  }

  for (const [videoId, slugs] of slugsByVideoId(overlays)) {
    if (slugs.length < 2) continue;
    const winner = pickDuplicateWinner(slugs, videoId, episodesBySlug, data);
    notes.push(
      `${videoId} was assigned to ${slugs.join(', ')}; kept ${winner}`,
    );
    for (const slug of slugs) {
      if (slug === winner) continue;
      overlays[slug] = null;
      droppedSlugs.push(slug);
      repaired += 1;
    }
  }

  const catalog = youtubeCandidatesFromChannelData(data);
  const claimed = new Set<string>();
  for (const overlay of Object.values(overlays)) {
    const id = overlay?.youtubeVideoId?.trim();
    if (id) claimed.add(id);
  }

  for (const ep of episodes) {
    if (overlays[ep.slug]?.youtubeVideoId) continue;
    const next = computeEpisodeYoutubeOverlay(ep, data, catalog, undefined, claimed);
    if (!next?.youtubeVideoId) continue;
    overlays[ep.slug] = next;
    claimed.add(next.youtubeVideoId);
    notes.push(`${ep.slug}: rematched → ${next.youtubeVideoId}`);
    repaired += 1;
  }

  return { repaired, droppedSlugs: [...new Set(droppedSlugs)], notes };
}
