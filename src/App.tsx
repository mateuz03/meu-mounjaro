import React, { Suspense, lazy, useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { LockScreen } from './components/LockScreen';
import { Spinner } from './components/ui';
import { checkReminders, syncNativeReminders } from './lib/reminderNotifier';
import { hasLockPin, lockNow, markUnlocked, watchVisibility } from './lib/appLock';
import { Landing } from './pages/Landing';

const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Applications = lazy(() => import('./pages/Applications').then((m) => ({ default: m.Applications })));
const Evolution = lazy(() => import('./pages/Evolution').then((m) => ({ default: m.Evolution })));
const Diary = lazy(() => import('./pages/Diary').then((m) => ({ default: m.Diary })));
const ProfilePage = lazy(() => import('./pages/Profile').then((m) => ({ default: m.ProfilePage })));
const Inventory = lazy(() => import('./pages/Inventory').then((m) => ({ default: m.Inventory })));
const Report = lazy(() => import('./pages/Report').then((m) => ({ default: m.Report })));
const FitnessHome = lazy(() => import('./pages/FitnessHome').then((m) => ({ default: m.FitnessHome })));
const Training = lazy(() => import('./pages/Training').then((m) => ({ default: m.Training })));
const Routine = lazy(() => import('./pages/Routine').then((m) => ({ default: m.Routine })));
const Menu = lazy(() => import('./pages/Menu').then((m) => ({ default: m.Menu })));
const Meals = lazy(() => import('./pages/Meals').then((m) => ({ default: m.Meals })));
const DietEvolution = lazy(() => import('./pages/DietEvolution').then((m) => ({ default: m.DietEvolution })));
const Shopping = lazy(() => import('./pages/Shopping').then((m) => ({ default: m.Shopping })));

function Router() {
  const { tab } = useApp();
  return (
    <div key={tab} className="page-enter">
      {(() => {
        switch (tab) {
          case 'aplicacoes':
            return <Applications />;
          case 'evolucao':
            return <Evolution />;
          case 'diario':
            return <Diary />;
          case 'perfil':
            return <ProfilePage />;
          case 'relatorio':
            return <Report />;
          case 'estoque':
            return <Inventory />;
          case 'fitness-inicio':
            return <FitnessHome />;
          case 'treinos':
            return <Training />;
          case 'rotina':
            return <Routine />;
          case 'menu':
            return <Menu />;
          case 'refeicoes':
            return <Meals />;
          case 'evolucao-dieta':
            return <DietEvolution />;
          case 'compras':
            return <Shopping />;
          default:
            return <Dashboard />;
        }
      })()}
    </div>
  );
}

function Shell() {
  const { ready, session, demo, data, signOut } = useApp();
  const authed = Boolean(session) || demo;
  const [locked, setLocked] = useState(false);

  // Bloqueio de privacidade: exige PIN ao abrir o app (se configurado).
  useEffect(() => {
    if (!authed) {
      setLocked(false);
      return;
    }
    if (hasLockPin()) lockNow();
    setLocked(hasLockPin());
  }, [authed]);

  // Bloqueia novamente ao voltar para o app após ficar fora (sempre ou após 5 min).
  useEffect(() => {
    if (!authed) return;
    return watchVisibility(() => setLocked(true));
  }, [authed]);

  // APK: agenda notificações nativas (disparam com o app fechado).
  useEffect(() => {
    if (!session) return;
    const enabled = data.profile?.reminders_enabled !== false;
    void syncNativeReminders(data.reminders, enabled);
  }, [session, data.reminders, data.profile?.reminders_enabled]);

  // Navegador (PWA): verifica lembretes vencidos enquanto o app está aberto.
  useEffect(() => {
    if (!session) return;
    const enabled = data.profile?.reminders_enabled !== false;
    const run = () => {
      void checkReminders(data.reminders, enabled);
    };
    run();
    const iv = window.setInterval(run, 60000);
    return () => window.clearInterval(iv);
  }, [session, data.reminders, data.profile?.reminders_enabled]);

  if (!ready) {
    return (
      <div className="boot">
        <Spinner />
      </div>
    );
  }
  if (locked) {
    return <LockScreen onSuccess={() => { markUnlocked(); setLocked(false); }} onForgot={() => void signOut()} />;
  }
  return authed ? (
    <Layout>
      <Suspense
        fallback={
          <div className="boot">
            <Spinner />
          </div>
        }
      >
        <Router />
      </Suspense>
    </Layout>
  ) : (
    <Landing />
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
