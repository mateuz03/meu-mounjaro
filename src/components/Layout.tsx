import React, { useState } from 'react';
import { useApp, type Mode, type Tab } from '../context/AppContext';
import {
  IconHome,
  IconSyringe,
  IconChart,
  IconBook,
  IconUser,
  IconLogout,
  IconDumbbell,
  IconActivity,
  IconRepeat,
  IconApple,
  IconCart,
  IconListChecks,
  IconCheck,
  Toasts,
} from './ui';

interface TabDef {
  id: Tab;
  label: string;
  icon: React.ReactNode;
  mode: Mode;
}

const TABS: TabDef[] = [
  { id: 'inicio', label: 'Início', icon: <IconHome />, mode: 'mounjaro' },
  { id: 'aplicacoes', label: 'Aplicações', icon: <IconSyringe />, mode: 'mounjaro' },
  { id: 'evolucao', label: 'Evolução', icon: <IconChart />, mode: 'mounjaro' },
  { id: 'diario', label: 'Diário', icon: <IconBook />, mode: 'mounjaro' },
  { id: 'perfil', label: 'Perfil', icon: <IconUser />, mode: 'mounjaro' },
  { id: 'fitness-inicio', label: 'Início', icon: <IconHome />, mode: 'fitness' },
  { id: 'treinos', label: 'Treinos', icon: <IconDumbbell />, mode: 'fitness' },
  { id: 'rotina', label: 'Rotina', icon: <IconRepeat />, mode: 'fitness' },
  { id: 'perfil', label: 'Perfil', icon: <IconUser />, mode: 'fitness' },
  { id: 'menu', label: 'Menu', icon: <IconApple />, mode: 'dieta' },
  { id: 'refeicoes', label: 'Refeições', icon: <IconListChecks />, mode: 'dieta' },
  { id: 'evolucao-dieta', label: 'Evolução', icon: <IconChart />, mode: 'dieta' },
  { id: 'compras', label: 'Compras', icon: <IconCart />, mode: 'dieta' },
  { id: 'perfil', label: 'Perfil', icon: <IconUser />, mode: 'dieta' },
];

const GROUP_LABEL: Record<Mode, string> = {
  mounjaro: 'Acompanhamento Mounjaro',
  fitness: 'Acompanhamento Fitness',
  dieta: 'Acompanhamento Dieta',
};

const BRAND: Record<Mode, { name: string; sub: string }> = {
  mounjaro: { name: 'Meu Mounjaro', sub: 'Diário de tratamento' },
  fitness: { name: 'Meu Fitness', sub: 'Treinos e atividades' },
  dieta: { name: 'Minha Dieta', sub: 'Alimentação e rotina' },
};

const MODE_ICON: Record<Mode, React.ReactNode> = {
  mounjaro: <IconSyringe />,
  fitness: <IconDumbbell />,
  dieta: <IconApple />,
};

const MODE_NAME: Record<Mode, string> = {
  mounjaro: 'Mounjaro',
  fitness: 'Fitness',
  dieta: 'Dieta',
};

