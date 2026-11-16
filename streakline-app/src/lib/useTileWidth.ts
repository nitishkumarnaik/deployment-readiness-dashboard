import { useWindowDimensions } from 'react-native';

import { MAX_WIDTH, space } from '../theme';

/** Width of one tile when `columns` tiles share a row inside the screen padding. */
export function useTileWidth(columns: number, gap = space.sm, inset = 0): number {
  const { width } = useWindowDimensions();
  const content = Math.min(width, MAX_WIDTH) - space.lg * 2 - inset;
  return Math.floor((content - gap * (columns - 1)) / columns);
}

export function useContentWidth(inset = 0): number {
  const { width } = useWindowDimensions();
  return Math.min(width, MAX_WIDTH) - space.lg * 2 - inset;
}
