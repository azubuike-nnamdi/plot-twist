---
name: commit
description: Commit changes in this repo with a gitmoji plus a conventional commit header, e.g. "✨ feat(landing): add the walkthrough". Use whenever you create a git commit here.
---

# Commit with gitmoji

Every commit header is a gitmoji (https://gitmoji.dev), a space, then a
conventional commit header. commitlint (`commitlint.config.ts`) enforces the
conventional part and accepts the leading emoji.

```
<emoji> <type>(<optional scope>): <subject>

<optional body, wrapped at 100 characters>
```

Examples:

```
✨ feat(landing): add the how to play walkthrough
🐛 fix(room): stop the clock after the deadline
🔊 feat(audio): add match music and sound effects
♻️ refactor(rooms): load only the current round
📝 docs: explain the nightly question refresh
```

## Rules

- Use the emoji character itself (✨), not the `:sparkles:` shortcode, so it
  shows everywhere.
- Pick the one gitmoji that best fits the change, from the table below. Prefer
  a specific one (🔊 sound, 💄 UI, 🚸 UX, 🗃️ database, 🔒️ security) over a
  generic one.
- Keep the emoji and the type consistent: ✨ with `feat`, 🐛 with `fix`, 📝
  with `docs`, ✅ with `test`, ♻️ with `refactor`, ⚡️ with `perf`, 💄 or 🎨 with
  `style`, 🔧/➕/⬆️ with `chore` or `build`, 👷 with `ci`, 🔒️ with `security`.
- Allowed types are listed in `commitlint.config.ts` (`type-enum`).
- Subject: lower case, imperative ("add", not "added"), no full stop, header at
  most 100 characters.
- Split unrelated work into separate commits, one feature or fix each, and
  stage files explicitly rather than with `git add -A`.
- Never commit on `main`; create a branch first.
- The `pre-commit` hook runs `pnpm lint` and `commit-msg` runs commitlint. If a
  hook fails, fix the cause and make a new commit. Do not use `--no-verify`.
- End the message with any attribution lines the session asks for.

## Common picks for this project

| Change | Header start |
| --- | --- |
| New feature or screen | `✨ feat` |
| UI or styling | `💄 style` or `💄 feat` |
| UX or usability | `🚸 feat` |
| Animations or transitions | `💫 feat` |
| Sound or music | `🔊 feat` |
| Bug fix | `🐛 fix` |
| Critical hotfix | `🚑️ fix` |
| Database schema or migration | `🗃️ feat` |
| Performance | `⚡️ perf` |
| Refactor | `♻️ refactor` |
| Remove code or files | `🔥 refactor` or `🔥 chore` |
| Tests | `✅ test` |
| Docs | `📝 docs` |
| Config files | `🔧 chore` |
| Add a dependency | `➕ build` |
| Security | `🔒️ security` |

## Full gitmoji list

| Emoji | Code | Use for |
| --- | --- | --- |
| 🎨 | `:art:` | Improve structure / format of the code. |
| ⚡️ | `:zap:` | Improve performance. |
| 🔥 | `:fire:` | Remove code or files. |
| 🐛 | `:bug:` | Fix a bug. |
| 🚑️ | `:ambulance:` | Critical hotfix. |
| ✨ | `:sparkles:` | Introduce new features. |
| 📝 | `:memo:` | Add or update documentation. |
| 🚀 | `:rocket:` | Deploy stuff. |
| 💄 | `:lipstick:` | Add or update the UI and style files. |
| 🎉 | `:tada:` | Begin a project. |
| ✅ | `:white_check_mark:` | Add, update, or pass tests. |
| 🔒️ | `:lock:` | Fix security or privacy issues. |
| 🔐 | `:closed_lock_with_key:` | Add or update secrets. |
| 🔖 | `:bookmark:` | Release / Version tags. |
| 🚨 | `:rotating_light:` | Fix compiler / linter warnings. |
| 🚧 | `:construction:` | Work in progress. |
| 💚 | `:green_heart:` | Fix CI Build. |
| ⬇️ | `:arrow_down:` | Downgrade dependencies. |
| ⬆️ | `:arrow_up:` | Upgrade dependencies. |
| 📌 | `:pushpin:` | Pin dependencies to specific versions. |
| 👷 | `:construction_worker:` | Add or update CI build system. |
| 📈 | `:chart_with_upwards_trend:` | Add or update analytics or track code. |
| ♻️ | `:recycle:` | Refactor code. |
| ➕ | `:heavy_plus_sign:` | Add a dependency. |
| ➖ | `:heavy_minus_sign:` | Remove a dependency. |
| 🔧 | `:wrench:` | Add or update configuration files. |
| 🔨 | `:hammer:` | Add or update development scripts. |
| 🌐 | `:globe_with_meridians:` | Internationalization and localization. |
| ✏️ | `:pencil2:` | Fix typos. |
| 💩 | `:poop:` | Write bad code that needs to be improved. |
| ⏪️ | `:rewind:` | Revert changes. |
| 🔀 | `:twisted_rightwards_arrows:` | Merge branches. |
| 📦️ | `:package:` | Add or update compiled files or packages. |
| 👽️ | `:alien:` | Update code due to external API changes. |
| 🚚 | `:truck:` | Move or rename resources (e.g.: files, paths, routes). |
| 📄 | `:page_facing_up:` | Add or update license. |
| 💥 | `:boom:` | Introduce breaking changes. |
| 🍱 | `:bento:` | Add or update assets. |
| ♿️ | `:wheelchair:` | Improve accessibility. |
| 💡 | `:bulb:` | Add or update comments in source code. |
| 🍻 | `:beers:` | Write code drunkenly. |
| 💬 | `:speech_balloon:` | Add or update text and literals. |
| 🗃️ | `:card_file_box:` | Perform database related changes. |
| 🔊 | `:loud_sound:` | Add or update logs. |
| 🔇 | `:mute:` | Remove logs. |
| 👥 | `:busts_in_silhouette:` | Add or update contributor(s). |
| 🚸 | `:children_crossing:` | Improve user experience / usability. |
| 🏗️ | `:building_construction:` | Make architectural changes. |
| 📱 | `:iphone:` | Work on responsive design. |
| 🤡 | `:clown_face:` | Mock things. |
| 🥚 | `:egg:` | Add or update an easter egg. |
| 🙈 | `:see_no_evil:` | Add or update a .gitignore file. |
| 📸 | `:camera_flash:` | Add or update snapshots. |
| ⚗️ | `:alembic:` | Perform experiments. |
| 🔍️ | `:mag:` | Improve SEO. |
| 🏷️ | `:label:` | Add or update types. |
| 🌱 | `:seedling:` | Add or update seed files. |
| 🚩 | `:triangular_flag_on_post:` | Add, update, or remove feature flags. |
| 🥅 | `:goal_net:` | Catch errors. |
| 💫 | `:dizzy:` | Add or update animations and transitions. |
| 🗑️ | `:wastebasket:` | Deprecate code that needs to be cleaned up. |
| 🛂 | `:passport_control:` | Work on code related to authorization, roles and permissions. |
| 🩹 | `:adhesive_bandage:` | Simple fix for a non-critical issue. |
| 🧐 | `:monocle_face:` | Data exploration/inspection. |
| ⚰️ | `:coffin:` | Remove dead code. |
| 🧪 | `:test_tube:` | Add a failing test. |
| 👔 | `:necktie:` | Add or update business logic. |
| 🩺 | `:stethoscope:` | Add or update healthcheck. |
| 🧱 | `:bricks:` | Infrastructure related changes. |
| 🧑‍💻 | `:technologist:` | Improve developer experience. |
| 💸 | `:money_with_wings:` | Add sponsorships or money related infrastructure. |
| 🧵 | `:thread:` | Add or update code related to multithreading or concurrency. |
| 🦺 | `:safety_vest:` | Add or update code related to validation. |
| ✈️ | `:airplane:` | Improve offline support. |
| 🦖 | `:t-rex:` | Code that adds backwards compatibility. |
