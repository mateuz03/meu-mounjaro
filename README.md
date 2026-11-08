# Meu Mounjaro

Diário pessoal de acompanhamento do uso de Mounjaro (tirzepatida), com módulos de **Mounjaro** (aplicações, evolução corporal, diário, lembretes, estoque), **Fitness** (treinos de academia, esportes, rotina semanal e peso) e **Dieta** (cardápio semanal, refeições, evolução de calorias e lista de compras).

> Esta aplicação é um diário pessoal de acompanhamento e não oferece diagnóstico, prescrição ou orientação médica. Não altere dose, frequência ou tratamento com base nas informações exibidas. Decisões sobre o uso do medicamento devem ser tomadas com o profissional de saúde responsável.

## Stack

- **Front-end**: React 19 + TypeScript + Vite 6
- **Backend**: Supabase (PostgreSQL + Row Level Security + Auth + Storage)
- **Mobile**: PWA + APK Android via Capacitor 6

## Configuração

As credenciais públicas do Supabase ficam em `src/lib/supabase.ts` (URL + chave publishable — são dados públicos por design; chaves de serviço nunca vão no código-fonte).

```bash
npm install
npm run dev       # desenvolvimento
npm run build     # build de produção (dist/)
npm test          # testes unitários + paridade cliente↔esquema
```

## Migrações do Supabase

O esquema vive em `supabase/migrations/` (canônica) e é espelhado em `.verdent/supabase/migrations/` (histórico aplicado pela plataforma Verdent — não editar). **Nova migração = adicionar nas duas pastas.**

| Arquivo | Conteúdo |
|---|---|
| `0001_init.sql` | Esquema inicial (9 tabelas Mounjaro + RLS) |
| `0002_reminders_dose_and_account_deletion.sql` | Dose no lembrete + exclusão de conta |
| `0003_fitness_module.sql` | Tabelas `gym_*`, `sport_*`, `fitness_*` |
| `0004_diet_module.sql` | Tabelas `diet_*` |
| `0005_constraints_indexes.sql` | Checks numéricos, FKs compostas (propriedade entre tabelas) e índices `(user_id, data)` |
| `0006_storage_bucket.sql` | Bucket privado `user-files` (fotos de perfil/evolução) com RLS por usuário |

Aplicar manualmente (SQL Editor do Supabase) na ordem, ou via `supabase db push`. O teste `tests/tables.test.ts` garante que todas as colunas consultadas pelo app existem no esquema criado pelas migrações.

### Segurança de dados

- **RLS em todas as tabelas**: cada usuário só lê/escreve `user_id = auth.uid()`.
- **FKs compostas** (0005): registros só referenciam dados do mesmo usuário (ex.: aplicação → estoque, exercício → treino).
- **Storage privado**: fotos ficam em `photos/{uid}/...` no bucket `user-files`; só o dono acessa (URLs assinadas).

#### Teste de isolamento entre usuários (manual)

Com dois usuários A e B criados no Supabase Auth, rode no SQL Editor simulando cada um (`select auth.uid()` não é simulável; use duas sessões do app ou tokens distintos) e confirme que B não vê nem altera dados de A. O roteiro completo: criar registro com A → tentar `select`, `update` e `delete` do mesmo `id` com B → todas as operações devem retornar 0 linhas/erro de RLS. Repita para as relações entre tabelas (aplicação de A apontando para estoque de B deve falhar por FK composta).

## PWA vs APK

| | PWA (site publicado) | APK (Capacitor) |
|---|---|---|
| Atualização | Imediata ao publicar | Exige novo build + reinstalação |
| Assets | Servidos pelo servidor | Embutidos no APK (`npx cap sync android`) |
| Notificações | Locais do navegador | Nativas via `@capacitor/local-notifications` |
| Google Login | `server.url` não usado → abre no navegador do sistema | Precisa de SHA-1 do keystore no Supabase Auth |

Build do APK (requer Android SDK + JDK 17):

```bash
npm run build
npx cap sync android
cd android && gradlew assembleRelease   # android/app/build/outputs/apk/release/
```

O keystore de release fica em `android/keystore/` (fora do Git).

## Testes e CI

- `npm test` roda [vitest](https://vitest.dev/) com testes de `parseBackup` (validação do formato de backup), classificação de erros de banco (`dbErrors`) e paridade cliente↔esquema.
- CI no GitHub Actions (`.github/workflows/ci.yml`): `npm ci` → `npm run build` → `vitest run` em Node 20.

## Privacidade (LGPD)

- Nenhum dado exposto publicamente; acesso só com autenticação.
- Exportação/exclusão dos próprios dados no Perfil (JSON).
- Sem dados pessoais em URLs ou logs (erros logados contêm só código/mensagem do banco).
- Política de privacidade: `public/privacy-policy.html`.
