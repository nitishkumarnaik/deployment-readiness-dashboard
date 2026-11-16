import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, IconButton, Label, Muted, ProgressBar, Row, Screen, Title } from '../../components/ui';
import { childSpaces, describeSummary, spaceBlocks, summarize } from '../../lib/spaces';
import { amountOn } from '../../lib/trackers';
import { useTileWidth } from '../../lib/useTileWidth';
import { useToday } from '../../lib/useToday';
import { useStore } from '../../state/store';
import { c, radius, space } from '../../theme';

export default function SpacesScreen() {
  const { data } = useStore();
  const today = useToday();
  const width = useTileWidth(2, space.md);
  const spaces = childSpaces(data.spaces, null);

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Title>Spaces</Title>
        <IconButton icon="add" label="New space" onPress={() => router.push('/space/new')} />
      </Row>
      <Muted>Design your own boards. Each space is a folder of trackers, tasks, notes and sub-folders, laid out the way you think.</Muted>

      {spaces.length === 0 ? (
        <Card>
          <Text style={{ fontSize: 28 }}>🗂️</Text>
          <Label>No spaces yet</Label>
          <Muted>Start from a template like Research hub or Ideation lab, or a blank space.</Muted>
          <Button title="Create a space" icon="add" onPress={() => router.push('/space/new')} />
        </Card>
      ) : (
        <View style={styles.grid}>
          {spaces.map((s) => {
            const summary = summarize(data.blocks, s.id);
            const trackerIds = spaceBlocks(data.blocks, s.id)
              .filter((b) => b.type === 'tracker' && b.trackerId)
              .map((b) => b.trackerId!);
            const trackers = data.trackers.filter((t) => trackerIds.includes(t.id));
            const done = trackers.filter((t) => amountOn(data.entries, t.id, today) >= t.target).length;
            return (
              <Pressable
                key={s.id}
                onPress={() => router.push({ pathname: '/space/[id]', params: { id: s.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${s.name}. ${describeSummary(summary)}`}
                style={({ pressed }) => [styles.card, { width, opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={{ fontSize: 30 }}>{s.emoji}</Text>
                <Text style={styles.name} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text style={styles.meta} numberOfLines={2}>
                  {describeSummary(summary)}
                </Text>
                {trackers.length > 0 ? (
                  <View style={{ gap: 4, marginTop: 'auto' }}>
                    <ProgressBar value={done / trackers.length} />
                    <Text style={styles.meta}>
                      {done}/{trackers.length} today
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  card: { minHeight: 170, backgroundColor: c.surface, borderRadius: radius.xl, padding: space.md, gap: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line },
  name: { color: c.text, fontSize: 17, fontWeight: '700', marginTop: 6 },
  meta: { color: c.muted, fontSize: 12 },
});
