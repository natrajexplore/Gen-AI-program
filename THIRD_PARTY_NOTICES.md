# Third-party notices

NetVerse Academy is licensed under the MIT License (see `LICENSE`). It uses open-source packages that keep their own licenses. No dependency is under the GPL, LGPL or AGPL.

## Frontend (shipped in the built site)

The production build bundles about 120 npm packages. **Every `npm run build` writes the full license text of each bundled package to `frontend/dist/third-party-licenses.md`.** Deploy that file with the site: it satisfies the notice requirements of the MIT, ISC, BSD and Apache-2.0 licenses.

| License | Main packages |
| --- | --- |
| MIT | React, React DOM, Three.js, Mermaid, D3 modules, Cytoscape, KaTeX, khroma, lodash-es, dayjs |
| ISC | D3 modules and small utilities |
| Apache-2.0 | several Mermaid parser dependencies |
| BSD-3-Clause | a few small utilities |
| MPL-2.0 OR Apache-2.0 | DOMPurify, used under **Apache-2.0** |
| EPL-2.0 | elkjs (optional Mermaid layout engine), redistributed unmodified; source: https://github.com/kieler/elkjs |
| Unlicense | robust-predicates |

## Backend (installed by `uv sync`, not redistributed)

The backend's Python dependencies are installed from PyPI, not shipped with this repository. They are mostly MIT, BSD and Apache-2.0, including FastAPI, Starlette, Pydantic, Uvicorn, CrewAI (MIT), the OpenAI Python SDK (Apache-2.0) and python-dotenv (BSD-3-Clause). A few include MPL-2.0 code, used unmodified: certifi, tqdm and orjson (orjson is MPL-2.0 AND (Apache-2.0 OR MIT)). If you modify MPL-2.0 files, you must share those files' changes under MPL-2.0.

## Fonts

Chakra Petch and IBM Plex Sans/Mono are loaded from Google Fonts at runtime and are not redistributed in this repository. Both are under the SIL Open Font License 1.1.

## Regenerating the lists

```bash
# frontend: production dependency licenses
cd frontend && npm ls --omit=dev --all
# backend: installed packages and their license metadata
cd backend && uv pip list
```
