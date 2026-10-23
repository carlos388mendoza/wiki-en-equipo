/**
 * Fuente para dibujar un emoji suelto (icono de página, celda del selector, patrón de fondo).
 *
 * La cara de secuencias de Apple (~3,7 MB) lleva el ZWJ y todos los emojis que forman parte de alguna secuencia
 * (👩‍💻 usa 💻, ❤️‍🔥 usa 🔥…), y no se puede partir sin romper las secuencias. Por eso un emoji de un solo
 * carácter, como 🔥, se dibuja con la familia "Apple Color Emoji Sueltos" (`--font-emoji-icono`): los mismos
 * glifos de Apple en trozos pequeños y sin ligaduras. Las secuencias con ZWJ usan la pila normal (`--font-emoji`),
 * que sí las compone en una sola pieza.
 */
export const emojiFontFamily = (emoji: string) => (emoji.includes("‍") ? "var(--font-emoji)" : "var(--font-emoji-icono)");
