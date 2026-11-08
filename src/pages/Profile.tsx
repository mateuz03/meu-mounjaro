import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Button,
  Card,
  ConfirmDialog,
  Field,
  Modal,
  SectionTitle,
  Disclaimer,
  IconDownload,
  IconLogout,
  IconPrint,
  IconBox,
  IconTrash,
  IconScale,
} from '../components/ui';
import { MANDATORY_DISCLAIMER, kgToDisplay, todayISO } from '../lib/helpers';
import { supabase } from '../lib/supabase';
import { exportCsv } from '../lib/csv';
import { onInstallAvailable, promptInstall, isStandalone } from '../lib/pwa';
import {
  getNotificationPermission,
  notificationSupported,
  requestNotificationPermission,
  showNotification,
  syncNativeReminders,
} from '../lib/reminderNotifier';
import type { Profile as ProfileType } from '../lib/types';
import {
  getLockTimeout,
  hasLockPin,
  lockNow,
  removeLock,
  setLockPin,
  setLockTimeout,
  type LockTimeout,
} from '../lib/appLock';
import { parseBackup, formatDateBR, BACKUP_VERSION, type BackupPayload } from '../lib/backup';
import { uploadPhoto } from '../lib/storage';
import { Photo } from '../components/Photo';

const FIELD_LABELS: Record<string, string> = {
  applications: 'aplicações',
  measurements: 'medidas',
  logs: 'diário',
  effects: 'efeitos',
  reminders: 'lembretes',
  appointments: 'consultas',
  inventory: 'estoque',
  notes: 'anotações',
  gym_workouts: 'treinos',
  gym_exercise_entries: 'exercícios',
  sport_activities: 'atividades esportivas',
  fitness_routine_items: 'rotina',
  fitness_weight_logs: 'pesos (fitness)',
  diet_menu_items: 'cardápio',
  diet_meal_logs: 'refeições',
  diet_shopping_items: 'lista de compras',
  profile: 'perfil',
};

const PRIVACY_POLICY = [
  'Seus dados são armazenados de forma privada em sua conta pessoal e protegidos por autenticação. Nenhum dado seu é público e nenhum outro usuário consegue ver suas informações.',
  'Não incluímos dados pessoais em endereços (URLs) e não registramos informações sensíveis em logs do aplicativo.',
  'A exclusão de um registro exige confirmação. Você pode exportar todos os seus dados a qualquer momento e excluir sua conta, o que remove permanentemente seus registros.',
  'A estrutura foi preparada com atenção à LGPD (Lei Geral de Proteção de Dados). Apenas os dados que você informa são armazenados, exclusivamente para a finalidade de serem visualizados por você.',
];

const RESPONSIBLE_USE = [
  'Este aplicativo é um diário pessoal. Ele não diagnostica sintomas, não recomenda doses, não sugere alterações de tratamento e não substitui acompanhamento médico.',
  'Trate todas as doses e datas exibidas como informações que você mesmo registrou.',
  'Se você estiver preocupado com algo que está sentindo, procure o profissional responsável pelo seu tratamento ou um serviço de saúde.',
];

