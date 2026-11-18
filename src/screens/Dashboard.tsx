import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Button, Field, Notice } from '../components/ui';
import { TaskEditor } from '../components/TaskEditor';
import { TaskBoard } from '../components/TaskBoard';
import { AssignmentDialog } from '../components/AssignmentDialog';
import { loadGroups, loadMembers, loadTasks, rpc, saveTask } from '../lib/api';
import { errorText, taskStatuses, taskPriorities, type Group, type Member, type Task, type TaskDraft, type TaskStatus, type TaskPriority } from '../lib/models';
import { client } from '../lib/supabase';
import { filterTasks, localDateKey } from '../lib/taskOverview';
import { performTaskAction, taskActionMessage, type TaskAction } from '../lib/taskActions';
import { useUI } from '../lib/preferences';
import type { MessageKey } from '../lib/i18n';

export function Dashboard({ userId }: { userId: string }) {
  const { ui, colors, t, language } = useUI();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadedGroup, setLoadedGroup] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [feedback, setFeedback] = useState<MessageKey | null>(null);
  const [actionFeedback, setActionFeedback] = useState<TaskAction | null>(null);
  const [refreshWarning, setRefreshWarning] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [invite, setInvite] = useState('');
  const [filter, setFilter] = useState<'all' | TaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [query, setQuery] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [view, setView] = useState<'board' | 'list'>('board');
  const [today, setToday] = useState(() => localDateKey(new Date()));
  const [editor, setEditor] = useState<Task | 'new' | null>(null);
  const [assigning, setAssigning] = useState<Task | null>(null);
  const request = useRef(0);
  const group = groups.find((g) => g.id === groupId);
  const loadingTasks = refreshing || loadedGroup !== groupId;
  const errorMessage = error ? errorText(error, language) : '';

  const refreshGroups = useCallback(async (preferred?: string) => {
    const result = await loadGroups();
    setGroups(result);
    if (preferred) {
      setEditor(null); setAssigning(null); setInvite(''); setFilter('all'); setQuery('');
      setMineOnly(false); setPriorityFilter('all'); setTasks([]); setMembers([]);
    }
    setGroupId((current) => preferred ?? (result.some((g) => g.id === current) ? current : result[0]?.id ?? ''));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setToday(localDateKey(new Date())), 60_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    Promise.all([loadGroups(), rpc('get_profile', {})]).then(([result, profile]) => {
      if (!active) return;
      if (profile !== null && typeof profile !== 'string') throw new Error('invalid_data');
      setGroups(result); setGroupId(result[0]?.id ?? ''); setDisplayName(profile ?? '');
    }).catch((e: unknown) => { if (active) setError(e); })
      .finally(() => { if (active) setLoadingGroups(false); });
    return () => { active = false; };
  }, []);

  const refreshTasks = useCallback(async () => {
    if (!groupId) return;
    const sequence = ++request.current;
    setRefreshing(true);
    try {
      const [result, people] = await Promise.all([loadTasks(groupId), loadMembers(groupId)]);
      if (sequence === request.current) { setTasks(result); setMembers(people); }
    } finally {
      if (sequence === request.current) { setRefreshing(false); setLoadedGroup(groupId); }
    }
  }, [groupId]);
  useEffect(() => {
    if (!groupId) return;
    const sequence = ++request.current;
    Promise.all([loadTasks(groupId), loadMembers(groupId)]).then(([result, people]) => {
      if (sequence === request.current) { setTasks(result); setMembers(people); }
    }).catch((e: unknown) => { if (sequence === request.current) setError(e); })
      .finally(() => { if (sequence === request.current) setLoadedGroup(groupId); });
    return () => { request.current += 1; };
  }, [groupId]);

  function clearMessages() {
    setError(null); setFeedback(null); setActionFeedback(null); setRefreshWarning(false);
  }
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); clearMessages();
    try { await action(); } catch (e) { setError(e); }
    finally { setBusy(false); }
  }
  function showTaskResult(result: 'refreshed' | 'refresh_failed', message: MessageKey) {
    setFeedback(message); setRefreshWarning(result === 'refresh_failed');
  }
  async function submitTask(draft: TaskDraft) {
    await run(async () => {
      const current = editor && editor !== 'new' ? editor : undefined;
      const result = await performTaskAction(async () => {
        await saveTask(groupId, draft, current?.id, current?.version); setEditor(null);
      }, refreshTasks);
      showTaskResult(result, current ? 'savedTask' : 'createdTask');
    });
  }
  function act(task: Task, action: TaskAction) {
    void run(async () => {
      const result = await performTaskAction(async () => {
        await rpc('change_task', { p_id: task.id, p_action: action, p_version: task.version });
      }, refreshTasks);
      setActionFeedback(action); setRefreshWarning(result === 'refresh_failed');
    });
  }
  function setProgress(task: Task, value: number) {
    void run(async () => {
      const result = await performTaskAction(async () => {
        await rpc('set_task_progress', { p_id: task.id, p_progress: value, p_version: task.version });
      }, refreshTasks);
      showTaskResult(result, 'progressSaved');
    });
  }
  function assign(user: string | null) {
    if (!assigning) return;
    const task = assigning;
    void run(async () => {
      const result = await performTaskAction(async () => {
        await rpc('assign_task', { p_id: task.id, p_user: user, p_version: task.version }); setAssigning(null);
      }, refreshTasks);
      showTaskResult(result, 'assignSaved');
    });
  }
  function resetFilters() { setFilter('all'); setQuery(''); setMineOnly(false); setPriorityFilter('all'); }
  const visible = filterTasks(tasks, { status: filter, query, mineOnly, userId, priority: priorityFilter });

  return <>
    <View style={ui.row}>
      <View style={ui.rowHeading}><Text style={ui.eyebrow}>{t('dashboardEyebrow')}</Text><Text style={ui.title}>{t('dashboardTitle')}</Text></View>
      <Button label={t('logout')} secondary disabled={busy} onPress={() => void run(async () => {
        const result = await client().auth.signOut(); if (result.error) throw result.error;
      })} />
    </View>
    <Notice message={editor || assigning ? '' : errorMessage} error />
    <Notice message={feedback ? t(feedback) : actionFeedback ? taskActionMessage(actionFeedback, language) : ''} />
    <Notice message={refreshWarning ? t('refreshFailed') : ''} error />
    {loadingGroups ? <ActivityIndicator accessibilityLabel={t('loadingGroups')} color={colors.green} /> : <>
      <View style={ui.card}>
        <Text style={ui.heading}>{t('profileTitle')}</Text><Text style={ui.body}>{t('profileHint')}</Text>
        <Field label={t('displayName')} value={displayName} onChangeText={setDisplayName} maxLength={80} editable={!busy} />
        <Button label={t('profileSave')} secondary disabled={busy || !displayName.trim()} onPress={() => void run(async () => {
          const result = await performTaskAction(async () => { await rpc('set_profile', { p_name: displayName.trim() }); }, refreshTasks);
          showTaskResult(result, 'profileSaved');
        })} />
      </View>
      {groups.length ? <View style={ui.card}>
        <Text style={ui.heading}>{t('groupArea')}</Text>
        <View style={ui.row}>{groups.map((g) => <Button key={g.id} label={g.name} secondary selected={groupId === g.id} disabled={busy || loadingTasks} onPress={() => {
          if (g.id !== groupId) { setTasks([]); setMembers([]); setInvite(''); setEditor(null); setAssigning(null); clearMessages(); resetFilters(); setGroupId(g.id); }
        }} />)}
          <Button label={t('refresh')} secondary disabled={busy || loadingTasks} onPress={() => void run(async () => { await refreshGroups(); await refreshTasks(); })} />
        </View>
      </View> : <View style={ui.card}>
        <Text style={ui.heading}>{t('welcome')}</Text><Text style={ui.body}>{t('welcomeText')}</Text>
        <Button label={t('reloadGroups')} secondary disabled={busy} onPress={() => void run(() => refreshGroups())} />
      </View>}

      {group ? <>
        <View style={ui.row}><View style={ui.rowHeading}>
          <Text style={ui.heading}>{group.name}</Text><Text style={ui.body}>{t('summary', { open: tasks.filter((task) => task.status === 'open').length, done: tasks.filter((task) => task.status === 'done').length })}</Text>
        </View><Button label={t('newTask')} disabled={busy || loadingTasks} onPress={() => { clearMessages(); setEditor('new'); }} /></View>
        {group.owner_id === userId ? <View style={ui.card}>
          <View style={ui.row}><Text style={ui.body}>{t('inviteText')}</Text>
            <Button label={t('showInvite')} secondary disabled={busy} onPress={() => void run(async () => {
              const result = await rpc('get_invite_code', { p_group: groupId });
              if (typeof result !== 'string') throw new Error('invalid_data'); setInvite(result);
            })} />
          </View>{invite ? <Text selectable style={ui.body}>{t('inviteCode', { code: invite })}</Text> : null}
        </View> : null}
        {editor ? <TaskEditor key={editor === 'new' ? 'new' : editor.id} task={editor === 'new' ? undefined : editor} busy={busy} serverError={errorMessage} onSave={submitTask} onCancel={() => setEditor(null)} /> : null}
        {assigning ? <AssignmentDialog task={assigning} members={members} busy={busy} error={errorMessage} onAssign={assign} onCancel={() => setAssigning(null)} /> : null}
        <View style={ui.card}>
          <Field label={t('searchTasks')} placeholder={t('searchHint')} value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search" />
          <View style={ui.row}><Button label={t('allStatus')} secondary selected={filter === 'all'} onPress={() => setFilter('all')} />
            {taskStatuses.map((status) => <Button key={status} label={t(status)} secondary selected={filter === status} onPress={() => setFilter(status)} />)}
          </View>
          <Text style={ui.body}>{t('priorityFilter')}</Text>
          <View style={ui.row}><Button label={t('allPriorities')} secondary selected={priorityFilter === 'all'} onPress={() => setPriorityFilter('all')} />
            {taskPriorities.map((priority) => <Button key={priority} label={t(priority)} secondary selected={priorityFilter === priority} onPress={() => setPriorityFilter(priority)} />)}
          </View>
          <View style={ui.row}>
            <Button label={t('mine')} secondary selected={mineOnly} onPress={() => setMineOnly(!mineOnly)} />
            {filter !== 'all' || query || mineOnly || priorityFilter !== 'all' ? <Button label={t('resetFilters')} secondary onPress={resetFilters} /> : null}
            <Button label={t('board')} secondary selected={view === 'board'} onPress={() => setView('board')} />
            <Button label={t('list')} secondary selected={view === 'list'} onPress={() => setView('list')} />
          </View>
          <Text style={ui.body}>{t('mineHint')}</Text>
          {!loadingTasks ? <Text accessibilityLiveRegion="polite" style={ui.body}>{t('resultCount', { visible: visible.length, total: tasks.length })}</Text> : null}
        </View>
        {loadingTasks ? <ActivityIndicator accessibilityLabel={t('loadingTasks')} color={colors.green} /> : <>
          {visible.length === 0 ? <View style={ui.card}><Text style={ui.heading}>{t(tasks.length ? 'noMatches' : 'emptyTitle')}</Text>
            <Text style={ui.body}>{t(tasks.length ? 'filterHint' : 'emptyHint')}</Text>
            {tasks.length ? <Button label={t('showAll')} secondary onPress={resetFilters} /> : null}
          </View> : null}
          <TaskBoard tasks={visible} mode={view} members={members} userId={userId} ownerId={group.owner_id} today={today} busy={busy}
            onAction={act} onEdit={(task) => { clearMessages(); setEditor(task); }} onAssign={(task) => { clearMessages(); setAssigning(task); }} onProgress={setProgress} />
        </>}
      </> : null}
      <View style={ui.card}><Text style={ui.heading}>{t('createOrJoin')}</Text>
        <Field label={t('groupName')} value={name} onChangeText={setName} maxLength={100} editable={!busy} />
        <Button label={t('createGroup')} secondary disabled={busy || name.trim().length < 3} onPress={() => void run(async () => {
          const result = await rpc('create_group', { p_name: name.trim() });
          if (typeof result !== 'string') throw new Error('invalid_data'); await refreshGroups(result); setName('');
        })} />
        <Field label={t('joinCode')} value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false} maxLength={32} editable={!busy} />
        <Button label={t('joinGroup')} secondary disabled={busy || !/^[a-f0-9]{32}$/i.test(code.trim())} onPress={() => void run(async () => {
          const result = await rpc('join_group', { p_code: code.trim().toLowerCase() });
          if (typeof result !== 'string') throw new Error('invalid_data'); await refreshGroups(result); setCode('');
        })} />
      </View>
    </>}
  </>;
}
