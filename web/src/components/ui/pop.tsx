// A count or badge that pops in, and again whenever it changes (DESIGN.md)
export function Pop({ value, className = "" }: { value?: number; className?: string }) {
  return <span key={value} className={`inline-block animate-pop ${className}`}>{value}</span>;
}
