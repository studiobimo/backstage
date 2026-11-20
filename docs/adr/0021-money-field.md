# ADR-0021: Prices are integers in minor units, in the currency of a registry setting

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

Consumers stored `z.int()` cents and each wrote its own `Intl.NumberFormat` call with a hardcoded
currency. A site can sell in more than one currency, and a client's sites differ (USD, HNL).

## Decision

- **`money()` is an integer in minor units**, marked so the admin renders a decimal editor. It
  carries no currency, so one block works on every site.
- **The currency is the registry setting `currency`**, declared with `currency()`. The supported
  codes live in `MONEY.currencies`, each with its minor-unit digits, and adding one is one line.
  The first two are `USD` and `HNL`.
- **`formatMoney(amount, currency, locale)` is pure** and formats with `Intl`, so client scripts
  use it. `useMoney()` binds it to the page locale and the published setting, and reads `USD`
  when the setting is absent.
- **No conversion.** An amount is shown in the site currency only. Converting between currencies
  needs a dated rate source and a decision on when to snapshot it, and no consumer asks for it yet.

## Consequences

- Changing the site currency reinterprets stored amounts instead of converting them.
- A currency whose minor unit is not two digits is supported by declaring its digits.
