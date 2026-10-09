import type { Metadata } from "next";
import { LegalShell } from "@/components/landing/legal-shell";

export const metadata: Metadata = {
  title: "Termos de Uso — GlobeJobbers",
  description:
    "Condições de uso do GlobeJobbers: o que o serviço oferece, o que esperamos de você e os limites de responsabilidade.",
};

const CONTACT_EMAIL = "uxmedina@gmail.com";

export default function TermosPage() {
  return (
    <LegalShell title="Termos de Uso" updatedAt="24 de setembro de 2026">
      <section>
        <p>
          Estes termos regem o uso do GlobeJobbers (
          <a href="https://www.globejobbers.com">www.globejobbers.com</a>). Ao
          criar uma conta ou usar as ferramentas, você concorda com eles.
        </p>
      </section>

      <section>
        <h2>1. O que é o serviço</h2>
        <p>
          O GlobeJobbers oferece ferramentas com inteligência artificial para
          preparar profissionais para vagas internacionais remotas: análise de
          perfil do LinkedIn, reescrita de textos, inteligência de mercado,
          adaptação de currículo e preparação para entrevistas, entre outras.
        </p>
        <p>
          O produto está em <strong>fase beta</strong>: funcionalidades podem
          mudar, ser adicionadas ou removidas sem aviso prévio.
        </p>
      </section>

      <section>
        <h2>2. O que o GlobeJobbers não é</h2>
        <ul>
          <li>
            <strong>Não é garantia de emprego.</strong> As ferramentas melhoram
            sua preparação, mas contratação depende de fatores fora do nosso
            controle.
          </li>
          <li>
            <strong>Não é aconselhamento profissional regulado.</strong> Nada
            aqui constitui consultoria jurídica, de imigração, tributária ou
            financeira.
          </li>
          <li>
            <strong>As análises são geradas por IA</strong> e podem conter
            imprecisões. Revise todo conteúdo antes de usá-lo no seu perfil,
            currículo ou candidaturas. A decisão de aplicar as sugestões é sua.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Relação com o LinkedIn</h2>
        <p>
          O GlobeJobbers é um produto independente, sem qualquer afiliação,
          endosso ou patrocínio do LinkedIn. LinkedIn é marca registrada da
          LinkedIn Corporation. Nós nunca pedimos sua senha, não acessamos sua
          conta e não automatizamos ações no LinkedIn — você exporta seu
          próprio perfil e o envia para análise.
        </p>
      </section>

      <section>
        <h2>4. Sua conta</h2>
        <p>
          Você é responsável por manter o acesso à sua conta e por garantir que
          as informações enviadas são suas ou que você tem o direito de
          usá-las. Uma conta é pessoal e intransferível.
        </p>
      </section>

      <section>
        <h2>5. Uso aceitável</h2>
        <p>É proibido usar o serviço para:</p>
        <ul>
          <li>enviar conteúdo de terceiros sem autorização;</li>
          <li>
            tentar burlar limites de uso, engenharia reversa dos sistemas ou
            acesso não autorizado;
          </li>
          <li>revender ou redistribuir o serviço sem nosso consentimento;</li>
          <li>qualquer finalidade ilegal.</li>
        </ul>
        <p>
          Podemos suspender contas que violem estes termos, mediante aviso
          quando possível.
        </p>
      </section>

      <section>
        <h2>6. Planos e pagamentos</h2>
        <p>
          Parte das ferramentas é gratuita; recursos completos podem exigir
          plano pago. Pagamentos são processados por plataformas terceiras
          (ex.: Hotmart), com suas próprias condições de compra, reembolso e
          cancelamento, além do direito de arrependimento previsto no Código
          de Defesa do Consumidor. Valores e limites de cada plano são os
          exibidos no site no momento da contratação.
        </p>
      </section>

      <section>
        <h2>7. Conteúdo e propriedade intelectual</h2>
        <p>
          O conteúdo que você envia continua sendo seu. As análises e textos
          gerados para você podem ser usados livremente por você no seu perfil,
          currículo e candidaturas. A marca, o site, o código e o design do
          GlobeJobbers são de nossa propriedade e não podem ser copiados ou
          reutilizados sem autorização.
        </p>
      </section>

      <section>
        <h2>8. Limitação de responsabilidade</h2>
        <p>
          O serviço é fornecido “como está”. Na máxima extensão permitida pela
          lei, não nos responsabilizamos por decisões de carreira tomadas com
          base nas análises, por indisponibilidades temporárias do serviço ou
          por danos indiretos decorrentes do uso. Nada nestes termos afasta
          direitos que a lei brasileira garante a você como consumidor.
        </p>
      </section>

      <section>
        <h2>9. Privacidade</h2>
        <p>
          O tratamento dos seus dados é descrito na nossa{" "}
          <a href="/privacidade">Política de Privacidade</a>, que faz parte
          destes termos.
        </p>
      </section>

      <section>
        <h2>10. Alterações e lei aplicável</h2>
        <p>
          Podemos atualizar estes termos; mudanças relevantes serão indicadas
          pela data no topo da página. Estes termos são regidos pelas leis do
          Brasil.
        </p>
      </section>

      <section>
        <h2>11. Contato</h2>
        <p>
          Dúvidas sobre estes termos:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalShell>
  );
}
