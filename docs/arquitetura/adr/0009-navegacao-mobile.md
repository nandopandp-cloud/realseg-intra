# ADR-0009 — Navegação mobile consolidada

- **Status:** aceito — 2026-10-17 · revisado em 2026-10-18
- **Contexto:** as referências mobile mostram barras inferiores diferentes entre si (ex.: "Início/Comunicação/Documentos/Cursos/Minha carreira", "Início/Documentos/Comunicação/Solicitações/Mais", "…/Ajuda"). Navegação inconsistente prejudica previsibilidade, principal requisito para colaboradores com pouca familiaridade digital.

## Decisão
Barra inferior fixa e única: **Início · Documentos · Solicitações · Mais**, como na referência da Home mobile (`referencias/Painel Corporativo REALSEG.png`), escolhida pelo produto como padrão. O item "Início" ativo usa a casa preenchida. "Mais" abre uma folha com Buscar, Comunicados, Cursos, Minha carreira, Ajuda e suporte, Fale com o RH, Notificações, Meu perfil e Sair. Em páginas acessadas via "Mais", o item "Mais" fica destacado.
No desktop, sidebar fixa conforme referências (recolhível para modo compacto com ícones).

## Consequências
Pequena divergência visual em relação a mockups isolados, em favor da consistência.

## Revisão 2026-10-18
A versão anterior tinha 5 itens (com "Comunicação"). Foi reduzida a 4 para seguir a referência da Home. Comunicados continua acessível pelo atalho da Home, pelo card "Comunicado importante" e pelo "Mais". A busca saiu do cabeçalho no celular (a referência não a mostra) e foi para o "Mais"; em tablets (≥ 640 px) o ícone de busca continua no cabeçalho.
