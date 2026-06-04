<?php

namespace App\Services;

use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * Parses a "caractéristiques" workbook (e.g. caracteristiques_KOCH_KRUPP.xlsx).
 *
 * Only the conveyor sheets are read (sheet title contains "Convoyeur"); the
 * machine sheets are ignored because they are not keyed by conveyor code.
 * Each conveyor sheet is a flat table whose header row starts with
 * "Transporteur":
 *
 *   Transporteur | Bande | Entre'axe (m) | Débit (t/h) | Vitesse (m/s) | ...
 *   T1           | 1000  | 1956.8        | 1200        | 3.5           | ...
 *   T3a-T3b      | 1000  | 7.8           | 600         | 1.5           | ...
 *
 * Returns a map of normalised conveyor code => [ label => value ] so the caller
 * can fill each *detected* conveyor's `characteristics` by code. Combined rows
 * ("T3a-T3b", "T10-T12") are expanded so every token maps to the same row.
 */
class ConveyorCharacteristicsImporter
{
    /**
     * @return array<string, array<string, string>>
     */
    public function parse(string $path): array
    {
        $spreadsheet = IOFactory::load($path);
        $map = [];

        foreach ($spreadsheet->getAllSheets() as $sheet) {
            if (stripos($sheet->getTitle(), 'convoyeur') === false) {
                continue; // skip machine sheets — not keyed by conveyor code
            }

            $highestRow = $sheet->getHighestDataRow();
            $highestCol = Coordinate::columnIndexFromString($sheet->getHighestDataColumn());

            // Locate the header row (column A trimmed == "Transporteur").
            $headerRow = null;
            for ($r = 1; $r <= $highestRow; $r++) {
                $a = mb_strtolower(trim((string) $sheet->getCell("A{$r}")->getValue()));
                if ($a === 'transporteur') {
                    $headerRow = $r;
                    break;
                }
            }
            if ($headerRow === null) {
                continue;
            }

            // Characteristic labels live in columns 2..N of the header row.
            $labels = [];
            for ($c = 2; $c <= $highestCol; $c++) {
                $col = Coordinate::stringFromColumnIndex($c);
                $label = $this->clean((string) $sheet->getCell("{$col}{$headerRow}")->getValue());
                if ($label !== '') {
                    $labels[$col] = $label;
                }
            }

            // Data rows: column A holds the conveyor code(s).
            for ($r = $headerRow + 1; $r <= $highestRow; $r++) {
                $codeCell = trim((string) $sheet->getCell("A{$r}")->getValue());
                if ($codeCell === '') {
                    continue;
                }

                $chars = [];
                foreach ($labels as $col => $label) {
                    $val = $sheet->getCell("{$col}{$r}")->getValue();
                    $val = $val === null ? '' : $this->clean((string) $val);
                    if ($val !== '') {
                        $chars[$label] = $val;
                    }
                }
                if ($chars === []) {
                    continue;
                }

                foreach ($this->codeKeys($codeCell) as $key) {
                    $map[$key] = $chars;
                }
            }
        }

        return $map;
    }

    /**
     * Normalised lookup keys for a "Transporteur" cell: the full code plus each
     * token of a combined code ("T3a-T3b" => ["T3A-T3B", "T3A", "T3B"]).
     *
     * @return string[]
     */
    private function codeKeys(string $cell): array
    {
        $keys = [];
        $full = $this->normalizeCode($cell);
        if ($full !== '') {
            $keys[] = $full;
        }
        foreach (preg_split('/[\/,+\-\s]+/', $cell) as $tok) {
            $n = $this->normalizeCode($tok);
            if ($n !== '' && ! in_array($n, $keys, true)) {
                $keys[] = $n;
            }
        }

        return $keys;
    }

    private function normalizeCode(string $s): string
    {
        return strtoupper(preg_replace('/\s+/', '', trim($s)));
    }

    private function clean(string $v): string
    {
        // Collapse internal newlines/tabs into a single space, then trim.
        $v = preg_replace('/\s*[\r\n\t]+\s*/', ' ', $v);

        return trim($v);
    }
}
