# Korean Translator Menu Bar App

A lightweight macOS menu bar application built with Electron, TypeScript, Bun, and the Gemini API.
It monitors your clipboard and provides instant Korean translations with detailed breakdowns.

Based on the specification provided in `data/spec.md` and the Gemini API example in `data/example_call.ts`.

## Features

-   **Menu Bar Icon**: Access translations easily from the menu bar.
-   **Clipboard Monitoring**: Automatically translates text copied to the clipboard when the app window is opened.
-   **Gemini Translation**: Uses the Gemini API (specifically `gemini-1.5-flash` by default) for translation and analysis.
-   **Structured Output**: Displays translation, pronunciation, formality, word breakdown, tips, and alternatives in a structured format.
-   **Translation History**: Stores recent translations locally using `electron-store`.
-   **History View**: Browse past translations grouped by date.
-   **Caching**: Simple caching mechanism to avoid re-translating identical text.

## Setup

1.  **Clone the repository (if applicable)**

2.  **Install Dependencies**:
    Make sure you have `bun` installed (`npm install -g bun`). Then run:
    ```bash
    bun install
    ```

3.  **Set up Environment Variables**:
    Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
    Edit the `.env` file and add your Gemini API Key:
    ```
    GEMINI_API_KEY="YOUR_ACTUAL_API_KEY"
    ```
    You can get a key from [Google AI Studio](https://aistudio.google.com/app/apikey).

4.  **Create an Icon** (Optional but recommended for packaging):
    -   Create an icon file (e.g., `icon.png`, at least 512x512).
    -   Place it in the `assets/` directory.
    -   For macOS, you'll ideally want an `icon.icns` file. You can use online converters or tools like `iconutil` on macOS to create it from the PNG.
    -   For Windows, you'll need an `icon.ico` file.
    -   Ensure the filenames in `package.json` under the `build` section match your icon files.
    -   A `iconTemplate.png` (for the macOS menu bar, typically black/white) should also be placed in `assets/`. This is referenced in `src/main/main.ts`.

## Development

-   **Run in Development Mode**:
    This command builds the app and starts Electron.
    ```bash
    bun run start
    ```
    *Note: The spec included a `dev` script with watch mode, but it requires `concurrently` (add with `bun add -d concurrently` if desired) and might need tweaking for `bun build --watch`.* The `start` script provides a simpler build-and-run flow.*

## Building the Application

-   **Package for Current Platform (Development)**:
    Creates an unpackaged app in the `release/` directory.
    ```bash
    bun run pack
    ```

-   **Create Distributable Package**:
    Creates installers/packages (e.g., `.dmg`, `.exe`, `.AppImage`) in the `release/` directory based on your OS.
    ```bash
    bun run dist
    ```

## Project Structure

```
korean-translator/
├── package.json
├── bun.lockb
├── tsconfig.json
├── .env
├── .env.example
├── .gitignore
├── README.md
├── src/
│   ├── main/             # Electron Main Process
│   │   ├── main.ts
│   │   ├── translator.ts
│   │   ├── history-manager.ts
│   │   └── preload.ts
│   ├── renderer/         # Electron Renderer Process (UI)
│   │   ├── index.html
│   │   ├── styles/
│   │   │   ├── main.css
│   │   │   └── markdown.css
│   │   └── scripts/
│   │       └── renderer.ts
│   └── shared/           # Shared types/utils (currently unused)
│       └── types.ts      (placeholder)
│       └── utils.ts      (placeholder)
├── assets/               # Icons, images (e.g., iconTemplate.png)
├── dist/                 # Compiled JS output from bun build
└── release/              # Packaged application output
```
