// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { LineChart, chartTrendText, type ChartPoint } from '../src/components/LineChart';

afterEach(cleanup);

const pts = (vals: [string, number][]): ChartPoint[] => vals.map(([date, value]) => ({ date, value }));

describe('chartTrendText', () => {
  it('descreve redução com valor e unidade', () => {
    const t = chartTrendText(pts([['2024-05-01', 80], ['2024-05-20', 78]]), 'kg');
    expect(t).toContain('redução de 2 kg');
  });

  it('descreve aumento com valor e unidade', () => {
    const t = chartTrendText(pts([['2024-05-01', 78], ['2024-05-20', 80.5]]), 'kg');
    expect(t).toContain('aumento de 2,5 kg');
  });

  it('descreve estabilidade quando não há variação', () => {
    const t = chartTrendText(pts([['2024-05-01', 80], ['2024-05-20', 80]]), 'kg');
    expect(t).toContain('sem variação');
  });

  it('retorna string vazia sem pontos', () => {
    expect(chartTrendText([], 'kg')).toBe('');
  });
});

describe('LineChart — acessibilidade', () => {
  const points = pts([
    ['2024-05-01', 80],
    ['2024-05-10', 79],
    ['2024-05-20', 78],
  ]);

  it('expõe role="img" com rótulo descritivo contendo métrica, período e tendência', () => {
    render(<LineChart title="Peso" points={points} unit="kg" goal={75} />);
    const svg = screen.getByRole('img');
    const label = svg.getAttribute('aria-label') ?? '';
    expect(label).toContain('Gráfico de peso');
    expect(label).toContain('3 registros entre 01/05/2024 e 20/05/2024');
    expect(label).toContain('redução de 2 kg');
    expect(label).toContain('Último valor registrado: 78 kg');
    expect(label).toContain('meta registrada: 75 kg');
  });

  it('vincula a tabela de dados via aria-describedby', () => {
    render(<LineChart title="Peso" points={points} unit="kg" />);
    const svg = screen.getByRole('img');
    const describedBy = svg.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).not.toBeNull();
  });

  it('oferece tabela acessível com todas as datas e valores', () => {
    render(<LineChart title="Peso" points={points} unit="kg" />);
    const summary = screen.getByText('Ver dados do gráfico (3 registros)');
    const table = document.querySelector('.chart-data table') as HTMLTableElement;
    expect(table).not.toBeNull();
    expect(within(table).getByText('Data')).toBeTruthy();
    expect(within(table).getByText('Peso (kg)')).toBeTruthy();
    for (const [date, value] of [['01/05/2024', '80'], ['10/05/2024', '79'], ['20/05/2024', '78']] as const) {
      expect(within(table).getByText(date)).toBeTruthy();
      expect(within(table).getByText(value)).toBeTruthy();
    }
    expect(summary.tagName).toBe('SUMMARY');
  });

  it('não renderiza nada sem pontos', () => {
    const { container } = render(<LineChart title="Peso" points={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
