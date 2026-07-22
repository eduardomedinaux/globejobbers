export function SiteFooter() {
  return (
    <>
      {/* Fecho — slogan do design system v2 */}
      <section className="border-t-2 border-tinta bg-laranja px-6 py-20 text-center text-papel sm:py-24">
        <h2 className="mx-auto max-w-[16ch] text-balance font-display text-[clamp(32px,5vw,60px)] font-extrabold leading-[1.02] tracking-[-0.02em]">
          Carreira global, <em className="font-semibold italic text-tinta">endereço opcional.</em>
        </h2>
      </section>

      <footer className="border-t-2 border-tinta">
        <div className="mx-auto flex max-w-[1160px] flex-col items-center gap-3 px-6 py-10 text-center font-spacemono text-[13px] text-tinta/70 sm:flex-row sm:justify-between sm:px-8 sm:text-left">
          <p className="max-w-[52ch]">
            Seus arquivos são usados apenas para gerar sua análise e não são
            compartilhados.
          </p>
          <p>© {new Date().getFullYear()} GlobeJobbers</p>
        </div>
      </footer>
    </>
  );
}
