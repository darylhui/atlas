import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { create } from 'zustand';
import { ChevronLeft, ChevronRight, Minus, Plus, Search, TrendingDown, TrendingUp, X } from 'lucide-react';
import type { Zone } from '../lib/analytics/recovery';
import { initials } from '../lib/util';

// ---------- Page scaffolding ----------

export function Page({
  title,
  subtitle,
  back,
  actions,
  compact,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: string | boolean;
  actions?: ReactNode;
  compact?: boolean;
  children: ReactNode;
}) {
  const nav = useNavigate();
  const headRef = useRef<HTMLElement>(null);
  // Publish the sticky header's height so sticky sub-navigation can sit just below it.
  useEffect(() => {
    const el = headRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--head-h', `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const backBtn = back && (
    <button className="back-btn" aria-label="Back" onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}>
      <ChevronLeft size={26} strokeWidth={2.2} aria-hidden />
    </button>
  );
  return (
    <>
      <header ref={headRef} className={`page-head${compact ? ' compact' : ''}`}>
        {compact && back ? (
          // iOS inline bar: back · centered title · actions
          <div className="nav-bar">
            <div>{backBtn}</div>
            <div className="nav-title">
              <h1 className="page-title truncate">{title}</h1>
              {subtitle && <div className="page-sub truncate">{subtitle}</div>}
            </div>
            <div className="head-actions">{actions}</div>
          </div>
        ) : (
          <>
            {back && (
              <div className="page-head-row">
                {backBtn}
                {actions && <div className="head-actions">{actions}</div>}
              </div>
            )}
            <div className="page-head-row">
              <div className="grow">
                <h1 className="page-title truncate">{title}</h1>
                {subtitle && <div className="page-sub">{subtitle}</div>}
              </div>
              {!back && actions && <div className="head-actions">{actions}</div>}
            </div>
          </>
        )}
      </header>
      <div className="stack-lg mt-1">{children}</div>
    </>
  );
}

