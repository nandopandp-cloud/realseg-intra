# ADR-0011 — SLA calculado em minutos úteis com calendário e política "congelada" no ticket

- **Status:** aceito — 2026-10-17

## Decisão
- `sla_calendars` define fuso horário IANA (padrão `America/Sao_Paulo`) e janelas por dia da semana; `sla_holidays` lista feriados por calendário.
- `sla_policies` define, por categoria e prioridade, minutos úteis de **primeira resposta** e de **resolução**, além dos status que pausam o relógio (padrão: `aguardando_colaborador`). Alterações criam nova versão (linha nova + `superseded_at`), preservando histórico.
- Ao abrir o ticket, a política vigente é associada (`sla_policy_id`) e os vencimentos são calculados (`first_response_due_at`, `resolution_due_at`). Pausas acumulam minutos úteis pausados e deslocam o vencimento de resolução ao retomar.
- Prazos exibidos ao colaborador vêm sempre desses campos — nunca são inventados. Sem política aplicável, a UI mostra "Sem prazo definido".
- Funções puras (`addBusinessMinutes`, `businessMinutesBetween`) cobertas por testes unitários (fins de semana, feriados, fusos e limites de janela).
