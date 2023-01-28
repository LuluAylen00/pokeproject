# `@pkmn/eslint-config`

![License](https://img.shields.io/badge/License-MIT-blue.svg)
[![npm version](https://img.shields.io/npm/v/@pkmn/eslint-config.svg)](https://www.npmjs.com/package/@pkmn/eslint-config)&nbsp;

ESLint configuration used by [`@pkmn`][3] projects based off of [Pokémon Showdown's][0] and
[Google’s][2] style guidelines:

```json
{
  "extends": "@pkmn"
}
```

**NOTE:** [Due to how ESLint plugins work](https://github.com/eslint/eslint/issues/3458) you must
depend on **all** of the peer dependencies for this package (even if you don't use Typescript or
Jest etc).

Ideally this package would extend a `@pokemon-showdown/eslint-config` and just override
the places where it differs (eg. spaces vs. tabs, combining `.eslintrc-types.json` and
`.eslintrc-no-types.json` into one file). Until then, this package copies Pokémon Showdown's configs
and edits are made inline.

## Rationale

In general, defer to Pokémon Showdown and Google style guides where it makes sense. However, certain
places where `@pkmn` differs are worth calling out:

### `null` vs. `undefined`

Use `undefined` wherever possible. While `null` is more convenient to type and has better 'semantic'
meaning, in an effort to reduce the space of options defaulting to `undefined` makes more sense:

- `null` is easy to avoid in the language whereas `undefined` shows up far more often (eg. it is the
  default value for variables, it gets returned by library functions etc)
- `typeof null === 'object'` is perhaps useful as it makes sense for an 'empty object reference',
  but overall seems more likely to cause problems than `typeof undefined === 'undefined'`
- `foo?: bar` notation is TypeScript is more convenient than `foo: bar | null` (though `foo: bar |
  undefined` is relatively obtuse and means something slightly different than `foo?: bar`)

Note that while `undefined` is used as the default 'empty' type, all object fields should be
initialized in the constructor for performance reasons (the object changing 'shape' or its 'hidden'
class as it gains more fields can cause it to become megamorphic).

### Tabs vs. Spaces

The same argument about 'removing unnecessary elements' can be applied to justify favoring spaces
over tabs - using both is unnecessary, and using spaces for everything (indentation and spacing
within a line) is more practical than only using tabs for indenting. Once again, like with
`null` vs `undefined` where nuanced distinctions exist and its possible to make an argument for
preferring one over the other in specific scenarios, its simpler to just say 'only use spaces'.

### 100-character columns

Google's 80 character column restriction is deemed too draconian and Pokémon Showdown's 120
character limit (which allows *beaucoup* exceptions via its ignore regex) is seen as too lax and
makes it difficult to work on code on smaller displays and still make use of vertical splits.

### Quoting

Use `'` for everything. In the same way `@pkmn` tries to use a single bottom type and spacing
character, `'` is used for everything. `` ` `` can and should be used for template strings as
opposed to relying on string concatenation, but there's never a need for `"`.

### Enums

Like Pokémon Showdown, `@pkmn` does not use TypeScript's `enum` syntax and instead relies on string
literal types to represent a restricted range of values. However, unlikely like Pokémon Showdown,
`@pkmn` aims to follow a consistent naming style for the literal constants:

- Prefer `Title Case` in almost all cases, and **always** if it is used to represent a concept
  which would be be written in `Title Case` if it appeared in regular text.
- If the literals are all only single words and would never appear in `Title Case`, `lowercase`
  should be used instead.
- `camelCase` can be used if it is required to directly map to `keyof` some type (ie. to interop
  with method or field names which *do* follow `camelCase`).
- Never use `snake_case` or `kebab-case`.

Legacy string literal types that are required to interface with Pokémon Showdown are of course
exempt from these guidelines, but all new string literal types should keep these rules in mind.

### Promises

Mishandling of promises can lead to many subtle races and correctness errors. If your code is
generating `typescript-eslint/no-floating-promises` or `typescript-eslint/no-misused-promises`
errors and you don't understand why, please read up on promises or ask for help. Silencing these
via `// eslint-disable` is probably not the correct answer.

### Strictness

`strict-boolean-expressions` and `strict-string-expressions` should almost certainly be enabled for
improved correctness, but `@pkmn` projects favor terseness and the improved readability that comes
with the lax treatment of these cases. This may prove to be a poor tradeoff, but it at least
provides encouragement to write tests to mitigate the chances of getting bitten here!

## License

This package is distributed under the terms of the [MIT License](LICENSE).

  [0]: https://github.com/smogon/pokemon-showdown/blob/master/CONTRIBUTING.md#code-standards
  [1]: https://google.github.io/styleguide/jsguide.html
  [2]: https://pkmn.cc/@pkmn
  [3]: https://github.com/smogon/pokemon-showdown/blob/master/CONTRIBUTING.md#es5-and-es6
