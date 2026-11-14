import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Profile } from './types';

const CHANNEL_ID = 'reminders';

export function configureNotificationHandler(): void {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.status === 'granted';
}

/**
 * Replaces all scheduled reminders to match the profile: a dose reminder
 * (weekly on dose day, or daily) at 9:00 and an evening protein check at 19:00.
 * Local notifications only; nothing leaves the device.
 * Returns false when reminders could not be scheduled (web, or permission denied).
 */
export async function syncReminders(profile: Profile): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!profile.remindersEnabled) return true;
    if (!(await ensurePermission())) return false;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Reminders',
        // eslint-disable-next-line import/namespace -- re-exported from the package's types; verified by tsc
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const doseContent = {
      title: 'Dose day',
      body: 'Log your dose in Kept so your plan stays in sync with your cycle.',
    };
    if (profile.frequency === 'weekly') {
      await Notifications.scheduleNotificationAsync({
        content: doseContent,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          channelId: CHANNEL_ID,
          // expo-notifications weekdays run 1 (Sunday) to 7 (Saturday).
          weekday: profile.doseWeekday + 1,
          hour: 9,
          minute: 0,
        },
      });
    } else {
      await Notifications.scheduleNotificationAsync({
        content: { ...doseContent, title: 'Daily dose' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, channelId: CHANNEL_ID, hour: 9, minute: 0 },
      });
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Protein check',
        body: `How close are you to ${profile.proteinTargetG} g today? A shake or yogurt can close the gap.`,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, channelId: CHANNEL_ID, hour: 19, minute: 0 },
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Nothing to cancel.
  }
}
