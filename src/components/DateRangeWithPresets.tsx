import React from 'react';
import { DateRangePicker, DateRange } from './DateRangePicker';

export interface DateRangeWithPresetsProps {
  initialRange?: DateRange;
  onApplyRange?: (range: { startIso: string; endIso: string; startDay: number; endDay: number }) => void;
  className?: string;
  allowFuture?: boolean;
}

export default function DateRangeWithPresets(props: DateRangeWithPresetsProps) {
  return <DateRangePicker {...props} />;
}

export { DateRangePicker };
