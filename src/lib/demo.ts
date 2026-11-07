import { addDays, todayISO } from './helpers';
import type { AppData } from './types';

/**
 * Fictitious data used only for the pre-login "Ver demonstração" preview.
 * Real user data always replaces it once authenticated.
 */
export function buildDemoData(): AppData {
  const today = todayISO();
  const uid = 'demo';
  const ts = new Date().toISOString();

  const applications = [] as AppData['applications'];
  const measurements = [] as AppData['measurements'];
  const logs = [] as AppData['logs'];
  const effects = [] as AppData['effects'];

  // 10 weekly applications over the last ~9 weeks
  const doses = [2.5, 2.5, 2.5, 2.5, 5, 5, 5, 5, 5, 5];
  const sites = ['Abdômen', 'Coxa', 'Abdômen', 'Braço', 'Abdômen', 'Coxa'];
  for (let i = 9; i >= 0; i--) {
    const d = addDays(today, -7 * i);
    applications.push({
      id: `demo-app-${i}`,
      user_id: uid,
      application_date: d,
      application_time: '08:30',
      dose: doses[9 - i],
      dose_unit: 'mg',
      injection_site: sites[(9 - i) % sites.length],
      body_side: (9 - i) % 2 === 0 ? 'Esquerdo' : 'Direito',
      lot_number: 'LMX7842',
      lot_expiry: addDays(today, 200),
      prescribed_confirmed: true,
      notes: null,
      inventory_id: null,
      created_at: ts,
      updated_at: ts,
    });
  }

  // weight evolution ~ 0.8kg/week gentle
  for (let i = 63; i >= 0; i -= 7) {
    const d = addDays(today, -i);
    const w = 92 - ((63 - i) / 7) * 0.8;
    measurements.push({
      id: `demo-m-${i}`,
      user_id: uid,
      entry_date: d,
      weight_kg: Math.round(w * 10) / 10,
      abdominal_circ_cm: Math.round((108 - ((63 - i) / 7) * 0.9) * 10) / 10,
      waist_circ_cm: Math.round((98 - ((63 - i) / 7) * 0.8) * 10) / 10,
      hip_circ_cm: 112,
      chest_circ_cm: null,
      arm_circ_cm: null,
      thigh_circ_cm: null,
      body_fat_pct: null,
      photo_url: null,
      notes: null,
      created_at: ts,
      updated_at: ts,
    });
  }

  // recent daily logs
  for (let i = 4; i >= 0; i--) {
    const d = addDays(today, -i);
    logs.push({
      id: `demo-log-${i}`,
      user_id: uid,
      log_date: d,
      hunger_level: 2,
      satiety_level: 4,
      energy_level: i === 1 ? 2 : 3,
      mood_level: 4,
      water_ml: 1800 + i * 100,
      sleep_quality: 3,
      sleep_hours: 7,
      physical_activity: i % 2 === 0 ? 'Caminhada 30 min' : null,
      food_notes: 'Café da manhã: ovo e fruta. Almoço: salada e frango. Jantar: sopa.',
      notes: null,
      created_at: ts,
      updated_at: ts,
    });
    if (i === 2) {
      effects.push({
        id: `demo-ef-${i}`,
        user_id: uid,
        occurred_on: d,
        name: 'Náusea',
        intensity: 'leve',
        approx_time: '11:00',
        duration_text: 'Cerca de 2 horas',
        status: 'encerrado',
        notes: null,
        created_at: ts,
        updated_at: ts,
      });
    }
  }

  return {
    profile: {
      id: 'demo-profile',
      user_id: uid,
      full_name: 'Ana',
      avatar_url: null,
      treatment_start_date: addDays(today, -63),
      goal_weight_kg: 78,
      weight_unit: 'kg',
      length_unit: 'cm',
      reminders_enabled: true,
      reminder_lead_minutes: 60,
      created_at: ts,
      updated_at: ts,
    },
    applications,
    measurements,
    logs,
    effects,
    reminders: [
      {
        id: 'demo-rem-1',
        user_id: uid,
        title: 'Próxima aplicação',
        kind: 'aplicacao',
        remind_date: addDays(today, 3),
        remind_time: '08:30',
        lead_minutes: 60,
        notes: null,
        planned_dose: 5,
        planned_dose_unit: 'mg',
        is_done: false,
        created_at: ts,
        updated_at: ts,
      },
      {
        id: 'demo-rem-2',
        user_id: uid,
        title: 'Consulta de acompanhamento',
        kind: 'consulta',
        remind_date: addDays(today, 10),
        remind_time: '14:00',
        lead_minutes: 120,
        notes: 'Levar anotações do diário.',
        planned_dose: null,
        planned_dose_unit: null,
        is_done: false,
        created_at: ts,
        updated_at: ts,
      },
    ],
    appointments: [
      {
        id: 'demo-appt-1',
        user_id: uid,
        kind: 'consulta',
        appt_date: addDays(today, 10),
        appt_time: '14:00',
        professional: 'Dra. Marina',
        location: 'Clínica Central',
        notes: null,
        created_at: ts,
        updated_at: ts,
      },
    ],
    inventory: [
      {
        id: 'demo-inv-1',
        user_id: uid,
        product_name: 'Mounjaro 5 mg (caneta)',
        quantity_purchased: 4,
        quantity_available: 2,
        purchase_date: addDays(today, -30),
        expiry_date: addDays(today, 180),
        lot_number: 'LMX7842',
        storage_location: 'Geladeira (informado pelo usuário)',
        notes: null,
        created_at: ts,
        updated_at: ts,
      },
    ],
    notes: [
      {
        id: 'demo-note-1',
        user_id: uid,
        note_date: addDays(today, -2),
        category: 'pergunta',
        content: 'Perguntar sobre a enjoo persistente após as refeições.',
        created_at: ts,
        updated_at: ts,
      },
    ],
    gym_workouts: [
      {
        id: 'demo-gw-1',
        user_id: uid,
        workout_date: addDays(today, -2),
        workout_time: '07:00',
        title: 'Treino A — Superiores',
        notes: null,
        created_at: ts,
        updated_at: ts,
      },
    ],
    gym_exercise_entries: [
      { id: 'demo-ge-1', user_id: uid, workout_id: 'demo-gw-1', sort_order: 0, exercise_name: 'Supino reto', sets: 3, reps: 10, weight_kg: 30, notes: null, created_at: ts, updated_at: ts },
      { id: 'demo-ge-2', user_id: uid, workout_id: 'demo-gw-1', sort_order: 1, exercise_name: 'Puxada frontal', sets: 3, reps: 12, weight_kg: 40, notes: null, created_at: ts, updated_at: ts },
      { id: 'demo-ge-3', user_id: uid, workout_id: 'demo-gw-1', sort_order: 2, exercise_name: 'Desenvolvimento', sets: 3, reps: 10, weight_kg: 16, notes: null, created_at: ts, updated_at: ts },
    ],
    sport_activities: [
      {
        id: 'demo-sa-1',
        user_id: uid,
        activity_date: addDays(today, -1),
        sport_type: 'corrida',
        duration_minutes: 35,
        distance_km: 5,
        perceived_effort: 3,
        notes: null,
        created_at: ts,
        updated_at: ts,
      },
    ],
    fitness_routine_items: [
      { id: 'demo-fr-1', user_id: uid, weekday: 1, sort_order: 0, kind: 'academia', title: 'Superiores', exercise_name: 'Supino reto', sets: 3, reps: 10, target_weight_kg: 30, notes: null, created_at: ts, updated_at: ts },
      { id: 'demo-fr-2', user_id: uid, weekday: 1, sort_order: 1, kind: 'academia', title: 'Superiores', exercise_name: 'Puxada frontal', sets: 3, reps: 12, target_weight_kg: 40, notes: null, created_at: ts, updated_at: ts },
      { id: 'demo-fr-3', user_id: uid, weekday: 3, sort_order: 0, kind: 'esporte', title: 'Futebol com amigos', exercise_name: null, sets: null, reps: null, target_weight_kg: null, notes: 'Aprox. 1h30', created_at: ts, updated_at: ts },
      { id: 'demo-fr-4', user_id: uid, weekday: 5, sort_order: 0, kind: 'academia', title: 'Inferiores', exercise_name: 'Agachamento livre', sets: 4, reps: 10, target_weight_kg: 50, notes: null, created_at: ts, updated_at: ts },
    ],
    fitness_weight_logs: [
      { id: 'demo-fw-1', user_id: uid, entry_date: addDays(today, -63), weight_kg: 92, notes: null, created_at: ts, updated_at: ts },
      { id: 'demo-fw-2', user_id: uid, entry_date: addDays(today, -28), weight_kg: 89.4, notes: null, created_at: ts, updated_at: ts },
      { id: 'demo-fw-3', user_id: uid, entry_date: addDays(today, -7), weight_kg: 87.9, notes: null, created_at: ts, updated_at: ts },
    ],
    diet_menu_items: [
      { id: 'demo-dm-1', user_id: uid, weekday: 1, meal_slot: 'cafe_manha', sort_order: 0, name: 'Ovos mexidos com pão integral', description: '2 ovos + 2 fatias', calories: 320, created_at: ts, updated_at: ts },
      { id: 'demo-dm-2', user_id: uid, weekday: 1, meal_slot: 'almoco', sort_order: 0, name: 'Frango grelhado com arroz e salada', description: '150g de frango + 4col de arroz', calories: 560, created_at: ts, updated_at: ts },
      { id: 'demo-dm-3', user_id: uid, weekday: 1, meal_slot: 'cafe_tarde', sort_order: 0, name: 'Iogurte com frutas', description: '170g + 1 banana', calories: 210, created_at: ts, updated_at: ts },
    ],
    diet_meal_logs: [
      { id: 'demo-dl-1', user_id: uid, log_date: today, meal_slot: 'cafe_manha', menu_item_id: 'demo-dm-1', extra_name: null, calories: 320, notes: null, created_at: ts, updated_at: ts },
      { id: 'demo-dl-2', user_id: uid, log_date: today, meal_slot: 'almoco', menu_item_id: 'demo-dm-2', extra_name: null, calories: 560, notes: null, created_at: ts, updated_at: ts },
      { id: 'demo-dl-3', user_id: uid, log_date: addDays(today, -1), meal_slot: 'cafe_manha', menu_item_id: null, extra_name: 'Pão com queijo', calories: 280, notes: null, created_at: ts, updated_at: ts },
    ],
    diet_shopping_items: [
      { id: 'demo-ds-1', user_id: uid, name: 'Ovos', quantity: '1 dúzia', category: 'proteinas', is_checked: false, sort_order: 0, created_at: ts, updated_at: ts },
      { id: 'demo-ds-2', user_id: uid, name: 'Banana', quantity: '6 unidades', category: 'frutas', is_checked: false, sort_order: 1, created_at: ts, updated_at: ts },
      { id: 'demo-ds-3', user_id: uid, name: 'Pão integral', quantity: '1 pacote', category: 'padaria', is_checked: true, sort_order: 2, created_at: ts, updated_at: ts },
    ],
  };
}

export const emptyData: AppData = {
  profile: null,
  applications: [],
  measurements: [],
  logs: [],
  effects: [],
  reminders: [],
  appointments: [],
  inventory: [],
  notes: [],
  gym_workouts: [],
  gym_exercise_entries: [],
  sport_activities: [],
  fitness_routine_items: [],
  fitness_weight_logs: [],
  diet_menu_items: [],
  diet_meal_logs: [],
  diet_shopping_items: [],
};
