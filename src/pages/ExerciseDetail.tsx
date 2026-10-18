import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Dumbbell, Pencil, Trash2 } from 'lucide-react';
import { actions, useStore } from '../lib/store';
import { CATEGORY_LABEL, EQUIPMENT_LABEL, MUSCLE_LABEL } from '../lib/seed/exercises';
import { exerciseHistory } from '../lib/analytics/strength';
import { fmtDay, fmtWeight } from '../lib/util';
import { Avatar, Button, Card, confirmDialog, Empty, IconButton, ListItem, Page, Section } from '../components/ui';
import { ExerciseSheet, TRACKING_LABEL } from './Library';

export default function ExerciseDetail() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const data = useStore((s) => s.data);
  const ex = data.exercises.find((e) => e.id === id);
  const [editing, setEditing] = useState(false);
  const units = data.settings.units;

  const leaderboard = useMemo(() => {
    if (!ex) return [];
    return data.clients
      .map((c) => {
        const h = exerciseHistory(data.sessions, ex.id, c.id);
        if (!h.length) return null;
        const best = h.reduce((a, b) => (b.bestE1rm > a.bestE1rm ? b : a));
        return { c, best, count: h.length, last: h[h.length - 1] };
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => b.best.bestE1rm - a.best.bestE1rm);
  }, [data.clients, data.sessions, ex]);

  if (!ex) return <Page title="Exercise" back><Empty icon={<Dumbbell />} title="Exercise not found" /></Page>;

  return (
    <Page
      title={ex.name}
      back
      compact
      actions={
        <IconButton label="Edit exercise" onClick={() => setEditing(true)}>
          <Pencil size={18} />
        </IconButton>
      }
    >
      <div className="row wrap" style={{ gap: 6 }}>
        <span className="pill accent">{MUSCLE_LABEL[ex.primary]}</span>
        {ex.secondary.map((m) => (
          <span className="pill" key={m}>
            {MUSCLE_LABEL[m]}
          </span>
        ))}
        <span className="pill">{EQUIPMENT_LABEL[ex.equipment]}</span>
        <span className="pill">{CATEGORY_LABEL[ex.category]}</span>
        <span className="pill">{TRACKING_LABEL[ex.tracking]}</span>
      </div>

      <Card>
        <div className="card-title">Coaching cues</div>
        <p className="muted mt-1">{ex.cues || 'No cues yet — tap edit to add your setup and key cues.'}</p>
        {ex.videoUrl && (
          <a className="btn btn-secondary btn-block mt-2" href={ex.videoUrl} target="_blank" rel="noreferrer">
            Watch demo video
          </a>
        )}
      </Card>

      {ex.tracking === 'weight_reps' && (
        <Section title="Client bests">
          <div className="card flush">
            {leaderboard.map(({ c, best, count, last }) => (
              <ListItem
                key={c.id}
                icon={<Avatar name={c.name} color={c.color} size={34} />}
                title={c.name}
                subtitle={`${count} sessions · last ${fmtDay(last.date)} (${fmtWeight(last.topWeight, units)} × ${last.topReps})`}
                right={<span className="bold tabular">{fmtWeight(best.bestE1rm, units)}</span>}
                onClick={() => nav(`/clients/${c.id}?tab=training`)}
              />
            ))}
            {!leaderboard.length && <Empty icon={<Dumbbell />} title="Not logged yet" />}
          </div>
          <div className="xs faint mt-1">Best estimated 1RM per client.</div>
        </Section>
      )}

      {ex.custom && (
        <Button
          variant="danger"
          block
          onClick={async () => {
            if (await confirmDialog({ title: `Delete ${ex.name}?`, body: 'Logged sets for this exercise will no longer show a name.', confirm: 'Delete', danger: true })) {
              actions().remove('exercises', ex.id);
              nav('/library?tab=exercises', { replace: true });
            }
          }}
        >
          <Trash2 size={18} /> Delete exercise
        </Button>
      )}

      {editing && <ExerciseSheet exercise={ex} onClose={() => setEditing(false)} />}
    </Page>
  );
}
