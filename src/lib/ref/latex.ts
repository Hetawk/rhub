const latexSpecialChars: Record<string, string> = {
  "&": "\\&",
  "%": "\\%",
  $: "\\$",
  "#": "\\#",
  _: "\\_",
  "{": "\\{",
  "}": "\\}",
  "~": "\\textasciitilde{}",
  "^": "\\textasciicircum{}",
  "\\": "\\textbackslash{}",
  "<": "\\textless{}",
  ">": "\\textgreater{}",
};

export function escapeLatex(value?: string | null): string {
  if (!value) return "";
  return Object.keys(latexSpecialChars).reduce((acc, char) => {
    const replacement = latexSpecialChars[char];
    return acc.replaceAll(char, replacement);
  }, value);
}
