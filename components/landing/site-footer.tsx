export function SiteFooter() {
  return (
    <footer className="mx-auto flex max-w-[1120px] flex-col items-center gap-2 px-6 py-10 text-center sm:px-10">
      <p className="text-[13px] text-[#A0A09B]">
        Seus arquivos são usados apenas para gerar sua análise e não são
        compartilhados.
      </p>
      <p className="text-[12.5px] text-[#C4C4BE]">
        © {new Date().getFullYear()} GlobeJobbers
      </p>
    </footer>
  );
}
