export function Stats({ pairs, id }: { pairs: [string, string][]; id?: string }) {
  return (
    <dl className="stats" id={id}>
      {pairs.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  );
}
