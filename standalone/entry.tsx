import { createRoot } from "react-dom/client";
import CommandCenter from "@/components/CommandCenter";
import { MODELS_B64 } from "veil:models";
import { IMAGES_B64 } from "veil:images";

// Single-file offline build entry (scripts/build-standalone.mjs).
// Publishes embedded assets where the engine expects them, then boots
// the exact same Command Center menu + game used by the web version.
const g = globalThis as unknown as Record<string, unknown>;
g.__VEIL_MODELS__ = MODELS_B64;
g.__VEIL_IMAGES__ = IMAGES_B64;

const root = document.getElementById("root");
if (root) createRoot(root).render(<CommandCenter />);
