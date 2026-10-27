import type { Metadata } from "next";
import { LegalShell } from "@/components/landing/legal-shell";

export const metadata: Metadata = {
  title: "Política de Privacidade — GlobeJobbers",
  description:
    "Como o GlobeJobbers coleta, usa e protege seus dados: e-mail, perfil do LinkedIn e dados de uso.",
};

const CONTACT_EMAIL = "uxmedina@gmail.com";

export default function PrivacidadePage() {
  return (
    <LegalShell title="Política de Privacidade" updatedAt="24 de setembro de 2026">
      <section>
        <p>
          O GlobeJobbers ajuda profissionais a preparar o perfil para vagas
          internacionais remotas. Para isso, precisamos de alguns dados seus.
          Esta página explica, sem juridiquês desnecessário, o que coletamos,
          por quê, onde fica e quais são os seus direitos — em linha com a Lei
          Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018).
        </p>
      </section>

      <section>
        <h2>1. O que coletamos</h2>
        <ul>
          <li>
            <strong>Dados de conta:</strong> nome e e-mail, informados por você
            ou recebidos do Google quando você entra com sua conta Google. Não
            temos acesso à sua senha do Google.
          </li>
          <li>
            <strong>Conteúdo que você envia para análise:</strong> o PDF do seu
            perfil do LinkedIn (exportado por você), capturas de tela do seu
            perfil, textos de experiências, currículos e descrições de vagas
            que você colar nas ferramentas.
          </li>
          <li>
            <strong>E-mail nas ferramentas gratuitas:</strong> nas análises
            gratuitas de demonstração, pedimos seu e-mail para liberar o
            resultado completo.
          </li>
          <li>
            <strong>Dados de uso:</strong> eventos de navegação e uso das
            ferramentas (ex.: análise iniciada, resultado visualizado), usados
            de forma agregada para melhorar o produto.
          </li>
        </ul>
        <p>
          <strong>O que não fazemos:</strong> nunca pedimos sua senha do
          LinkedIn, não acessamos sua conta e não fazemos qualquer automação ou
          raspagem no LinkedIn. Todo conteúdo analisado é enviado por você.
        </p>
      </section>

      <section>
        <h2>2. Para que usamos</h2>
        <ul>
          <li>Gerar suas análises, scores e reescritas.</li>
          <li>Manter sua conta, seu histórico de análises e seu plano.</li>
          <li>
            Enviar comunicações sobre o produto ao e-mail que você deixou
            (você pode pedir para sair a qualquer momento).
          </li>
          <li>Entender o uso do produto e melhorá-lo.</li>
        </ul>
      </section>

      <section>
        <h2>3. Inteligência artificial</h2>
        <p>
          As análises são geradas com modelos de IA da Anthropic, processados
          via API. O conteúdo enviado (texto do seu perfil, experiências,
          vagas) é usado apenas para gerar a sua análise; pela política da API
          da Anthropic, esses dados não são usados para treinar modelos.
          Análises geradas por IA podem conter imprecisões — revise antes de
          aplicar no seu perfil.
        </p>
      </section>

      <section>
        <h2>4. Onde seus dados ficam</h2>
        <p>
          Usamos operadores que processam dados em nosso nome: Supabase (banco
          de dados e autenticação, servidores nos EUA), Vercel (hospedagem),
          Anthropic (processamento de IA), PostHog (métricas de uso), Google
          (login), Resend (envio de e-mails) e Meta (medição de anúncios no
          Instagram e no Facebook). Pagamentos, quando aplicável, são processados por
          plataformas de pagamento próprias (ex.: Hotmart) — não armazenamos
          dados de cartão.
        </p>
        <p>
          Não vendemos seus dados. Com a Meta compartilhamos só eventos de
          navegação e conversão (ex.: visitou a página, criou a conta), pra
          medir os nossos anúncios. Nunca compartilhamos o conteúdo do seu
          perfil, currículo ou análises.
        </p>
      </section>

      <section>
        <h2>5. Retenção e exclusão</h2>
        <p>
          Mantemos seus dados enquanto sua conta existir ou enquanto forem
          necessários para os fins acima. Você pode pedir a exclusão da sua
          conta e dos dados associados a qualquer momento pelo e-mail de
          contato abaixo.
        </p>
      </section>

      <section>
        <h2>6. Seus direitos (LGPD)</h2>
        <p>
          Você pode, a qualquer momento: confirmar que tratamos seus dados,
          acessá-los, corrigi-los, pedir anonimização ou exclusão, solicitar
          portabilidade e revogar consentimentos. Para exercer qualquer
          direito, escreva para{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>7. Cookies</h2>
        <p>
          Usamos cookies essenciais para manter sua sessão de login e
          ferramentas de métricas para entender o uso do produto. Também
          usamos o Pixel da Meta, que grava cookies para medir o resultado dos
          nossos anúncios no Instagram e no Facebook. Você pode limitar esse
          uso nas configurações de anúncios da sua conta Meta ou bloqueando
          cookies de terceiros no navegador.
        </p>
      </section>

      <section>
        <h2>8. Mudanças nesta política</h2>
        <p>
          Se esta política mudar de forma relevante, atualizaremos a data no
          topo desta página e, quando fizer sentido, avisaremos por e-mail.
        </p>
      </section>

      <section>
        <h2>9. Contato</h2>
        <p>
          Dúvidas sobre privacidade:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalShell>
  );
}
