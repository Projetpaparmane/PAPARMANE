export type CsvValue = string | number | null | undefined;

// Point-virgule : le séparateur qu'Excel attend en français.
export function toCsv(rows: CsvValue[][], separator = ";"): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const text = value == null ? "" : String(value);
          return /["\r\n]/.test(text) || text.includes(separator) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(separator),
    )
    .join("\r\n");
}
