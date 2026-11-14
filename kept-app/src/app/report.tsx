import { useMemo, useState } from 'react';
import { Platform, Share } from 'react-native';

import { Body, Button, Card, Muted, Screen, Segmented } from '../components/ui';
import { notify } from '../lib/feedback';
import { clinicianSummary } from '../lib/report';
import { useToday } from '../lib/useToday';
import { useStore } from '../state/store';

export default function ReportScreen() {
  const { data } = useStore();
  const today = useToday();
  const [days, setDays] = useState(30);
  const text = useMemo(() => clinicianSummary(data, today, days), [data, today, days]);

  const share = async () => {
    try {
      if (Platform.OS === 'web') {
        const nav = typeof navigator !== 'undefined' ? navigator : undefined;
        if (nav?.share) {
          await nav.share({ text });
        } else if (nav?.clipboard) {
          await nav.clipboard.writeText(text);
          notify('Copied', 'The summary is on your clipboard.');
        }
        return;
      }
      await Share.share({ message: text });
    } catch {
      // User cancelled the share sheet.
    }
  };

  return (
    <Screen edges={['bottom']}>
      <Segmented
        accessibilityLabel="Summary period"
        value={days}
        onChange={setDays}
        options={[
          { value: 14, label: '14 days' },
          { value: 30, label: '30 days' },
          { value: 90, label: '90 days' },
        ]}
      />
      <Card>
        <Body selectable style={{ fontSize: 15, lineHeight: 22 }}>
          {text}
        </Body>
      </Card>
      <Button title="Share summary" icon="share-outline" onPress={share} />
      <Muted style={{ textAlign: 'center', fontSize: 13 }}>
        The summary is created on your phone. Nothing is sent anywhere unless you share it.
      </Muted>
    </Screen>
  );
}
