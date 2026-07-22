const STATS = [
  { value: "0–100", em: "100", label: "Score Internacional" },
  { value: "5", label: "dimensões analisadas" },
  { value: "2 min", label: "até o resultado" },
  { value: "US$", label: "a moeda do próximo salário" },
];

export function StatsBar() {
  return (
    <div className="relative z-10 mx-5 -mt-8 flex max-w-[940px] flex-wrap justify-around gap-4 rounded-[28px] border-2 border-tinta bg-tinta px-6 py-6 text-papel sm:mx-auto sm:-mt-11 sm:rounded-full sm:px-9 sm:py-5">
      {STATS.map(({ value, em, label }) => (
        <div key={label} className="min-w-[120px] text-center">
          <b className="block font-display text-[clamp(24px,3vw,34px)] font-extrabold leading-[1.1]">
            {em ? (
              <>
                {value.replace(em, "")}
                <span className="not-italic text-amarelo">{em}</span>
              </>
            ) : (
              value
            )}
          </b>
          <span className="text-[13px] text-papel/75">{label}</span>
        </div>
      ))}
    </div>
  );
}
