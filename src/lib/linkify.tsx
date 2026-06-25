import { Fragment, type ReactNode } from "react";

// Detecta URLs http(s) dentro de un texto y las convierte en enlaces clicables.
// El resto se devuelve como texto plano. Pensado para descripciones/comentarios.
const URL_RE = /(https?:\/\/[^\s<]+)/g;

// Puntuación que suele quedar "pegada" al final de una URL en una frase
// (p. ej. "mira https://ejemplo.com.") y que no forma parte del enlace.
const TRAILING_RE = /[.,;:!?)\]}'"]+$/;

export function linkify(text: string): ReactNode {
  if (!text) return text;

  const parts = text.split(URL_RE);
  return parts.map((part, i) => {
    // split con un grupo de captura: los índices impares son las URLs.
    if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;

    let url = part;
    let trailing = "";
    const m = part.match(TRAILING_RE);
    if (m) {
      trailing = m[0];
      url = part.slice(0, -trailing.length);
    }

    return (
      <Fragment key={i}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-primary underline underline-offset-2 hover:opacity-80"
        >
          {url}
        </a>
        {trailing}
      </Fragment>
    );
  });
}
