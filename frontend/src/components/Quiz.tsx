import { useEffect, useRef, useState } from "react";
import { useProgress } from "../lib/progress";
import type { Domain } from "../types";

export function Quiz({ d }: { d: Domain }) {
  const { recordQuiz } = useProgress();
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { if (picked !== null) nextRef.current?.focus(); }, [picked]);

  if (finished) {
    const pct = score / d.quiz.length;
    return (
      <div className="panel">
        <h3>Check yourself</h3>
        <p className="quiz-q">You scored {score} out of {d.quiz.length}.</p>
        <p className="why">{pct === 1 ? "Perfect score. Try a domain from one of the learning paths next." : "Go back over the lessons for the questions you missed, then retake the quiz."}</p>
        <button type="button" className="btn" onClick={() => { setI(0); setScore(0); setPicked(null); setFinished(false); }}>Retake quiz</button>
      </div>
    );
  }

  const item = d.quiz[i];
  const answered = picked !== null;

  function choose(oi: number) {
    if (answered) return;
    setPicked(oi);
    if (oi === item.a) setScore(score + 1);
  }
  function next() {
    setPicked(null);
    if (i + 1 >= d.quiz.length) {
      setFinished(true);
      recordQuiz(d.id, score);
    } else {
      setI(i + 1);
    }
  }

  return (
    <div className="panel">
      <h3>Check yourself</h3>
      <div className="quiz-meta"><span>Question {i + 1} of {d.quiz.length}</span><span>Score {score}</span></div>
      <p className="quiz-q">{item.q}</p>
      <div className="opts">
        {item.o.map((text, oi) => (
          <button key={oi} type="button" disabled={answered} onClick={() => choose(oi)}
            className={"opt" + (answered && oi === item.a ? " right" : answered && oi === picked ? " wrong" : "")}>{text}</button>
        ))}
      </div>
      <p className="why" hidden={!answered}><b>{picked === item.a ? "Correct. " : "Not quite. "}</b>{item.why}</p>
      <div className="quiz-actions">
        <button ref={nextRef} type="button" className="btn" hidden={!answered} onClick={next}>
          {i + 1 < d.quiz.length ? "Next question" : "See score"}
        </button>
      </div>
    </div>
  );
}
