interface KeywordHighlightsProps {
  items: string[];
}

export function KeywordHighlights({ items }: KeywordHighlightsProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13.5px] text-[#6E6E72]">
        Adicionamos {items.length} keywords que recrutadores internacionais buscam na sua área:
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full bg-[#EAF1EF] px-2.5 py-1 text-xs font-semibold text-[#0F4D4A]"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
