import Link from 'next/link';
import { addMonths, monthLabel } from '@/lib/dates';
import { IconChevron } from './Icons';

export default function MonthPicker({ month, path, extra = '' }: { month: string; path: string; extra?: string }) {
  return (
    <div className="month-picker">
      <Link className="btn btn-sm btn-ghost icon-btn" href={`${path}?m=${addMonths(month, -1)}${extra}`} aria-label="Mês anterior"><IconChevron left /></Link>
      <strong>{monthLabel(month, true)}</strong>
      <Link className="btn btn-sm btn-ghost icon-btn" href={`${path}?m=${addMonths(month, 1)}${extra}`} aria-label="Próximo mês"><IconChevron /></Link>
    </div>
  );
}
