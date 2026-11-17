import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Button, Field, Notice, ui, colors } from '../components/ui';
import { TaskEditor } from '../components/TaskEditor';
import { loadGroups, loadTasks, rpc, saveTask } from '../lib/api';
import { errorText, type Group, type Task, type TaskDraft, type TaskStatus } from '../lib/models';
import { client } from '../lib/supabase';
import { filterTasks, localDateKey, taskDeadline } from '../lib/taskOverview';

const labels: Record<TaskStatus, string> = { open: 'Offen', claimed: 'Übernommen', done: 'Erledigt' };

export function Dashboard({ userId }: { userId: string }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadedGroup, setLoadedGroup] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [invite, setInvite] = useState('');
  const [filter, setFilter] = useState<'all' | TaskStatus>('all');
  const [query, setQuery] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [today, setToday] = useState(() => localDateKey(new Date()));
  const [editor, setEditor] = useState<Task | 'new' | null>(null);
  const request = useRef(0);
  const group = groups.find((g) => g.id === groupId);
  const loadingTasks = refreshing || loadedGroup !== groupId;

  const refreshGroups = useCallback(async (preferred?: string) => {
    const result = await loadGroups();
    setGroups(result);
    if (preferred) { setEditor(null); setInvite(''); setFilter('all'); setQuery(''); setMineOnly(false); setTasks([]); }
    setGroupId((current) => preferred ?? (result.some((g) => g.id === current) ? current : result[0]?.id ?? ''));
  }, []);
  useEffect(() => {
    // Keep deadline labels current when the app remains open across midnight.
    const timer = setInterval(() => setToday(localDateKey(new Date())), 60_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    loadGroups().then((result) => {
      if (active) { setGroups(result); setGroupId(result[0]?.id ?? ''); }
    }).catch((e: unknown) => { if (active) setError(errorText(e)); })
      .finally(() => { if (active) setLoadingGroups(false); });
    return () => { active = false; };
  }, []);

  const refreshTasks = useCallback(async () => {
    if (!groupId) return;
    const sequence = ++request.current;
    setRefreshing(true);
    try { const result = await loadTasks(groupId); if (sequence === request.current) setTasks(result); }
    finally { if (sequence === request.current) { setRefreshing(false); setLoadedGroup(groupId); } }
  }, [groupId]);
  useEffect(() => {
    if (!groupId) return;
    const sequence = ++request.current;
    loadTasks(groupId).then((result) => { if (sequence === request.current) setTasks(result); })
      .catch((e: unknown) => { if (sequence === request.current) setError(errorText(e)); })
      .finally(() => { if (sequence === request.current) setLoadedGroup(groupId); });
    return () => { request.current += 1; };
  }, [groupId]);

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }
  async function submitTask(draft: TaskDraft) {
    await run(async () => {
      const current = editor && editor !== 'new' ? editor : undefined;
      await saveTask(groupId, draft, current?.id, current?.version);
      setEditor(null);
      await refreshTasks();
    });
  }
  function act(task: Task, action: 'claim' | 'release' | 'complete' | 'reopen') {
    void run(async () => {
      await rpc('change_task', { p_id: task.id, p_action: action, p_version: task.version });
      await refreshTasks();
    });
  }
  const visible = filterTasks(tasks, { status: filter, query, mineOnly, userId });
  function resetFilters() { setFilter('all'); setQuery(''); setMineOnly(false); }
  return <>
    <View style={ui.row}><View style={{ flex: 1 }}><Text style={ui.eyebrow}>DEIN ENGAGEMENT ZÄHLT</Text>
      <Text style={ui.title}>Zusammen wird mehr daraus.</Text></View>
      <Button label="Abmelden" secondary disabled={busy} onPress={() => void run(async () => {
        const { error: signOutError } = await client().auth.signOut(); if (signOutError) throw signOutError;
      })} /></View>
    <Notice message={error} error />
    {loadingGroups ? <ActivityIndicator accessibilityLabel="Vereine werden geladen" color={colors.green} /> : <>
      {groups.length > 0 ? <View style={ui.card}><Text style={ui.heading}>Dein Vereinsbereich</Text><View style={ui.row}>
        {groups.map((g) => <Button key={g.id} label={g.name} secondary selected={groupId === g.id} disabled={busy || loadingTasks} onPress={() => {
          if (g.id !== groupId) { setTasks([]); setInvite(''); setEditor(null); resetFilters(); setGroupId(g.id); }
        }} />)}
        <Button label="Aktualisieren" secondary disabled={busy || loadingTasks} onPress={() => void run(async () => { await refreshGroups(); await refreshTasks(); })} />
      </View></View> : <View style={ui.card}><Text style={ui.heading}>Willkommen im Ehrenamtsplaner</Text>
        <Text style={ui.body}>Erstelle einen Vereinsbereich oder tritt mit dem Einladungscode deiner Organisation bei.</Text>
        <Button label="Vereine erneut laden" secondary disabled={busy} onPress={() => void run(() => refreshGroups())} /></View>}

      {group ? <>
        <View style={ui.row}><View style={{ flex: 1 }}><Text style={ui.heading}>{group.name}</Text>
          <Text style={ui.body}>{tasks.filter((t) => t.status === 'open').length} offene · {tasks.filter((t) => t.status === 'done').length} erledigte Aufgaben</Text></View>
          <Button label="+ Neue Aufgabe" disabled={busy || loadingTasks} onPress={() => setEditor('new')} /></View>
        {group.owner_id === userId ? <View style={ui.card}><View style={ui.row}>
          <Text style={ui.body}>Lade weitere Helfende ein.</Text>
          <Button label="Einladungscode anzeigen" secondary disabled={busy} onPress={() => void run(async () => {
            const result = await rpc('get_invite_code', { p_group: groupId });
            if (typeof result !== 'string') throw new Error('invalid_data'); setInvite(result);
          })} /></View>{invite ? <Text selectable style={ui.body}>Vertraulich weitergeben: {invite}</Text> : null}</View> : null}
        {editor ? <TaskEditor key={editor === 'new' ? 'new' : editor.id} task={editor === 'new' ? undefined : editor} busy={busy}
          onSave={submitTask} onCancel={() => setEditor(null)} /> : null}
        <View style={ui.card}>
          <Field label="Aufgaben durchsuchen" placeholder="Titel oder Beschreibung" value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search" />
          <View style={ui.row}>{(['all', 'open', 'claimed', 'done'] as const).map((status) =>
            <Button key={status} label={status === 'all' ? 'Alle Status' : labels[status]} secondary selected={filter === status} onPress={() => setFilter(status)} />)}</View>
          <View style={ui.row}>
            <Button label="Meine Aufgaben" secondary selected={mineOnly} onPress={() => setMineOnly(!mineOnly)} />
            {filter !== 'all' || query || mineOnly ? <Button label="Filter zurücksetzen" secondary onPress={resetFilters} /> : null}
          </View>
          <Text style={ui.body}>„Meine Aufgaben“ zeigt die Aufgaben, die du übernommen hast.</Text>
          {!loadingTasks ? <Text accessibilityLiveRegion="polite" style={ui.body}>{visible.length} von {tasks.length} Aufgaben</Text> : null}
        </View>
        {loadingTasks ? <ActivityIndicator accessibilityLabel="Aufgaben werden geladen" color={colors.green} /> :
          visible.length === 0 ? <View style={ui.card}><Text style={ui.heading}>{tasks.length ? 'Keine passenden Aufgaben gefunden.' : 'Hier ist noch Platz für Engagement.'}</Text>
            <Text style={ui.body}>{tasks.length ? 'Ändere die Suche oder setze die Filter zurück.' : 'Erstelle die erste Aufgabe für deinen Verein.'}</Text>
            {tasks.length ? <Button label="Alle Aufgaben anzeigen" secondary onPress={resetFilters} /> : null}</View> :
            visible.map((task) => {
              const deadline = taskDeadline(task, today);
              return <View key={task.id} style={[ui.card, deadline.overdue ? { borderColor: '#9A291C' } : undefined]}>
              <Text style={ui.eyebrow}>{labels[task.status]}{task.assigned_to === userId ? ' · DEINE AUFGABE' : ''}</Text>
              <Text style={ui.heading}>{task.title}</Text>
              {task.description ? <Text style={ui.body}>{task.description}</Text> : null}
              <Text style={[ui.body, deadline.overdue ? { color: '#9A291C', fontWeight: '700' } : undefined]}>{deadline.text}</Text>
              <View style={ui.row}>
                {task.status === 'open' ? <Button label="Ich helfe mit" disabled={busy} onPress={() => act(task, 'claim')} /> : null}
                {task.status === 'claimed' && task.assigned_to === userId ? <>
                  <Button label="Als erledigt markieren" disabled={busy} onPress={() => act(task, 'complete')} />
                  <Button label="Aufgabe freigeben" secondary disabled={busy} onPress={() => act(task, 'release')} /></> : null}
                {task.status === 'done' && (task.assigned_to === userId || group.owner_id === userId) ?
                  <Button label="Wieder öffnen" secondary disabled={busy} onPress={() => act(task, 'reopen')} /> : null}
                {(task.created_by === userId || group.owner_id === userId) ? <Button label="Bearbeiten" secondary disabled={busy} onPress={() => setEditor(task)} /> : null}
              </View>
            </View>; })}
      </> : null}

      <View style={ui.card}><Text style={ui.heading}>Verein erstellen oder beitreten</Text>
        <Field label="Name des neuen Vereins" value={name} onChangeText={setName} maxLength={100} editable={!busy} />
        <Button label="Vereinsbereich erstellen" secondary disabled={busy || name.trim().length < 3} onPress={() => void run(async () => {
          const result = await rpc('create_group', { p_name: name.trim() });
          if (typeof result !== 'string') throw new Error('invalid_data'); await refreshGroups(result); setName('');
        })} />
        <Field label="Einladungscode deines Vereins" value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false} maxLength={32} editable={!busy} />
        <Button label="Verein beitreten" secondary disabled={busy || !/^[a-f0-9]{32}$/i.test(code.trim())} onPress={() => void run(async () => {
          const result = await rpc('join_group', { p_code: code.trim().toLowerCase() });
          if (typeof result !== 'string') throw new Error('invalid_data'); await refreshGroups(result); setCode('');
        })} />
      </View>
    </>}
  </>;
}
