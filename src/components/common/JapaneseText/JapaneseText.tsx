import type { FuriganaToken } from "@/types";

type JapaneseTextProps = {
  tokens: FuriganaToken[];
  className?: string;
};

export function JapaneseText({ tokens, className }: JapaneseTextProps) {
  return (
    <p className={className}>
      {tokens.map((token, index) =>
        token.reading ? (
          <ruby key={`${token.text}-${index}`}>
            {token.text}
            <rt>{token.reading}</rt>
          </ruby>
        ) : (
          <span key={`${token.text}-${index}`}>{token.text}</span>
        ),
      )}
    </p>
  );
}
