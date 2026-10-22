# Referências visuais

As imagens em [`referencias/`](../../referencias) são os mockups que orientam a interface do **ambiente do colaborador**. Imagens de 1536×1024 são desktop; as de ~887×1774 são celular. O ambiente de gestão (`/rh`) não tem referência própria e segue o [design system](design-system.md).

> Os nomes dos arquivos são citados em comentários do código, no changelog e na migração `0005`. Não renomeie as imagens sem atualizar essas citações.

| Tela | Desktop | Celular | Rota |
| --- | --- | --- | --- |
| Home | [Dashboard Corporativo RealSeg Segurança e Conexão](<../../referencias/Dashboard Corporativo RealSeg Segurança e Conexão.png>) | [Painel Corporativo REALSEG](<../../referencias/Painel Corporativo REALSEG.png>) | `/` |
| Comunicados (lista) | [Portal de Comunicados REALSEG](<../../referencias/Portal de Comunicados REALSEG.png>) | [Central de Comunicados REALSEG](<../../referencias/Central de Comunicados REALSEG.png>) · [Interface de Comunicação Corporativa](<../../referencias/Interface de Comunicação Corporativa.png>) ¹ | `/comunicados` |
| Comunicado (leitura) | [Colado 2026-10-18 às 12.08.10](<../../referencias/Colado 2026-10-18 às 12.08.10.png>) | — | `/comunicados/[id]` |
| Documentos | [Painel de Documentos REALSEG](<../../referencias/Painel de Documentos REALSEG.png>) | [Documentos REALSEG_ Gestão Segura](<../../referencias/Documentos REALSEG_ Gestão Segura.png>) | `/documentos` |
| Solicitações | [Painel REALSEG de Solicitações](<../../referencias/Painel REALSEG de Solicitações.png>) ² | [Tela de Solicitações em Aplicativo Corporativo](<../../referencias/Tela de Solicitações em Aplicativo Corporativo.png>) | `/solicitacoes` |
| Cursos | [Painel de Cursos REALSEG](<../../referencias/Painel de Cursos REALSEG.png>) | [Interface de Cursos Corporativos REALSEG](<../../referencias/Interface de Cursos Corporativos REALSEG.png>) | `/cursos` |
| Minha carreira | [Dashboard de Carreira REALSEG](<../../referencias/Dashboard de Carreira REALSEG.png>) | [Painel de carreira REALSEG](<../../referencias/Painel de carreira REALSEG.png>) | `/carreira` |
| Ajuda e suporte | [Central de Ajuda REALSEG](<../../referencias/Central de Ajuda REALSEG.png>) | [Portal de Ajuda e Suporte REALSEG](<../../referencias/Portal de Ajuda e Suporte REALSEG.png>) | `/ajuda` |

¹ As duas imagens de comunicados no celular mostram barras inferiores diferentes. A navegação mobile foi unificada no [ADR-0009](../arquitetura/adr/0009-navegacao-mobile.md) (Início · Documentos · Solicitações · Mais).
² `Painel REALSEG de Solicitações (1).png` é uma cópia idêntica deste arquivo.

## Divergências intencionais

- **Logo**: as referências mostram a tagline "SECURITY INTELLIGENCE", que não faz parte da marca. A interface usa os arquivos oficiais de `public/logo/` ([ADR-0010](../arquitetura/adr/0010-assets-e-dados-demo.md)).
- **Navegação mobile**: barra única de 4 itens + "Mais" ([ADR-0009](../arquitetura/adr/0009-navegacao-mobile.md)).
- **Fale com o RH**: aparece nas referências, mas está oculto por decisão de produto (`src/lib/features.ts` → `talkToHr`). Pedidos ao RH seguem por Solicitações.
- **Imagens decorativas**: recortadas das referências e convertidas em WebP (`public/images/*-ref.webp` e demais arquivos da pasta). São provisórias até a chegada de fotos licenciadas.
