"use client";

import { BlockNoteSchema, defaultInlineContentSpecs } from "@blocknote/core";
import { createReactInlineContentSpec } from "@blocknote/react";

// Contenido en línea "mención" (@usuario).
export const Mention = createReactInlineContentSpec(
  {
    type: "mention",
    propSchema: {
      userId: { default: "" },
      name: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => (
      <span className="bg-primary/10 text-primary rounded px-1 font-medium">
        @{props.inlineContent.props.name}
      </span>
    ),
  },
);

// Esquema del editor: bloques/estilos por defecto + la mención.
export const qubiSchema = BlockNoteSchema.create({
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    mention: Mention,
  },
});
