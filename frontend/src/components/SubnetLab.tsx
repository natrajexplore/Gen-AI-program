import { Fragment, useState } from "react";
import { calcSubnet, type SubnetResult } from "../lib/subnet";

export function SubnetLab() {
  const [input, setInput] = useState("192.168.10.77/26");
  const [shown, setShown] = useState<Exclude<SubnetResult, { error: string }>>(() => calcSubnet("192.168.10.77/26") as Exclude<SubnetResult, { error: string }>);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = calcSubnet(input);
    if ("error" in r) { setError(r.error); return; }
    setError(null);
    setShown(r);
  }

  // Binary view: network bits in amber, host bits dimmed.
  const bin = ("0".repeat(32) + (shown.ip >>> 0).toString(2)).slice(-32);

  return (
    <div className="lab">
      <form id="subnet-form" className="lab-form" onSubmit={submit}>
        <label htmlFor="cidr-input">Address / prefix</label>
        <div className="lab-row">
          <input id="cidr-input" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} autoComplete="off" />
          <button type="submit" className="btn">Calculate</button>
        </div>
        <p className="lab-error" hidden={!error}>{error}</p>
      </form>
      <div className="lab-out">
        <dl className="kv">
          {shown.rows.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}
        </dl>
        <div className="bits">
          {[0, 1, 2, 3].map((o) => (
            <Fragment key={o}>
              {Array.from({ length: 8 }, (_, b) => {
                const i = o * 8 + b;
                return <span key={i} className={i < shown.prefix ? "net" : "host"}>{bin[i]}</span>;
              })}
              {o < 3 && "."}
            </Fragment>
          ))}
          {"   /" + shown.prefix + " = " + shown.prefix + " network bits · " + (32 - shown.prefix) + " host bits"}
        </div>
      </div>
    </div>
  );
}
