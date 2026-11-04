import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

export const metadata: Metadata = {
  title: 'Privacidade',
  description: 'Como o Centro Infantil Sonho de Criança trata os dados das crianças e das famílias.'
};

// To be reviewed by the centre before go-live: contacts, retention period and any legal wording
const UPDATED = '4 de Novembro de 2026';
const CONTACT = 'a administração do centro (na secretaria, ou por Mensagens no portal)';

/** Privacy notice: what the portal keeps about children and families, why, and who sees it. */
export default function Page() {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-2xl content-start gap-6 px-4 py-8">
      <div className="flex items-center gap-4">
        <Logo priority className="w-20" />
        <div>
          <h1 className="font-heading text-2xl font-extrabold">Privacidade</h1>
          <p className="text-sm text-muted-foreground">Centro Infantil Sonho de Criança · actualizado a {UPDATED}</p>
        </div>
      </div>

      <article className="grid gap-5 rounded-2xl border bg-card p-6 text-sm leading-relaxed sm:p-8 [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-bold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        <p>
          O portal do Centro Infantil Sonho de Criança guarda os dados necessários para cuidar das crianças e comunicar com as famílias. Esta página explica que dados são, para que servem,
          quem os vê e como pode pedir para os ver, corrigir ou apagar.
        </p>

        <section className="grid gap-2">
          <h2>Que dados guardamos</h2>
          <ul>
            <li>
              <strong>Da criança:</strong> nome, data de nascimento, sexo, turma, alergias, medicação, restrições alimentares e outras notas de saúde que a família indicar.
            </li>
            <li>
              <strong>Do dia-a-dia:</strong> entradas e saídas, quem veio buscar, ausências, relatórios diários (refeições, sesta, humor, actividades) e relatórios mensais.
            </li>
            <li>
              <strong>Fotografias</strong> da criança nas actividades, só com a autorização da família, e das pessoas autorizadas a buscá-la.
            </li>
            <li>
              <strong>Dos encarregados de educação e pessoas autorizadas:</strong> nome, relação com a criança, telemóvel, email e, se indicados, profissão e local de trabalho.
            </li>
            <li>
              <strong>Propinas:</strong> facturas, pagamentos e avisos de pagamento.
            </li>
            <li>
              <strong>Mensagens</strong> trocadas no portal, e o registo dos avisos enviados por WhatsApp e email (guardado 6 meses).
            </li>
          </ul>
        </section>

        <section className="grid gap-2">
          <h2>Para que servem</h2>
          <p>
            Para a segurança e o bem-estar da criança (saber quem está no centro, alergias e medicação à vista, entregar a criança só a quem pode buscá-la), para informar a família sobre o dia
            da criança, e para a gestão das propinas. Não são usados para publicidade nem vendidos a ninguém.
          </p>
        </section>

        <section className="grid gap-2">
          <h2>Quem os vê</h2>
          <ul>
            <li>Cada família vê só os dados dos seus filhos.</li>
            <li>Cada educador vê as crianças das suas turmas.</li>
            <li>A administração do centro vê tudo o que é preciso para a gestão.</li>
            <li>As fotografias nunca são públicas: só se abrem com uma sessão iniciada no portal, por links que expiram.</li>
          </ul>
        </section>

        <section className="grid gap-2">
          <h2>WhatsApp e email</h2>
          <p>
            Os avisos (entradas e saídas, relatórios, facturas, mensagens) vão por WhatsApp <strong>só a quem aceitou</strong>, e por email. Cada pessoa escolhe no seu Perfil que avisos quer
            receber e por onde, e pode deixar de receber WhatsApp a qualquer momento. As mensagens de WhatsApp passam pelos serviços da Meta (WhatsApp Business) e levam só o essencial (nome, e
            por exemplo a hora de entrada); os detalhes ficam no portal.
          </p>
        </section>

        <section className="grid gap-2">
          <h2>Onde ficam guardados</h2>
          <p>
            Em serviços de alojamento profissionais, com ligações cifradas e cópias de segurança: a base de dados (MongoDB Atlas) e o servidor do portal ficam na região da África do Sul,
            sempre que o serviço o permite, e as fotografias num serviço próprio para imagens (Cloudinary). As palavras-passe são guardadas de forma que ninguém, nem o centro, as consegue ler.
          </p>
        </section>

        <section className="grid gap-2">
          <h2>Durante quanto tempo</h2>
          <p>
            Enquanto a criança frequentar o centro. Depois da saída, os dados são apagados ou guardados apenas pelo tempo que a lei exigir para os documentos de pagamento.
          </p>
        </section>

        <section className="grid gap-2">
          <h2>Os seus direitos</h2>
          <p>
            Pode pedir para ver os dados da sua família, corrigi-los, retirar a autorização de fotografias ou de WhatsApp, ou pedir que sejam apagados quando a criança deixar o centro. Fale com{' '}
            {CONTACT}.
          </p>
        </section>

        <section className="grid gap-2">
          <h2>Tablets e telemóveis partilhados</h2>
          <p>
            Nos tablets do centro, cada educador entra com a sua conta. Ao sair (Menu da conta → Sair), os dados guardados no aparelho para uso sem internet são apagados.
          </p>
        </section>
      </article>

      <p className="text-center text-sm">
        <Link href="/login" className="font-medium text-teal-text underline underline-offset-4">
          Entrar no portal
        </Link>
        {' · '}
        <Link href="/matricula" className="font-medium text-teal-text underline underline-offset-4">
          Pedir matrícula
        </Link>
      </p>
    </main>
  );
}
