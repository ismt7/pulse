const shapes = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  arrow: <path d="m7 17 10-10M7 7h10v10" />,
  check: <path d="m5 12 4 4L19 6" />,
  leaf: (
    <>
      <path d="M20 4C8 1 2 9 6 16s15 1 14-12Z" />
      <path d="m4 21 11-12" />
    </>
  ),
  download: <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />,
  edit: <path d="m15 5 4 4M4 20l5-1L21 7l-4-4L5 15Z" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  book: (
    <path d="M12 6v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v14c-4-1-6 0-9 3-3-3-5-4-9-3Z" />
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1" />
    </>
  ),
  spark: <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" />,
  flag: <path d="M5 21V4c5-4 9 4 14 0v10c-5 4-9-4-14 0" />,
};
export type IconName = keyof typeof shapes;
export const metricIcons: IconName[] = ["book", "sun", "spark", "flag"];

export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shapes[name]}
    </svg>
  );
}
