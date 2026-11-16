import { getMember, SAMPLE_MEMBERS, samplePosts, sampleStanding } from './community';
import { startOfWeek } from './dates';
import { newId } from './id';
import { activeTrackers, amountOn, consistency, currentStreak, headlineFor, weekLevels } from './trackers';
import { ME, type AppData, type Post, type SegmentId } from './types';

/**
 * Keeps the automatic post for (tracker, day) in step with the log:
 * created when a public tracker hits its goal, updated as more is logged,
 * removed if the goal is undone. Pure: returns new data.
 */
export function syncAutoPost(data: AppData, trackerId: string, dateKey: string, nowIso: string): AppData {
  const tracker = data.trackers.find((t) => t.id === trackerId);
  if (!tracker || !data.profile) return data;
  const amount = amountOn(data.entries, trackerId, dateKey);
  const complete = amount >= tracker.target;
  const existing = data.posts.find((p) => p.auto && p.trackerId === trackerId && p.dateKey === dateKey);
  const shareable = data.profile.autoShare && tracker.visibility === 'public' && !tracker.archived;

  if (complete && shareable) {
    const fields = {
      headline: headlineFor(tracker, amount),
      streak: currentStreak(tracker, data.entries, dateKey),
      week: weekLevels(tracker, data.entries, dateKey),
      trackerName: tracker.name,
      emoji: tracker.emoji,
      segment: tracker.segment,
    };
    if (existing) {
      return { ...data, posts: data.posts.map((p) => (p.id === existing.id ? { ...p, ...fields } : p)) };
    }
    const post: Post = { id: newId(), authorId: ME, trackerId, dateKey, at: nowIso, auto: true, ...fields };
    return { ...data, posts: [post, ...data.posts] };
  }
  if (existing && !complete) {
    return { ...data, posts: data.posts.filter((p) => p.id !== existing.id) };
  }
  return data;
}

export interface Author {
  id: string;
  name: string;
  handle: string;
  emoji: string;
  sample: boolean;
}

export interface FeedItem {
  post: Post;
  author: Author;
  mine: boolean;
  props: number;
  propped: boolean;
  comments: number;
}

export function authorOf(data: AppData, authorId: string): Author {
  if (authorId === ME) {
    const p = data.profile;
    return { id: ME, name: p?.name || 'You', handle: p?.handle || 'you', emoji: p?.emoji || '🙂', sample: false };
  }
  const m = getMember(authorId);
  return m ? { id: m.id, name: m.name, handle: m.handle, emoji: m.emoji, sample: true } : { id: authorId, name: 'Member', handle: 'member', emoji: '👤', sample: true };
}

export function allPosts(data: AppData, today: string, nowMs: number): Post[] {
  return [...data.posts, ...samplePosts(today, nowMs, 5)].sort((a, b) => (a.at < b.at ? 1 : -1));
}

export function buildFeed(data: AppData, today: string, nowMs: number, scope: 'following' | 'everyone'): FeedItem[] {
  const following = new Set(data.following);
  const props = new Set(data.props);
  return allPosts(data, today, nowMs)
    .filter((p) => scope === 'everyone' || p.authorId === ME || following.has(p.authorId))
    .map((post) => {
      const propped = props.has(post.id);
      return {
        post,
        author: authorOf(data, post.authorId),
        mine: post.authorId === ME,
        propped,
        props: (post.sampleProps ?? 0) + (propped ? 1 : 0),
        comments: data.comments.filter((c) => c.postId === post.id).length,
      };
    });
}

export interface Standing {
  memberId: string;
  name: string;
  emoji: string;
  sample: boolean;
  consistency: number;
  streak: number;
}

/** Weekly consistency board for a segment: you (if you track it) plus the preview community. */
export function leaderboard(data: AppData, segment: SegmentId, today: string): { rows: Standing[]; youTrack: boolean } {
  const weekKey = startOfWeek(today);
  const rows: Standing[] = SAMPLE_MEMBERS.filter((m) => m.segments.includes(segment)).map((m) => ({
    memberId: m.id,
    name: m.name,
    emoji: m.emoji,
    sample: true,
    ...sampleStanding(m.id, segment, weekKey),
  }));
  const mine = activeTrackers(data.trackers).filter((t) => t.segment === segment && t.visibility === 'public');
  if (mine.length > 0) {
    const avg = mine.reduce((s, t) => s + consistency(t, data.entries, today, 7), 0) / mine.length;
    const streak = Math.max(...mine.map((t) => currentStreak(t, data.entries, today)));
    const me = authorOf(data, ME);
    rows.push({ memberId: ME, name: me.name, emoji: me.emoji, sample: false, consistency: avg, streak });
  }
  rows.sort((a, b) => b.consistency - a.consistency || b.streak - a.streak || a.name.localeCompare(b.name));
  return { rows, youTrack: mine.length > 0 };
}

export function timeAgo(iso: string, nowMs: number): string {
  const mins = Math.max(0, Math.round((nowMs - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}
