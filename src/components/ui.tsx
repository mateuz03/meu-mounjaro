import React, { useEffect, useId, useRef } from 'react';

// ---------- icons ----------
type IconProps = { size?: number };
const svg = (path: React.ReactNode, viewBox = '0 0 24 24') =>
  function Icon({ size = 22 }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {path}
      </svg>
    );
  };

export const IconHome = svg(<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" /></>);
export const IconSyringe = svg(<><path d="m18 2 4 4" /><path d="m17 7 3-3" /><path d="M19 5 9 15l-4 1 1-4L16 2z" /><path d="m13 6 2 2" /><path d="M6 18l-3 3" /></>);
export const IconChart = svg(<><path d="M3 3v18h18" /><path d="m7 14 4-5 3 3 5-7" /></>);
export const IconBook = svg(<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>);
export const IconUser = svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" /></>);
export const IconPlus = svg(<><path d="M12 5v14" /><path d="M5 12h14" /></>);
export const IconScale = svg(<><path d="M12 3v3" /><path d="M4 6h16l-2 5a4.5 4.5 0 0 0-12 0z" transform="rotate(180 12 12)" /><path d="M7 21h10" /></>);
export const IconEdit = svg(<><path d="M11 4H4v16h16v-7" /><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" /></>);
export const IconTrash = svg(<><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></>);
export const IconCalendar = svg(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>);
export const IconDrop = svg(<><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /></>);
export const IconMoon = svg(<><path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" /></>);
export const IconInfo = svg(<><circle cx="12" cy="12" r="9" /><path d="M12 8h.01" /><path d="M12 11v5" /></>);
export const IconAlert = svg(<><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17h.01" /></>);
export const IconCheck = svg(<path d="m4 12 5 5L20 6" />);
export const IconUndo = svg(<><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 6 6v1" /></>);
export const IconX = svg(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
export const IconDownload = svg(<><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 21h16" /></>);
export const IconPrint = svg(<><path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M6 14h12v7H6z" /></>);
export const IconPill = svg(<><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-45 12 12)" /><path d="m8.5 8.5 7 7" /></>);
export const IconClock = svg(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const IconLogout = svg(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>);
export const IconChevronLeft = svg(<path d="m15 18-6-6 6-6" />);
export const IconChevronRight = svg(<path d="m9 18 6-6-6-6" />);
export const IconNote = svg(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h4" /></>);
export const IconBox = svg(<><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="m3 8 9 5 9-5" /><path d="M12 13v8" /></>);
export const IconDumbbell = svg(<><path d="M6.5 6.5v11M17.5 6.5v11" /><path d="M3 9v6M21 9v6" /><path d="M6.5 12h11" /></>);
export const IconActivity = svg(<><circle cx="13" cy="4.5" r="1.5" /><path d="m10 21 2.5-6 2.5-2 1.5-4" /><path d="M8.5 13 11 9l3 1.5 2 2.5 3 .5" /><path d="M9.5 21h4.5" /></>);
export const IconRepeat = svg(<><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></>);
export const IconApple = svg(<><path d="M12 7c-3.5-2-7 .5-7 4.5 0 4 2.5 7.5 5 7.5 1 0 1.5-.5 2-.5s1 .5 2 .5c2.5 0 5-3.5 5-7.5 0-4-3.5-6.5-7-4.5" /><path d="M12 7c0-2 1-3.5 3-4" /></>);
export const IconCart = svg(<><circle cx="9" cy="20" r="1.5" /><circle cx="17" cy="20" r="1.5" /><path d="M3 3h2l2.6 12.4a1 1 0 0 0 1 .6h8.6a1 1 0 0 0 1-.8L21 8H6" /></>);
export const IconListChecks = svg(<><path d="m3 6 2 2 3-3M3 13l2 2 3-3M3 20l2 2 3-3" /><path d="M12 7h9M12 14h9M12 21h9" /></>);

// ---------- primitives ----------
export function Card({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div className={`card ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="section-title">
      <h2>{children}</h2>
      {action}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  className = '',
  full,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
  full?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant} ${full ? 'btn-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
  required,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <span className="req"> *</span>}
      </span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

// ---------- dialog accessibility ----------
// Comportamento compartilhado por Modal e ConfirmDialog:
// - Escape fecha (onClose)
// - foco entra no diálogo ao abrir e fica preso (Tab/Shift+Tab) enquanto aberto
// - foco retorna ao elemento que abriu o diálogo ao fechar
// - rolagem do corpo travada enquanto aberto
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useDialogA11y(
  open: boolean,
  onClose: () => void,
  ref: React.RefObject<HTMLDivElement | null>,
) {
  // onClose em ref: evita re-executar o efeito (e "puxar" o foco de volta)
  // quando o pai re-renderiza com outra instância da callback.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const dlg = ref.current;
    const active = document.activeElement as HTMLElement | null;
    if (active && dlg && !dlg.contains(active)) {
      restoreRef.current = active;
    }
    if (dlg) {
      const first = dlg.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? dlg).focus();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !ref.current) return;
      const items = Array.from(
        ref.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (e.shiftKey && (current === first || !ref.current.contains(current))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || !ref.current.contains(current))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      restoreRef.current?.focus?.();
      restoreRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogA11y(open, onClose, dialogRef);

  if (!open) return null;
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className={`modal ${wide ? 'modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal-head">
          <h3 id={titleId}>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            <IconX />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Excluir',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogA11y(open, onCancel, dialogRef);

  if (!open) return null;
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div
        ref={dialogRef}
        className="modal modal-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <h3 id={titleId}>{title}</h3>
        <p>{message}</p>
        <div className="confirm-actions">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-icon">{icon}</div>}
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}

export function RatingScale({
  label,
  value,
  onChange,
  labels,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  labels?: [string, string];
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  // Padrão WAI-ARIA radiogroup: apenas a opção selecionada entra na ordem de
  // Tab (a primeira quando nada foi escolhido); setas movem e selecionam.
  const tabStop = value ?? 1;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, n: number) => {
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(5, n + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(1, n - 1);
    else if (e.key === 'Home') next = 1;
    else if (e.key === 'End') next = 5;
    if (next != null) {
      e.preventDefault();
      onChange(next);
      refs.current[next - 1]?.focus();
    }
  };

  return (
    <div className="rating-scale">
      <div className="rating-head">
        <span className="field-label">{label}</span>
        {labels && (
          <span className="rating-bounds">
            {labels[0]} → {labels[1]}
          </span>
        )}
      </div>
      <div className="rating-dots" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            ref={(el) => {
              refs.current[n - 1] = el;
            }}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={labels ? `${n} (${n <= 3 ? labels[0] : labels[1]})` : String(n)}
            tabIndex={n === tabStop ? 0 : -1}
            className={`rating-dot ${value != null && n <= value ? 'active' : ''}`}
            onClick={() => onChange(n)}
            onKeyDown={(e) => handleKeyDown(e, n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Disclaimer({ children, variant = 'info' }: { children: React.ReactNode; variant?: 'info' | 'warn' }) {
  return (
    <div className={`disclaimer disclaimer-${variant}`}>
      {variant === 'warn' ? <IconAlert size={18} /> : <IconInfo size={18} />}
      <p>{children}</p>
    </div>
  );
}

export function Toasts({ toasts }: { toasts: { id: number; text: string; kind: string }[] }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          {t.kind === 'success' ? <IconCheck size={16} /> : t.kind === 'error' ? <IconAlert size={16} /> : <IconInfo size={16} />}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

export function Spinner() {
  return <div className="spinner" aria-label="Carregando" />;
}

export function Tag({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'info' }) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}