export function Layout({ children }: { children: React.ReactNode }) {
  const { tab, setTab, mode, setMode, data, demo, exitDemo, openAuth, signOut, toasts, session, offline } = useApp();

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const displayName = data.profile?.full_name || '';
  const email = session?.user?.email ?? '';
  const displayLabel = displayName || email || 'Usuário';
  const initial = displayName
    ? displayName.trim().charAt(0).toUpperCase()
    : email
      ? email.charAt(0).toUpperCase()
      : '?';
  const brand = BRAND[mode];

  const modeTabs = (m: Mode) => TABS.filter((t) => t.mode === m);
  const activeMode: Mode =
    TABS.find((t) => t.id === tab)?.mode ?? mode;
  const brandLetter = brand.name.charAt(0).toUpperCase();

  function selectArea(m: Mode) {
    setUserMenuOpen(false);
    setMode(m);
  }

  function goProfile() {
    setUserMenuOpen(false);
    setTab('perfil');
  }

  const NavButton = ({ t }: { t: TabDef }) => (
    <button
      key={`${t.mode}-${t.id}`}
      className={`side-nav-item ${activeMode === t.mode && tab === t.id ? 'active' : ''} ${activeMode !== t.mode ? 'dim' : ''}`}
      onClick={() => {
        if (t.mode !== activeMode) {
          setMode(t.mode);
          setTab(t.id === 'perfil' ? 'perfil' : t.id);
        } else {
          setTab(t.id);
        }
      }}
    >
      {t.icon}
      <span>{t.label}</span>
    </button>
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand brand-btn" onClick={() => setMode(activeMode)} title={GROUP_LABEL[activeMode]}>
          <div className={`brand-mark brand-${activeMode}`}>{brandLetter}</div>
          <div>
            <strong>{brand.name}</strong>
            <span>{brand.sub}</span>
          </div>
        </button>

        <nav className="side-nav">
          {(Object.keys(GROUP_LABEL) as Mode[]).map((m, i) => (
            <React.Fragment key={m}>
              {i > 0 && <div className="side-group-divider" role="separator" />}
              <div className={`side-group ${activeMode !== m ? 'dim' : ''}`}>
                <div className="side-group-label">{GROUP_LABEL[m]}</div>
                {modeTabs(m).map((t) => (
                  <NavButton key={`side-${t.mode}-${t.id}`} t={t} />
                ))}
              </div>
            </React.Fragment>
          ))}
        </nav>
        <div className="sidebar-foot">
          {demo && (
            <button className="chip chip-warn" onClick={exitDemo}>
              Sair da demonstração
            </button>
          )}
          {session && !demo && (
            <button className="side-nav-item" onClick={signOut}>
              <IconLogout />
              <span>Sair da conta</span>
            </button>
          )}
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div className="brand brand-mobile">
            <div className={`brand-mark brand-${activeMode}`}>{brandLetter}</div>
            <strong>{brand.name}</strong>
          </div>
          <div className="topbar-user">
            {demo && (
              <button
                className={`avatar-btn demo ${userMenuOpen ? 'active' : ''}`}
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-label="Abrir menu do usuário"
                aria-expanded={userMenuOpen}
                title="Demonstração"
              >
                D
              </button>
            )}
            {!demo && session && (
              <>
                <button
                  className={`avatar-btn ${userMenuOpen ? 'active' : ''}`}
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-label="Abrir menu do usuário"
                  aria-expanded={userMenuOpen}
                  title={displayLabel}
                >
                  {initial}
                </button>
                {userMenuOpen && (
                  <>
                    <div className="menu-overlay" onClick={() => setUserMenuOpen(false)} />
                    <div className="user-menu" role="menu" aria-label="Menu do usuário">
                      <div className="user-menu-head">
                        <div className="user-menu-avatar">{initial}</div>
                        <div className="user-menu-id">
                          <strong>{displayName || 'Bem-vindo(a)'}</strong>
                          {email && <span>{email}</span>}
                        </div>
                      </div>
                      <div className="user-menu-sep" role="separator" />
                      <div className="user-menu-label">Suas áreas</div>
                      {(Object.keys(GROUP_LABEL) as Mode[]).map((m) => (
                        <button
                          key={m}
                          className={`user-menu-area ${activeMode === m ? 'current' : ''}`}
                          role="menuitem"
                          onClick={() => selectArea(m)}
                        >
                          <span className={`area-mark area-${m}`}>{MODE_ICON[m]}</span>
                          <span className="area-text">
                            <strong>{MODE_NAME[m]}</strong>
                            <small>{GROUP_LABEL[m]}</small>
                          </span>
                          {activeMode === m && <IconCheck />}
                        </button>
                      ))}
                      <div className="user-menu-sep" role="separator" />
                      <button className="user-menu-foot" role="menuitem" onClick={goProfile}>
                        <IconUser /> Abrir perfil
                      </button>
                      <button className="user-menu-foot danger" role="menuitem" onClick={() => { setUserMenuOpen(false); signOut(); }}>
                        <IconLogout /> Sair da conta
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
            {demo && userMenuOpen && (
              <>
                <div className="menu-overlay" onClick={() => setUserMenuOpen(false)} />
                <div className="user-menu" role="menu" aria-label="Menu do usuário">
                  <div className="user-menu-head">
                    <div className="user-menu-avatar demo-avatar">D</div>
                    <div className="user-menu-id">
                      <strong>Demonstração</strong>
                      <span>Dados fictícios — nada é salvo</span>
                    </div>
                  </div>
                  <div className="user-menu-sep" role="separator" />
                  <div className="user-menu-label">Suas áreas</div>
                  {(Object.keys(GROUP_LABEL) as Mode[]).map((m) => (
                    <button
                      key={m}
                      className={`user-menu-area ${activeMode === m ? 'current' : ''}`}
                      role="menuitem"
                      onClick={() => selectArea(m)}
                    >
                      <span className={`area-mark area-${m}`}>{MODE_ICON[m]}</span>
                      <span className="area-text">
                        <strong>{MODE_NAME[m]}</strong>
                        <small>{GROUP_LABEL[m]}</small>
                      </span>
                      {activeMode === m && <IconCheck />}
                    </button>
                  ))}
                  <div className="user-menu-sep" role="separator" />
                  <button className="user-menu-foot" role="menuitem" onClick={() => { setUserMenuOpen(false); openAuth(); }}>
                    <IconUser /> Criar conta ou Entrar
                  </button>
                  <button className="user-menu-foot danger" role="menuitem" onClick={() => { setUserMenuOpen(false); exitDemo(); }}>
                    <IconLogout /> Sair da demonstração
                  </button>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="content">
          {offline && !demo && session && (
            <div className="offline-banner" role="status">
              <strong>Você está offline.</strong> Exibindo os dados salvos neste dispositivo.
              Consulta disponível; para registrar ou editar, reconecte-se.
            </div>
          )}
          {children}
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Navegação principal">
        {modeTabs(activeMode).map((t) => (
          <button
            key={`bottom-${t.id}`}
            className={`bottom-nav-item ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <Toasts toasts={toasts} />
    </div>
  );
}