export function Section({ title, action, children }: { title: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="section-head">
        <h2 className="section-title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Card({ children, className = '', onClick, style }: { children: ReactNode; className?: string; onClick?: () => void; style?: React.CSSProperties }) {
  if (onClick)
    return (
      <button className={`card card-press ${className}`} onClick={onClick} style={style}>
        {children}
      </button>
    );
  return (
    <div className={`card ${className}`} style={style}>
      {children}
    </div>
  );
}

export function ListItem({
  icon,
  title,
  subtitle,
  right,
  onClick,
  chevron = !!onClick,
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  chevron?: boolean;
}) {
  const inner = (
    <>
      {icon}
      <div className="grow">
        <div className="truncate" style={{ fontWeight: 600 }}>
          {title}
        </div>
        {subtitle && <div className="small faint truncate">{subtitle}</div>}
      </div>
      {right}
      {chevron && <ChevronRight size={18} className="chev" />}
    </>
  );
  return onClick ? (
    <button className="list-item" onClick={onClick}>
      {inner}
    </button>
  ) : (
    <div className="list-item">{inner}</div>
  );
}

export function Empty({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {children && <div className="small">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ---------- Stats ----------

export function Stat({
  label,
  value,
  unit,
  delta,
  icon,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: string;
  delta?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="stat">
      <div className="stat-label">
        {icon}
        {label}
      </div>
      <div className="stat-value">
        {value}
        {unit && <span className="stat-unit">{unit}</span>}
      </div>
      {delta && <div className="stat-delta">{delta}</div>}
    </div>
  );
}

export function Delta({ value, goodWhen = 'up', suffix = '', dp = 1, label }: { value: number; goodWhen?: 'up' | 'down' | 'none'; suffix?: string; dp?: number; label?: string }) {
  const r = Math.round(value * 10 ** dp) / 10 ** dp;
  const good = goodWhen === 'none' ? undefined : goodWhen === 'up' ? r > 0 : r < 0;
  const cls = r === 0 || good === undefined ? '' : good ? 'delta-good' : 'delta-bad';
  return (
    <span className={cls} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {r > 0 ? <TrendingUp size={14} /> : r < 0 ? <TrendingDown size={14} /> : <Minus size={14} />} {Math.abs(r).toLocaleString()}
      {suffix}
      {label && <span className="faint"> {label}</span>}
    </span>
  );
}

// ---------- Buttons & inputs ----------

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  block?: boolean;
};

export function Button({ variant = 'secondary', size = 'md', block, className = '', ...rest }: BtnProps) {
  return <button className={`btn btn-${variant}${size === 'sm' ? ' btn-sm' : ''}${block ? ' btn-block' : ''} ${className}`} {...rest} />;
}

export function IconButton({ label, className = '', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button aria-label={label} title={label} className={`icon-btn ${className}`} {...rest} />;
}

export function Field({ label, children, hint }: { label: ReactNode; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="xs faint" style={{ paddingLeft: 2 }}>{hint}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}

/** Numeric text input that keeps a local string so users can type "72." etc. */
export function NumberInput({
  value,
  onChange,
  suffix,
  decimal = true,
  placeholder,
  className = 'input',
  ...rest
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  suffix?: string;
  decimal?: boolean;
  placeholder?: string;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [text, setText] = useState(value == null ? '' : String(value));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(value == null ? '' : String(value));
    }
  }, [value]);
  const input = (
    <input
      {...rest}
      className={className}
      inputMode={decimal ? 'decimal' : 'numeric'}
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        const t = e.target.value.replace(',', '.');
        if (t !== '' && !/^-?\d*\.?\d*$/.test(t)) return;
        setText(t);
        const n = t === '' || t === '.' || t === '-' ? undefined : Number(t);
        last.current = n;
        onChange(n);
      }}
    />
  );
  if (!suffix) return input;
  return (
    <div className="input-suffix">
      {input}
      <span>{suffix}</span>
    </div>
  );
}

export function Select<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="search">
      <Search size={18} />
      <input className="input" type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[] }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chips<T extends string>({ value, onChange, options, wrap }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; wrap?: boolean }) {
  return (
    <div className={`chips${wrap ? ' wrap-chips' : ''}`}>
      {options.map((o) => (
        <button key={o.value} className={`chip${value === o.value ? ' on' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button role="switch" aria-checked={on} aria-label={label} className={`toggle${on ? ' on' : ''}`} onClick={() => onChange(!on)} />;
}

export function Stepper({ value, onChange, step = 1, min = 0, max = 999, format }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; format?: (v: number) => ReactNode }) {
  const fix = (v: number) => Math.round(v * 100) / 100;
  return (
    <div className="stepper">
      <IconButton label="Decrease" onClick={() => onChange(fix(Math.max(min, value - step)))}>
        <Minus size={18} />
      </IconButton>
      <div className="val">{format ? format(value) : value}</div>
      <IconButton label="Increase" onClick={() => onChange(fix(Math.min(max, value + step)))}>
        <Plus size={18} />
      </IconButton>
    </div>
  );
}

/** Five-point scale picker; each option shows its value above the label. */
export function Scale({ value, onChange, labels }: { value: number; onChange: (v: number) => void; labels: string[] }) {
  return (
    <div className="scale">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} className={value === n ? 'on' : ''} onClick={() => onChange(n)} aria-pressed={value === n}>
          <span className="emo">{n}</span>
          {labels[n - 1]}
        </button>
      ))}
    </div>
  );
}

// ---------- Visual atoms ----------

export function Avatar({ name, color, size = 40 }: { name: string; color: string; size?: number }) {
  return (
    <div className="avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}>
      {initials(name)}
    </div>
  );
}

export function ZonePill({ zone, children }: { zone: Zone | 'low'; children: ReactNode }) {
  return (
    <span className={`pill ${zone}`}>
      <span className="dot" style={{ background: `var(--${zone})` }} />
      {children}
    </span>
  );
}

export function Progress({ pct, color }: { pct: number; color?: string }) {
  return (
    <div className="bar-track" role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="bar-fill" style={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%`, background: color }} />
    </div>
  );
}

export function Ring({
  pct,
  size = 120,
  stroke = 10,
  color = 'var(--accent)',
  track = 'var(--surface-3)',
  children,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return (
    <div className="ring" style={{ width: size, height: size, fontSize: size / 5.2 }}>
      <svg width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * p} ${c}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="ring-label">{children}</div>
    </div>
  );
}

// ---------- Sheet ----------

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className={`sheet${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <div className="sheet-title">{title}</div>
          <IconButton label="Close" onClick={onClose}>
            <X size={20} strokeWidth={2.4} />
          </IconButton>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ---------- Toasts & confirm ----------

interface ToastState {
  msg?: { id: number; text: ReactNode };
  show: (text: ReactNode) => void;
}

export const useToast = create<ToastState>((set) => ({
  show(text) {
    const id = Date.now();
    set({ msg: { id, text } });
    setTimeout(() => set((s) => (s.msg?.id === id ? { msg: undefined } : s)), 2600);
  },
}));

export const toast = (text: ReactNode) => useToast.getState().show(text);

export function ToastHost() {
  const msg = useToast((s) => s.msg);
  if (!msg) return null;
  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      <div className="toast" key={msg.id}>
        {msg.text}
      </div>
    </div>
  );
}

interface ConfirmState {
  req?: { title: string; body?: string; confirm: string; danger?: boolean; resolve: (ok: boolean) => void };
}

const useConfirm = create<ConfirmState>(() => ({}));

export function confirmDialog(opts: { title: string; body?: string; confirm?: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirm.setState({ req: { confirm: 'Confirm', ...opts, resolve } });
  });
}

export function ConfirmHost() {
  const req = useConfirm((s) => s.req);
  const close = (ok: boolean) => {
    req?.resolve(ok);
    useConfirm.setState({ req: undefined });
  };
  return (
    <Sheet
      open={!!req}
      onClose={() => close(false)}
      title={req?.title ?? ''}
      footer={
        <>
          <Button block onClick={() => close(false)}>
            Cancel
          </Button>
          <Button block variant={req?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
            {req?.confirm}
          </Button>
        </>
      }
    >
      {req?.body && <p className="muted">{req.body}</p>}
    </Sheet>
  );
}

// ---------- Hooks ----------

export function useElementWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(el);
    setW(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
