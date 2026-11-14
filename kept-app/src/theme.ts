import { useColorScheme } from 'react-native';

export interface Colors {
  bg: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  track: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  accent: string;
  accentSoft: string;
  calm: string;
  calmSoft: string;
  danger: string;
}

const light: Colors = {
  bg: '#F5F6F2',
  card: '#FFFFFF',
  text: '#16211C',
  muted: '#5E6A64',
  border: '#E2E6E0',
  track: '#E8ECE7',
  primary: '#1E6B58',
  primarySoft: '#E1F0EA',
  onPrimary: '#FFFFFF',
  accent: '#C76E12',
  accentSoft: '#FBEBD9',
  calm: '#4A63B5',
  calmSoft: '#E6EAF8',
  danger: '#B83B33',
};

const dark: Colors = {
  bg: '#0E1311',
  card: '#171F1C',
  text: '#ECF1EE',
  muted: '#9AA6A0',
  border: '#25302C',
  track: '#25302C',
  primary: '#5CC3A5',
  primarySoft: '#1B3A31',
  onPrimary: '#06221A',
  accent: '#F0A65A',
  accentSoft: '#3A2915',
  calm: '#93A6EC',
  calmSoft: '#1F2747',
  danger: '#EB7C74',
};

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };
