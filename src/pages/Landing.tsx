import React from 'react';
import { useApp } from '../context/AppContext';
import { Button, Disclaimer, IconSyringe, IconChart, IconBook, IconScale } from '../components/ui';
import { MANDATORY_DISCLAIMER } from '../lib/helpers';

export function Landing() {
  const { openAuth, startDemo } = useApp();

  return (
    <div className="landing">
      <div className="landing-card">
        <div className="brand landing-brand">
          <div className="brand-mark">M</div>
          <div>
            <strong>Meu Mounjaro</strong>
            <span>Diário pessoal de acompanhamento</span>
          </div>
        </div>
        <h1>
          Acompanhe seu tratamento com <em>organização</em> e <em>tranquilidade</em>
        </h1>
        <p className="landing-sub">
          Registre suas aplicações, peso, medidas e como você se sente — tudo em um só lugar,
          privado e protegido por senha. Seus dados pertencem apenas a você.
        </p>
        <div className="landing-features">
          <div className="feature">
            <IconSyringe />
            <div>
              <strong>Aplicações</strong>
              <span>Histórico com dose, local e lote</span>
            </div>
          </div>
          <div className="feature">
            <IconScale />
            <div>
              <strong>Evolução corporal</strong>
              <span>Peso, medidas e gráficos claros</span>
            </div>
          </div>
          <div className="feature">
            <IconBook />
            <div>
              <strong>Diário</strong>
              <span>Fome, energia, sono e efeitos</span>
            </div>
          </div>
          <div className="feature">
            <IconChart />
            <div>
              <strong>Resumo para consulta</strong>
              <span>Relatório para levar ao médico</span>
            </div>
          </div>
        </div>
        <Disclaimer>{MANDATORY_DISCLAIMER}</Disclaimer>
        <div className="landing-actions">
          <Button onClick={openAuth} full>
            Entrar ou criar conta
          </Button>
          <Button variant="ghost" onClick={startDemo} full>
            Ver demonstração com dados fictícios
          </Button>
        </div>
        <p className="landing-foot">
          Uso pessoal e privado. Não recomendamos doses, nem alteramos tratamentos, nem substituímos
          acompanhamento médico.
        </p>
      </div>
    </div>
  );
}
