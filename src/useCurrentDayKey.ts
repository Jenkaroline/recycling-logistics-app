import { useEffect, useState } from "react";

export function toLocalDayKey(value: string | Date = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getMsUntilNextLocalDay() {
  const now = new Date();
  const nextDay = new Date(now);
  nextDay.setHours(24, 0, 0, 0);
  return Math.max(0, nextDay.getTime() - now.getTime());
}

export function useCurrentDayKey() {
  const [dayKey, setDayKey] = useState(() => toLocalDayKey());

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const scheduleNextTick = () => {
      timeoutId = setTimeout(() => {
        setDayKey(toLocalDayKey());
        scheduleNextTick();
      }, getMsUntilNextLocalDay() + 50);
    };

    scheduleNextTick();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return dayKey;
}