export function ProfilePage() {
  const { data, updateProfile, session, signOut, openAuth, setTab, setAction, showToast, restoreBackup } = useApp();
  const profile = data.profile;
  const wUnit = profile?.weight_unit ?? 'kg';

  const [name, setName] = useState(profile?.full_name ?? '');
  const [startDate, setStartDate] = useState(profile?.treatment_start_date ?? '');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>(wUnit);
  const [lengthUnit, setLengthUnit] = useState<'cm' | 'in'>(profile?.length_unit ?? 'cm');
  const [avatar, setAvatar] = useState<string | null>(profile?.avatar_url ?? null);
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);

  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>('default');

  const [lockEnabled, setLockEnabled] = useState(() => hasLockPin());
  const [lockTimeout, setLockTimeoutState] = useState<LockTimeout>(() => getLockTimeout());
  const [pinOpen, setPinOpen] = useState(false);
  const [pinMode, setPinMode] = useState<'set' | 'change'>('set');
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [pinError, setPinError] = useState('');
  const [lockDisableOpen, setLockDisableOpen] = useState(false);

  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [restorePayload, setRestorePayload] = useState<BackupPayload | null>(null);
  const [restoreFileName, setRestoreFileName] = useState('');
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    void getNotificationPermission().then((p) => setNotifPerm(p as NotificationPermission | 'unsupported'));
  }, []);
  const [installable, setInstallable] = useState(false);
  const [standalone] = useState(() => isStandalone());

  useEffect(() => onInstallAvailable(setInstallable), []);

  const saveBasics = async () => {
    if (!name.trim()) {
      showToast('Informe seu nome.', 'error');
      return;
    }
    setSaving(true);
    await updateProfile({
      full_name: name.trim(),
      treatment_start_date: startDate || null,
      weight_unit: weightUnit,
      length_unit: lengthUnit,
      avatar_url: avatar,
    });
    setSaving(false);
  };

  const exportData = () => {
    const payload = { exported_at: new Date().toISOString(), version: BACKUP_VERSION, ...data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meu-mounjaro-export-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Arquivo de exportação gerado.');
  };

  const deleteAccount = async () => {
    const { error } = await supabase.rpc('delete_own_account');
    if (error) {
      showToast('Não foi possível excluir a conta agora. Tente novamente.', 'error');
      return;
    }
    await signOut();
    showToast('Conta e dados excluídos permanentemente.');
  };

  const pickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uid = session?.user?.id;
    try {
      const bitmap = await createImageBitmap(file);
      const s = Math.min(bitmap.width, bitmap.height);
      const size = 320;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');
      ctx.drawImage(bitmap, (bitmap.width - s) / 2, (bitmap.height - s) / 2, s, s, 0, 0, size, size);
      bitmap.close();
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85),
      );
      if (!blob) throw new Error('blob');
      if (uid) {
        // Novo fluxo: bucket privado do Storage; o banco guarda só o caminho.
        const up = await uploadPhoto(uid, 'avatar', blob);
        if (up.ok && up.path) {
          setAvatar(up.path);
          return;
        }
      }
      // Fallback legado (bucket indisponível): data URL.
      const dataUrl = await new Promise<string>((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.readAsDataURL(blob);
      });
      setAvatar(dataUrl);
    } catch {
      showToast('Não foi possível processar a imagem.', 'error');
    }
  };

  const email = session?.user.email ?? '';

  const toggleReminders = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await updateProfile({ reminders_enabled: e.target.checked });
  };

  const enableNotif = async () => {
    const p = await requestNotificationPermission();
    setNotifPerm(p);
    if (p === 'granted') {
      showToast('Notificações ativadas neste dispositivo.');
      const enabled = profile?.reminders_enabled !== false;
      await syncNativeReminders(data.reminders, enabled);
    } else {
      showToast('Permissão de notificações não concedida.', 'info');
    }
  };

  const testNotif = async () => {
    const ok = await showNotification(
      'Notificação de teste',
      'As notificações do Meu Mounjaro estão funcionando neste dispositivo.',
      'teste',
    );
    showToast(
      ok ? 'Notificação enviada.' : 'Não foi possível enviar a notificação.',
      ok ? 'success' : 'error',
    );
  };

  const doInstall = async () => {
    const ok = await promptInstall();
    if (ok) showToast('Aplicativo instalado no dispositivo.');
  };

  const exportCsvFile = () => {
    exportCsv(data);
    showToast('Arquivo CSV gerado — abre direto no Excel.');
  };

  const onRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const payload = parseBackup(text);
      setRestorePayload(payload);
      setRestoreFileName(file.name);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Arquivo inválido.', 'error');
    }
  };

  const runRestore = async () => {
    if (!restorePayload) return;
    setRestoring(true);
    const result = await restoreBackup(restorePayload);
    setRestoring(false);
    const n = result.imported;
    if (result.failed.length === 0) {
      showToast(
        `Backup restaurado: ${n} novo${n === 1 ? '' : 's'} registro${n === 1 ? '' : 's'} importado${n === 1 ? '' : 's'}.`,
      );
    } else {
      const where = result.failed.map((f) => FIELD_LABELS[f.field] ?? f.field).join(', ');
      showToast(`Restauração parcial: ${n} importado(s); falha em: ${where}.`, 'error');
    }
    setRestorePayload(null);
    setRestoreFileName('');
  };

  const savePin = async () => {
    if (!/^\d{4,6}$/.test(pin1)) {
      setPinError('O PIN deve ter de 4 a 6 dígitos.');
      return;
    }
    if (pin1 !== pin2) {
      setPinError('Os PINs digitados não conferem.');
      return;
    }
    await setLockPin(pin1);
    setLockEnabled(true);
    setPinOpen(false);
    setPin1('');
    setPin2('');
    setPinError('');
    showToast('Bloqueio ativado neste dispositivo.');
  };

  const disableLock = () => {
    removeLock();
    setLockEnabled(false);
    setLockDisableOpen(false);
    showToast('Bloqueio desativado.');
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Perfil e configurações</h1>
          <p className="page-sub">{email}</p>
        </div>
      </div>

      <SectionTitle>Dados pessoais</SectionTitle>
      <Card>
        <div className="avatar-row">
          {avatar ? <Photo value={avatar} alt="Foto do perfil" className="avatar-img" /> : <div className="avatar-placeholder">{(name || '?').charAt(0).toUpperCase()}</div>}
          <label className="btn btn-ghost">
            Escolher foto (opcional)
            <input type="file" accept="image/*" hidden onChange={pickAvatar} />
          </label>
        </div>
        <div className="form-grid">
          <Field label="Nome">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Data de início do acompanhamento">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Unidade de peso">
            <select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value as 'kg' | 'lb')}>
              <option value="kg">Quilogramas (kg)</option>
              <option value="lb">Libras (lb)</option>
            </select>
          </Field>
          <Field label="Unidade de medida">
            <select value={lengthUnit} onChange={(e) => setLengthUnit(e.target.value as 'cm' | 'in')}>
              <option value="cm">Centímetros (cm)</option>
              <option value="in">Polegadas</option>
            </select>
          </Field>
          <Field label={`Meta pessoal de peso (${wUnit}) — opcional`} hint="Ajuste sua meta na tela Evolução, em “Meta pessoal”.">
            <div className="readonly-value">
              {profile?.goal_weight_kg != null ? `${kgToDisplay(profile.goal_weight_kg, wUnit)} ${wUnit}` : 'Não definida'}
            </div>
          </Field>
        </div>
        <Button onClick={saveBasics} disabled={saving}>{saving ? 'Salvando…' : 'Salvar dados pessoais'}</Button>
      </Card>

      <SectionTitle>Lembretes e notificações</SectionTitle>
      <Card>
        <label className="check-field">
          <input
            type="checkbox"
            checked={profile?.reminders_enabled ?? true}
            onChange={toggleReminders}
          />
          <span>
            <strong>Ativar lembretes</strong>
            <br />
            Exibir avisos das aplicações, pesagens, consultas e exames que você programou no
            calendário.
          </span>
        </label>

        {notifPerm === 'unsupported' && (
          <p className="muted small">
            Este navegador não suporta notificações. Seus lembretes continuam visíveis no início e
            no calendário.
          </p>
        )}

        {notifPerm === 'granted' && (
          <>
            <p className="muted small">
              Notificações ativadas neste dispositivo. Elas aparecem enquanto o aplicativo estiver
              aberto ou em segundo plano — não enviamos e-mails.
            </p>
            <Button variant="secondary" onClick={testNotif}>
              Enviar notificação de teste
            </Button>
          </>
        )}

        {notifPerm !== 'granted' && notifPerm !== 'unsupported' && (
          <Button onClick={enableNotif}>Permitir notificações neste dispositivo</Button>
        )}

        {!standalone && installable && (
          <>
            <div className="divider" />
            <Button variant="secondary" onClick={doInstall}>
              <IconDownload size={18} /> Instalar aplicativo no dispositivo
            </Button>
            <p className="muted small">
              Instala o Meu Mounjaro como um aplicativo, com ícone na tela inicial e tela cheia.
            </p>
          </>
        )}
      </Card>

      <SectionTitle>Bloqueio de privacidade</SectionTitle>
      <Card>
        <p className="muted small" style={{ marginTop: 0 }}>
          <strong>{lockEnabled ? 'Ativo neste dispositivo.' : 'Desativado.'}</strong>{' '}
          Solicita um PIN de 4 a 6 dígitos ao abrir o aplicativo. O PIN é salvo apenas neste
          aparelho — nada é enviado ao servidor.
        </p>
        {lockEnabled && (
          <div className="form-grid">
            <Field label="Quando bloquear">
              <select
                value={lockTimeout}
                onChange={(e) => {
                  const v = e.target.value as LockTimeout;
                  setLockTimeout(v);
                  setLockTimeoutState(v);
                }}
              >
                <option value="always">Sempre que sair do aplicativo</option>
                <option value="5min">Após 5 minutos fora do aplicativo</option>
              </select>
            </Field>
          </div>
        )}
        {lockEnabled ? (
          <div className="btn-row">
            <Button
              variant="secondary"
              onClick={() => {
                setPinMode('change');
                setPinError('');
                setPinOpen(true);
              }}
            >
              Trocar PIN
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                lockNow();
                window.location.reload();
              }}
            >
              Bloquear agora
            </Button>
            <Button variant="ghost" className="danger-text" onClick={() => setLockDisableOpen(true)}>
              Desativar bloqueio
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => {
              setPinMode('set');
              setPinError('');
              setPinOpen(true);
            }}
          >
            Ativar bloqueio com PIN
          </Button>
        )}
      </Card>

      <SectionTitle>Atalhos</SectionTitle>
      <div className="grid grid-2">
        <Card className="link-card" onClick={() => setTab('relatorio')}>
          <IconPrint />
          <div>
            <strong>Resumo para consulta</strong>
            <span>Gere um relatório para levar ao seu médico</span>
          </div>
        </Card>
        <Card className="link-card" onClick={() => { setTab('estoque'); setAction(''); }}>
          <IconBox />
          <div>
            <strong>Controle do medicamento</strong>
            <span>Quantidade restante, lote e validade</span>
          </div>
        </Card>
        <Card className="link-card" onClick={() => { setTab('evolucao'); setAction('new-weight'); }}>
          <IconScale />
          <div>
            <strong>Registrar peso</strong>
            <span>Adicionar um novo registro corporal</span>
          </div>
        </Card>
        <Card className="link-card" onClick={exportData}>
          <IconDownload />
          <div>
            <strong>Exportar dados (JSON)</strong>
            <span>Cópia completa para backup ou migração</span>
          </div>
        </Card>
        <Card className="link-card" onClick={exportCsvFile}>
          <IconDownload />
          <div>
            <strong>Exportar em CSV (Excel)</strong>
            <span>Tabela organizada por seção, pronta para mostrar ao médico</span>
          </div>
        </Card>
        <Card className="link-card" onClick={() => restoreInputRef.current?.click()}>
          <div>
            <strong>Restaurar backup</strong>
            <span>Importar um arquivo JSON exportado deste aplicativo</span>
          </div>
        </Card>
      </div>
      <input
        ref={restoreInputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={onRestoreFile}
      />

      <SectionTitle>Privacidade e aviso</SectionTitle>
      <div className="grid grid-2">
        <Card className="link-card" onClick={() => setPrivacyOpen(true)}>
          <div>
            <strong>Política de privacidade</strong>
          </div>
        </Card>
        <Card className="link-card" onClick={() => setNoticeOpen(true)}>
          <div>
            <strong>Aviso de uso responsável</strong>
          </div>
        </Card>
      </div>

      <Disclaimer>{MANDATORY_DISCLAIMER}</Disclaimer>

      <div className="danger-zone">
        <Button variant="ghost" onClick={signOut}>
          <IconLogout size={18} /> Sair da conta
        </Button>
        <Button variant="ghost" className="danger-text" onClick={() => setDeleteOpen(true)}>
          <IconTrash size={18} /> Excluir minha conta e meus dados
        </Button>
      </div>

      <Modal open={privacyOpen} onClose={() => setPrivacyOpen(false)} title="Política de privacidade">
        {PRIVACY_POLICY.map((p, i) => (
          <p key={i} className="modal-text">{p}</p>
        ))}
        <p className="modal-text">
          <a href="/privacy-policy.html" target="_blank" rel="noreferrer">Ver política de privacidade completa</a>
        </p>
      </Modal>

      <Modal open={noticeOpen} onClose={() => setNoticeOpen(false)} title="Aviso de uso responsável">
        {RESPONSIBLE_USE.map((p, i) => (
          <p key={i} className="modal-text">{p}</p>
        ))}
        <Disclaimer variant="warn">{MANDATORY_DISCLAIMER}</Disclaimer>
      </Modal>

      <Modal open={pinOpen} onClose={() => setPinOpen(false)} title={pinMode === 'set' ? 'Criar PIN de bloqueio' : 'Trocar PIN'}>
        <Field label="Novo PIN (4 a 6 dígitos)">
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin1}
            onChange={(e) => setPin1(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </Field>
        <Field label="Confirme o PIN">
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin2}
            onChange={(e) => setPin2(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </Field>
        {pinError && <p className="form-error">{pinError}</p>}
        <p className="muted small">
          Guarde bem o PIN: ele é salvo apenas neste dispositivo e não pode ser recuperado. Se você
          esquecer, será necessário sair da conta e entrar novamente.
        </p>
        <Button full onClick={savePin}>
          Salvar PIN
        </Button>
      </Modal>

      <ConfirmDialog
        open={lockDisableOpen}
        title="Desativar bloqueio"
        message="O aplicativo deixará de pedir o PIN ao abrir. Qualquer pessoa com acesso ao celular desbloqueado poderá ver seus registros. Deseja continuar?"
        confirmLabel="Desativar"
        onCancel={() => setLockDisableOpen(false)}
        onConfirm={disableLock}
      />

      <ConfirmDialog
        open={Boolean(restorePayload)}
        title="Restaurar backup"
        message={
          restorePayload
            ? `O arquivo "${restoreFileName}"${restorePayload.exportedAt ? ` (gerado em ${formatDateBR(restorePayload.exportedAt)})` : ''} contém ${restorePayload.total} registro(s)${restorePayload.skipped ? ` — ${restorePayload.skipped} inválido(s) serão ignorados` : ''}. Eles serão adicionados à sua conta sem apagar nada — registros já existentes (mesmo conteúdo) são ignorados. Deseja continuar?`
            : ''
        }
        confirmLabel={restoring ? 'Restaurando…' : 'Restaurar'}
        onCancel={() => {
          if (!restoring) {
            setRestorePayload(null);
            setRestoreFileName('');
          }
        }}
        onConfirm={runRestore}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Excluir conta"
        message="Esta ação exclui permanentemente sua conta e todos os seus registros (aplicações, medidas, diário, lembretes e estoque). Não é possível desfazer. Deseja continuar?"
        confirmLabel="Excluir definitivamente"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={deleteAccount}
      />
    </div>
  );
}
