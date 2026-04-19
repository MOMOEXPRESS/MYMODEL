"use client";

// Motion-driven number counter — counts up on mount with a soft spring,
// à la Emil Kowalski's dashboard animations. Accepts optional prefix (for
// currency) and formats with locale thousands separators by default.

import { animate, useMotionValue, useTransform, motion } from "motion/react";
import { useEffect } from "react";

export function AnimatedNumber({
  value,
  prefix,
  suffix,
  className,
  decimals = 0,
  duration = 0.9,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  decimals?: number;
  duration?: number;
}) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) =>
    `${prefix ?? ""}${v.toLocaleString(undefined, {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    })}${suffix ?? ""}`,
  );

  useEffect(() => {
    const controls = animate(mv, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [mv, value, duration]);

  return <motion.span className={className}>{rounded}</motion.span>;
}
